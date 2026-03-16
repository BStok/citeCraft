from dotenv import load_dotenv
load_dotenv()

import uuid
import shutil
import uvicorn
from pathlib import Path
from contextlib import asynccontextmanager
from fastapi import FastAPI, Depends, HTTPException, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from pydantic import BaseModel
from typing import Optional
from sqlalchemy.orm import Session

from backend.acquisition.paper_acquisition import get_papers
from backend.comparison.comp import compare_papers
from backend.db.db import get_db, init_db
from backend.db.models import Paper, Comparison, ComparisonPaper, Collection, CollectionPaper, User
from backend.auth.auth import hash_password, verify_password, generate_token, verify_token
from backend.rag.pipeline import index_papers, compare_papers_rag, understand_paper
from backend.rag.retriever import index_paper

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


# ─── Auth (public) ────────────────────────────────────────────────────────────

class RegisterRequest(BaseModel):
    username: str
    password: str

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


# ─── File Upload ──────────────────────────────────────────────────────────────

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

    # Create a Paper record so we have a paper_id for indexing
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

class SearchRequest(BaseModel):
    query: str
    save_csv: Optional[bool] = False
    csv_filename: Optional[str] = "citeCraft.csv"

@app.post("/search_papers")
def search_papers(
    body: SearchRequest,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    try:
        user_id = uuid.UUID(current_user["user_id"])
        papers = get_papers(body.query, save_csv=body.save_csv, csv_filename=body.csv_filename)

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
        return {"papers": saved}
    except Exception as e:
        db.rollback()
        return JSONResponse({"error": str(e)}, status_code=500)


# ─── RAG: Index ───────────────────────────────────────────────────────────────

class IndexRequest(BaseModel):
    paper_ids: list[str]   # DB paper UUIDs
    file_paths: list[str]  # corresponding PDF paths on server

@app.post("/papers/index")
def index_papers_endpoint(
    body: IndexRequest,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    if len(body.paper_ids) != len(body.file_paths):
        raise HTTPException(status_code=400, detail="paper_ids and file_paths must have the same length")
    try:
        results = index_papers(body.file_paths, body.paper_ids, db)
        return {"results": results}
    except Exception as e:
        return JSONResponse({"error": str(e)}, status_code=500)


# ─── RAG: Compare ─────────────────────────────────────────────────────────────

class RAGCompareRequest(BaseModel):
    paper_ids: list[str]
    dimensions: Optional[list[str]] = None
    custom_question: Optional[str] = None
    comparison_name: Optional[str] = "Untitled Comparison"

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

        # Run RAG comparison
        rows = compare_papers_rag(
            paper_ids       = body.paper_ids,
            db              = db,
            dimensions      = body.dimensions,
            custom_question = body.custom_question,
        )

        # Save to DB
        comparison = Comparison(user_id=user_id, name=body.comparison_name)
        db.add(comparison)
        db.flush()

        for paper_id in body.paper_ids:
            cp = ComparisonPaper(
                comparison_id = comparison.id,
                paper_id      = uuid.UUID(paper_id),
                scope         = next((r["values"].get(paper_id) for r in rows if r["dimension"] == "scope"), None),
                dataset       = next((r["values"].get(paper_id) for r in rows if r["dimension"] == "dataset"), None),
                methodology   = next((r["values"].get(paper_id) for r in rows if r["dimension"] == "methodology"), None),
                results       = next((r["values"].get(paper_id) for r in rows if r["dimension"] == "results"), None),
                additional_notes = next((r["values"].get(paper_id) for r in rows if r["dimension"] == "additional_notes"), None),
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

class UnderstandRequest(BaseModel):
    question: str
    section_filter: Optional[str] = None

@app.post("/papers/{paper_id}/ask")
def ask_paper(
    paper_id: str,
    body: UnderstandRequest,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    try:
        answer = understand_paper(
            paper_id       = paper_id,
            question       = body.question,
            db             = db,
            section_filter = body.section_filter,
        )
        return {"answer": answer}
    except Exception as e:
        return JSONResponse({"error": str(e)}, status_code=500)


# ─── Old Compare (GROBID-based, kept for reference) ───────────────────────────

class CompareRequest(BaseModel):
    file_paths: list[str]
    comparison_name: Optional[str] = "Untitled Comparison"

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

class CollectionCreateRequest(BaseModel):
    name: str
    description: Optional[str] = None

@app.get("/collections")
def list_collections(
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    user_id = uuid.UUID(current_user["user_id"])
    cols = db.query(Collection).filter(Collection.user_id == user_id).order_by(Collection.created_at.desc()).all()
    return [{"id": str(c.id), "name": c.label, "created_at": str(c.created_at)} for c in cols]

@app.post("/collections")
def create_collection(
    body: CollectionCreateRequest,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    user_id = uuid.UUID(current_user["user_id"])
    col = Collection(user_id=user_id, label=body.name)
    db.add(col)
    db.commit()
    db.refresh(col)
    return {"id": str(col.id), "name": col.label, "created_at": str(col.created_at)}

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
            }
            for p in papers
        ],
    }

@app.post("/collections/{collection_id}/papers")
def add_paper_to_collection(
    collection_id: str,
    body: dict,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    paper_id = body.get("paper_id")
    if not paper_id:
        raise HTTPException(status_code=400, detail="paper_id required")
    cp = CollectionPaper(
        collection_id = uuid.UUID(collection_id),
        paper_id      = uuid.UUID(paper_id),
    )
    db.add(cp)
    db.commit()
    return {"message": "Paper added to collection"}


# ─── Comparisons list ─────────────────────────────────────────────────────────

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


if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=5000, reload=True)