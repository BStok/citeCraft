import pandas as pd
from dotenv import load_dotenv
load_dotenv()


import os
import uuid
import shutil
import uvicorn
from pathlib import Path
from contextlib import asynccontextmanager
from fastapi import Request
from fastapi import FastAPI, Depends, HTTPException, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, FileResponse
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
from typing import Optional
from sqlalchemy.orm import Session

from backend.acquisition.paper_acquisition import get_papers
from backend.ranking.paperRanking import rankPaper
from backend.comparison.comp import compare_papers
from backend.rag.pipeline import index_papers as rag_index_papers, compare_papers_rag, understand_paper
from backend.db.db import get_db, init_db
from backend.db.models import Paper, Comparison, ComparisonPaper, Collection, CollectionPaper, User
from backend.auth.auth import hash_password, verify_password, generate_token, verify_token
from backend.auth.firebase_auth import verify_firebase_token

UPLOAD_DIR = Path("uploads")
UPLOAD_DIR.mkdir(exist_ok=True)


@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    yield

app = FastAPI(lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")


# ─── Auth dependency ──────────────────────────────────────────────────────────

def get_current_user(token: str = Depends(oauth2_scheme)) -> dict:
    payload = verify_token(token)
    if not payload:
        raise HTTPException(status_code=401, detail="Token expired or invalid")
    return payload


# ─── Pydantic models ──────────────────────────────────────────────────────────

class RegisterRequest(BaseModel):
    username: str
    password: str

class SearchRequest(BaseModel):
    query: str

class CompareRequest(BaseModel):
    file_paths: list[str]
    comparison_name: Optional[str] = "Untitled Comparison"

class IndexRequest(BaseModel):
    paper_ids: list[str]
    file_paths: list[str]

class RAGCompareRequest(BaseModel):
    paper_ids: list[str]
    dimensions: Optional[list[str]] = None
    custom_question: Optional[str] = None
    comparison_name: Optional[str] = "Untitled Comparison"

class UnderstandRequest(BaseModel):
    question: str
    section_filter: Optional[str] = None

class CollectionCreateRequest(BaseModel):
    name: str
    description: Optional[str] = None

# ── NEW: replaces bare `dict` in PATCH and POST /papers ──────────────────────
class CollectionUpdateRequest(BaseModel):
    name: str

class AddPaperRequest(BaseModel):
    paper_id: str


# ─── Auth ─────────────────────────────────────────────────────────────────────

@app.post("/auth/register")
def register(body: RegisterRequest, db: Session = Depends(get_db)):
    existing = db.query(User).filter(User.username == body.username).first()
    if existing:
        raise HTTPException(status_code=400, detail="Username already taken")
    user = User(username=body.username, password_hash=hash_password(body.password))
    db.add(user)
    db.commit()
    db.refresh(user)
    token = generate_token(str(user.id))
    return {"access_token": token, "token_type": "bearer", "user_id": str(user.id), "username": user.username}

@app.post("/auth/login")
def login(form: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    user = db.query(User).filter(User.username == form.username).first()
    if not user or not verify_password(form.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    token = generate_token(str(user.id))
    return {"access_token": token, "token_type": "bearer", "user_id": str(user.id), "username": user.username}

@app.post("/auth/firebase")
def firebase_login(request: Request, db: Session = Depends(get_db)):
    auth_header = request.headers.get("Authorization")
    print(f"🔥 Auth header: {auth_header}")  # Debug log
    
    if not auth_header:
        raise HTTPException(status_code=400, detail="Missing Authorization header")
    
    try:
        token = auth_header.split(" ")[1]
    except IndexError:
        raise HTTPException(status_code=400, detail="Malformed Authorization header")

    decoded = verify_firebase_token(token)
    if not decoded:
        raise HTTPException(status_code=401, detail="Invalid Firebase token")

    firebase_uid = decoded["uid"]
    email = decoded.get("email")

    # check if user exists
    user = db.query(User).filter(User.firebase_uid == firebase_uid).first()

    if not user:
        user = User(firebase_uid=firebase_uid, username=email)
        db.add(user)
        db.commit()
        db.refresh(user)

    jwt_token = generate_token(str(user.id))

    return {
        "token": jwt_token,
        "user_id": str(user.id),
        "username": user.username
    }
# ─── File upload ──────────────────────────────────────────────────────────────

@app.post("/upload_pdf")
async def upload_pdf(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    if not file.filename.endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF files are allowed")

    unique_name = f"{uuid.uuid4()}_{file.filename}"
    save_path = UPLOAD_DIR / unique_name

    with save_path.open("wb") as f:
        shutil.copyfileobj(file.file, f)

    user_id = uuid.UUID(current_user["user_id"])
    paper = Paper(
        user_id  = user_id,
        title    = file.filename.replace(".pdf", ""),
        source   = "uploaded",
        pdf_link = str(save_path),
    )
    db.add(paper)
    db.commit()
    db.refresh(paper)

    return {
        "file_path": str(save_path),
        "filename":  file.filename,
        "paper_id":  str(paper.id),
    }
# ─── Search ───────────────────────────────────────────────────────────────────

@app.post("/search_papers")
def search_papers(
    body: SearchRequest,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """
    Search for papers and rank them by relevance.
    
    Fixed issues:
    1. Always ranks papers (no conditional save_csv)
    2. Handles missing columns gracefully
    3. Sorts results by ranking_score before returning
    """
    try:
        user_id = uuid.UUID(current_user["user_id"])
        
        # FIXED: Always generate a unique CSV for ranking
        csv_filename = f"search_{uuid.uuid4()}.csv"
        papers = get_papers(body.query, save_csv=True, csv_filename=csv_filename)

        saved = []
        for p in papers:
            paper = Paper(
                user_id          = user_id,
                title            = p.get("title"),
                doi              = p.get("doi"),
                publication_date = p.get("publication_date") or p.get("date"),
                abstract         = p.get("abstract"),
                authors          = p.get("authors"),
                citation_count   = p.get("citation_count"),
                pdf_link         = p.get("pdf_link") or p.get("url"),
                source           = p.get("source"),
            )
            db.add(paper)
            db.flush()
            saved.append({**p, "db_id": str(paper.id)})

        db.commit()

        #  FIXED: Always rank papers (no conditional logic)
        try:
            ranked_df = rankPaper(
                csv_path=csv_filename,
                query=body.query,
                w_sim=0.6,      # Similarity weight (60%)
                w_time=0.25,    # Recency weight (25%)
                w_if=0.15       # Impact factor weight (15%)
            )

            # Create a mapping of titles to ranking scores
            ranking_scores = pd.Series(
                ranked_df["final_score"].values,
                index=ranked_df["title"].values
            ).to_dict()

            # Add ranking scores to saved papers
            for paper in saved:
                paper_title = paper.get("title", "")
                if paper_title in ranking_scores:
                    paper["ranking_score"] = float(ranking_scores[paper_title])
                else:
                    paper["ranking_score"] = 0.0

            # FIXED: Sort by ranking score (descending)
            saved = sorted(saved, key=lambda x: x.get("ranking_score", 0), reverse=True)
            
            print(f" Ranked {len(saved)} papers. Top score: {saved[0].get('ranking_score', 0):.4f}")

        except Exception as ranking_error:
            # If ranking fails, return papers unranked with warning
            print(f"⚠️  Ranking failed: {ranking_error}")
            import traceback
            traceback.print_exc()
            
            for paper in saved:
                paper["ranking_score"] = None

        return {"papers": saved}
        
    except Exception as e:
        db.rollback()
        print(f"Search error: {e}")
        import traceback
        traceback.print_exc()
        return JSONResponse({"error": str(e)}, status_code=500)
# ─── RAG: Index ───────────────────────────────────────────────────────────────

@app.post("/papers/index")
def index_papers_endpoint(
    body: IndexRequest,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    if len(body.paper_ids) != len(body.file_paths):
        raise HTTPException(status_code=400, detail="paper_ids and file_paths must have the same length")
    try:
        results = rag_index_papers(body.file_paths, body.paper_ids, db)
        return {"results": results}
    except Exception as e:
        return JSONResponse({"error": str(e)}, status_code=500)


# ─── RAG: Compare ─────────────────────────────────────────────────────────────

@app.post("/papers/compare")
def rag_compare(
    body: RAGCompareRequest,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    if len(body.paper_ids) < 2:
        raise HTTPException(status_code=400, detail="At least 2 papers required")
    try:
        user_id = uuid.UUID(current_user["user_id"])

        rows = compare_papers_rag(
            paper_ids       = body.paper_ids,
            db              = db,
            dimensions      = body.dimensions,
            custom_question = body.custom_question,
        )

        comparison = Comparison(user_id=user_id, name=body.comparison_name)
        db.add(comparison)
        db.flush()

        for paper_id in body.paper_ids:
            sources_json = {}
            for row in rows:
                dimension = row["dimension"]
                cell_value = row["values"].get(paper_id, {})
                sources_json[dimension] = cell_value.get("sources", [])

            cp = ComparisonPaper(
                comparison_id    = comparison.id,
                paper_id         = uuid.UUID(paper_id),
                scope            = next((r["values"].get(paper_id, {}).get("answer") for r in rows if r["dimension"] == "scope"), None),
                dataset          = next((r["values"].get(paper_id, {}).get("answer") for r in rows if r["dimension"] == "dataset"), None),
                methodology      = next((r["values"].get(paper_id, {}).get("answer") for r in rows if r["dimension"] == "methodology"), None),
                results          = next((r["values"].get(paper_id, {}).get("answer") for r in rows if r["dimension"] == "results"), None),
                additional_notes = next((r["values"].get(paper_id, {}).get("answer") for r in rows if r["dimension"] == "additional_notes"), None),
                sources_json     = sources_json
            )
            db.add(cp)

        db.commit()
        return {
            "comparison_id": str(comparison.id),
            "rows": rows,
        }
    except Exception as e:
        db.rollback()
        return JSONResponse({"error": str(e)}, status_code=500)


# ─── RAG: Understand ──────────────────────────────────────────────────────────

@app.post("/papers/{paper_id}/ask")
def ask_paper(
    paper_id: str,
    body: UnderstandRequest,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    try:
        result = understand_paper(
            paper_id       = paper_id,
            question       = body.question,
            db             = db,
            section_filter = body.section_filter,
        )
        return result
    except Exception as e:
        return JSONResponse({"error": str(e)}, status_code=500)


# ─── Old Grobid compare (kept for reference) ──────────────────────────────────

@app.post("/compare_papers")
def compare(
    body: CompareRequest,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    try:
        user_id = uuid.UUID(current_user["user_id"])
        rows = compare_papers(body.file_paths)

        comparison = Comparison(user_id=user_id, name=body.comparison_name)
        db.add(comparison)
        db.flush()

        for row in rows:
            paper = Paper(
                user_id          = user_id,
                authors          = row.get("authors"),
                publication_date = row.get("date"),
                source           = "uploaded",
            )
            db.add(paper)
            db.flush()

            cp = ComparisonPaper(
                comparison_id    = comparison.id,
                paper_id         = paper.id,
                scope            = row.get("scope"),
                dataset          = row.get("dataset"),
                methodology      = row.get("methodology"),
                results          = row.get("results"),
                additional_notes = row.get("additional_notes"),
                sources_json     = row.get("_sources"),
            )
            db.add(cp)

        db.commit()
        return {"comparison_id": str(comparison.id), "comparison": rows}
    except Exception as e:
        db.rollback()
        return JSONResponse({"error": str(e)}, status_code=500)


# ─── Collections ──────────────────────────────────────────────────────────────

@app.get("/collections")
def list_collections(
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    user_id = uuid.UUID(current_user["user_id"])
    cols = db.query(Collection).filter(Collection.user_id == user_id).order_by(Collection.created_at.desc()).all()
    return {"collections": [{"id": str(c.id), "name": c.label, "created_at": str(c.created_at)} for c in cols]}


@app.post("/collections")
def create_collection(
    body: CollectionCreateRequest,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    user_id = uuid.UUID(current_user["user_id"])

    existing = db.query(Collection).filter(
        Collection.user_id == user_id,
        Collection.label == body.name
    ).first()

    if existing:
        raise HTTPException(status_code=400, detail="Collection with this name already exists")

    col = Collection(user_id=user_id, label=body.name)
    db.add(col)
    db.commit()
    db.refresh(col)
    return {"id": str(col.id), "name": col.label, "created_at": str(col.created_at)}


@app.patch("/collections/{collection_id}")
def update_collection(
    collection_id: str,
    body: CollectionUpdateRequest,  # FIX: was `body: dict`
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    user_id = uuid.UUID(current_user["user_id"])
    col = db.query(Collection).filter(
        Collection.id == uuid.UUID(collection_id),
        Collection.user_id == user_id
    ).first()

    if not col:
        raise HTTPException(status_code=404, detail="Collection not found")

    new_name = body.name.strip()
    if not new_name:
        raise HTTPException(status_code=400, detail="Name cannot be empty")

    existing = db.query(Collection).filter(
        Collection.user_id == user_id,
        Collection.label == new_name,
        Collection.id != uuid.UUID(collection_id)
    ).first()

    if existing:
        raise HTTPException(status_code=400, detail="Collection with this name already exists")

    col.label = new_name
    db.commit()
    db.refresh(col)

    return {
        "id": str(col.id),
        "name": col.label,
        "created_at": str(col.created_at)
    }


@app.delete("/collections/{collection_id}")
def delete_collection(
    collection_id: str,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    user_id = uuid.UUID(current_user["user_id"])
    col = db.query(Collection).filter(
        Collection.id == uuid.UUID(collection_id),
        Collection.user_id == user_id
    ).first()

    if not col:
        raise HTTPException(status_code=404, detail="Collection not found")

    db.query(CollectionPaper).filter(
        CollectionPaper.collection_id == uuid.UUID(collection_id)
    ).delete()

    db.delete(col)
    db.commit()

    return {"message": "Collection deleted"}


@app.get("/collections/{collection_id}")
def get_collection(
    collection_id: str,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    col = db.query(Collection).filter(Collection.id == uuid.UUID(collection_id)).first()
    if not col:
        raise HTTPException(status_code=404, detail="Collection not found")

    col_papers = db.query(CollectionPaper).filter(CollectionPaper.collection_id == col.id).all()
    paper_ids = [cp.paper_id for cp in col_papers]
    papers = db.query(Paper).filter(Paper.id.in_(paper_ids)).all()

    return {
        "collection": {"id": str(col.id), "name": col.label, "created_at": str(col.created_at)},
        "papers": [
            {
                "id":               str(p.id),
                "title":            p.title,
                "authors":          p.authors,
                "publication_date": p.publication_date,
                "abstract":         p.abstract,
                "pdf_link":         p.pdf_link,
                "source":           p.source,
                "is_indexed":       p.is_indexed,
            }
            for p in papers
        ],
    }


@app.post("/collections/{collection_id}/papers")
def add_paper_to_collection(
    collection_id: str,
    body: AddPaperRequest,  # FIX: was `body: dict`
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    paper_id = body.paper_id

    existing = db.query(CollectionPaper).filter(
        CollectionPaper.collection_id == uuid.UUID(collection_id)
    ).count()
    if existing >= 5:
        raise HTTPException(status_code=400, detail="Collection limit reached (5 papers max)")

    already = db.query(CollectionPaper).filter(
        CollectionPaper.collection_id == uuid.UUID(collection_id),
        CollectionPaper.paper_id == uuid.UUID(paper_id),
    ).first()
    if already:
        raise HTTPException(status_code=400, detail="Paper already in collection")

    cp = CollectionPaper(
        collection_id=uuid.UUID(collection_id),
        paper_id=uuid.UUID(paper_id),
    )
    db.add(cp)

    paper = db.query(Paper).filter(Paper.id == uuid.UUID(paper_id)).first()
    if paper and not paper.is_indexed and paper.pdf_link:
        try:
            rag_index_papers([paper.pdf_link], [paper_id], db)
            paper.is_indexed = 1
        except Exception:
            pass

    db.commit()
    return {"message": "Paper added to collection"}


@app.post("/collections/{collection_id}/upload")
async def upload_to_collection(
    collection_id: str,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    if not file.filename.endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF files allowed")

    existing = db.query(CollectionPaper).filter(
        CollectionPaper.collection_id == uuid.UUID(collection_id)
    ).count()
    if existing >= 5:
        raise HTTPException(status_code=400, detail="Collection limit reached (5 papers max)")

    unique_name = f"{uuid.uuid4()}_{file.filename}"
    save_path = UPLOAD_DIR / unique_name
    with save_path.open("wb") as f:
        shutil.copyfileobj(file.file, f)

    user_id = uuid.UUID(current_user["user_id"])
    paper = Paper(
        user_id  = user_id,
        title    = file.filename.replace(".pdf", ""),
        source   = "uploaded",
        pdf_link = str(save_path),
    )
    db.add(paper)
    db.flush()

    cp = CollectionPaper(
        collection_id = uuid.UUID(collection_id),
        paper_id      = paper.id,
    )
    db.add(cp)

    try:
        rag_index_papers([str(save_path)], [str(paper.id)], db)
        paper.is_indexed = 1
    except Exception:
        pass

    db.commit()
    return {"paper_id": str(paper.id), "filename": file.filename, "message": "Uploaded and added to collection"}


@app.delete("/collections/{collection_id}/papers/{paper_id}")
def remove_paper_from_collection(
    collection_id: str,
    paper_id: str,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    user_id = uuid.UUID(current_user["user_id"])

    col = db.query(Collection).filter(
        Collection.id == uuid.UUID(collection_id),
        Collection.user_id == user_id
    ).first()

    if not col:
        raise HTTPException(status_code=404, detail="Collection not found")

    cp = db.query(CollectionPaper).filter(
        CollectionPaper.collection_id == uuid.UUID(collection_id),
        CollectionPaper.paper_id == uuid.UUID(paper_id)
    ).first()

    if not cp:
        raise HTTPException(status_code=404, detail="Paper not in collection")

    db.delete(cp)
    db.commit()

    return {"message": "Paper removed from collection"}


# ─── Comparisons ──────────────────────────────────────────────────────────────

@app.get("/comparisons")
def get_comparisons(
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    user_id = uuid.UUID(current_user["user_id"])
    comparisons = db.query(Comparison).filter(
        Comparison.user_id == user_id
    ).order_by(Comparison.created_at.desc()).all()
    return {"comparisons": [
        {"id": str(c.id), "name": c.name, "created_at": str(c.created_at)}
        for c in comparisons
    ]}

@app.get("/comparisons/{comparison_id}")
def get_comparison(
    comparison_id: str,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    comparison = db.query(Comparison).filter(
        Comparison.id == uuid.UUID(comparison_id)
    ).first()
    if not comparison:
        raise HTTPException(status_code=404, detail="Comparison not found")

    cp_rows = db.query(ComparisonPaper).filter(
        ComparisonPaper.comparison_id == comparison.id
    ).all()

    paper_ids = [cp.paper_id for cp in cp_rows]
    papers = db.query(Paper).filter(Paper.id.in_(paper_ids)).all()
    paper_map = {str(p.id): p.title or p.pdf_link or str(p.id) for p in papers}

    dimensions = ["scope", "dataset", "methodology", "results", "additional_notes"]
    rows = [
        {
            "dimension": dim,
            "values": {
                str(cp.paper_id): {
                    "answer":  getattr(cp, dim) or "",
                    "sources": (cp.sources_json or {}).get(dim, []),
                }
                for cp in cp_rows
            }
        }
        for dim in dimensions
    ]

    return {
        "comparison_id": str(comparison.id),
        "name":          comparison.name,
        "created_at":    str(comparison.created_at),
        "headers":       [{"id": str(pid), "title": paper_map.get(str(pid), str(pid))} for pid in paper_ids],
        "rows":          rows,
    }


# ─── Frontend static files (MUST be last) ────────────────────────────────────

frontend_path = Path("frontend/ver1/client/dist")
if frontend_path.exists():
    app.mount("/assets", StaticFiles(directory=frontend_path / "assets"), name="assets")

    @app.get("/{full_path:path}")
    def serve_frontend(full_path: str):
        return FileResponse(frontend_path / "index.html")


# ─── Entry point ──────────────────────────────────────────────────────────────

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=5000, reload=True)