from dotenv import load_dotenv
load_dotenv()

import uuid
import uvicorn
from contextlib import asynccontextmanager
from fastapi import FastAPI, Depends, HTTPException, Header
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from typing import Optional
from sqlalchemy.orm import Session

from backend.acquisition.paper_acquisition import get_papers
from backend.comparison.comp import compare_papers
from backend.db.db import get_db, init_db
from backend.db.models import Paper, Comparison, ComparisonPaper, User
from backend.auth.auth import hash_password, verify_password, generate_token, verify_token


@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()   # runs on startup
    yield
    # anything after yield runs on shutdown

app = FastAPI(lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # tighten to your Replit URL before prod
    allow_methods=["*"],
    allow_headers=["*"],
)

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="auth/login") #auth button

# ─── Auth dependency ──────────────────────────────────────────────────────────

def get_current_user(token: str = Depends(oauth2_scheme)) -> dict:
    payload = verify_token(token)
    if not payload:
        raise HTTPException(status_code=401, detail="Token expired or invalid")
    return payload


# ─── Auth routes (public) ─────────────────────────────────────────────────────

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
# ─── Protected routes ─────────────────────────────────────────────────────────

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


@app.get("/comparisons")
def get_comparisons(
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    try:
        user_id = uuid.UUID(current_user["user_id"])
        comparisons = db.query(Comparison).filter(
            Comparison.user_id == user_id
        ).order_by(Comparison.created_at.desc()).all()
        return {"comparisons": [
            {"id": str(c.id), "name": c.name, "created_at": str(c.created_at)}
            for c in comparisons
        ]}
    except Exception as e:
        return JSONResponse({"error": str(e)}, status_code=500)


if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=5000, reload=True)