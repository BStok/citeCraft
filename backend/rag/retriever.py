# backend/rag/retriever.py
from dotenv import load_dotenv
load_dotenv()

import json
import uuid
from sqlalchemy.orm import Session
from sqlalchemy import text
from backend.db.models import PaperChunk, Paper
from backend.rag.embedder import embed_text, embed_batch
from backend.parsing.pdf_parser import parse_pdf_into_chunks


# ─── Indexing ─────────────────────────────────────────────────────────────────

def index_paper(pdf_path: str, paper_id: str, db: Session) -> int:
    """
    Full indexing pipeline for a single PDF:
      1. Parse PDF into chunks
      2. Embed all chunks in batches
      3. Store chunks + embeddings in DB
      4. Mark paper as indexed

    Returns number of chunks stored.
    """
    # Check if already indexed
    existing = db.query(PaperChunk).filter(
        PaperChunk.paper_id == uuid.UUID(paper_id)
    ).first()
    if existing:
        print(f"Paper {paper_id} already indexed, skipping.")
        return 0

    # Step 1: Parse
    print(f"Parsing {pdf_path}...")
    chunks = parse_pdf_into_chunks(pdf_path)
    if not chunks:
        print("No chunks extracted.")
        return 0

    # Step 2: Embed
    print(f"Embedding {len(chunks)} chunks...")
    texts = [c["text"] for c in chunks]
    embeddings = embed_batch(texts)

    # Step 3: Store
    for chunk, embedding in zip(chunks, embeddings):
        # Convert np.float32 to plain Python float
        clean_embedding = [float(v) for v in embedding]

        db_chunk = PaperChunk(
            paper_id    = uuid.UUID(paper_id),
            section     = chunk["section"],
            chunk_index = chunk["chunk_index"],
            text        = chunk["text"],
            token_count = chunk["token_count"],
            embedding   = clean_embedding,  # stored as JSONB
        )
        db.add(db_chunk)

    # Step 4: Mark paper as indexed
    paper = db.query(Paper).filter(Paper.id == uuid.UUID(paper_id)).first()
    if paper:
        paper.is_indexed = 1

    db.commit()
    print(f"Indexed {len(chunks)} chunks for paper {paper_id}")
    return len(chunks)


# ─── Retrieval ────────────────────────────────────────────────────────────────

def retrieve_chunks(
    query: str,
    paper_ids: list[str],
    db: Session,
    section_filter: str = None,
    top_k: int = 5,
) -> list[dict]:
    """
    Retrieve most relevant chunks for a query using cosine similarity.
    
    Uses JSONB embeddings + manual cosine similarity since pgvector
    extension may not be enabled. Falls back to pure SQL dot product.

    Args:
        query:          The user's question
        paper_ids:      List of paper UUIDs to search within
        db:             DB session
        section_filter: Optional section to restrict search (e.g. "methodology")
        top_k:          Number of chunks to return

    Returns:
        List of chunk dicts with similarity scores
    """
    # Embed the query
    query_embedding = [float(v) for v in embed_text(query)]

    # Fetch candidate chunks
    q = db.query(PaperChunk).filter(
        PaperChunk.paper_id.in_([uuid.UUID(pid) for pid in paper_ids])
    )
    if section_filter:
        q = q.filter(PaperChunk.section == section_filter)

    candidates = q.all()

    if not candidates:
        return []

    # Compute cosine similarity in Python
    def cosine_similarity(a: list[float], b: list[float]) -> float:
        dot = sum(x * y for x, y in zip(a, b))
        norm_a = sum(x * x for x in a) ** 0.5
        norm_b = sum(x * x for x in b) ** 0.5
        if norm_a == 0 or norm_b == 0:
            return 0.0
        return dot / (norm_a * norm_b)

    scored = []
    for chunk in candidates:
        if not chunk.embedding:
            continue
        sim = cosine_similarity(query_embedding, chunk.embedding)
        scored.append({
            "chunk_id":    str(chunk.id),
            "paper_id":    str(chunk.paper_id),
            "section":     chunk.section,
            "chunk_index": chunk.chunk_index,
            "text":        chunk.text,
            "score":       sim,
        })

    # Sort by similarity descending
    scored.sort(key=lambda x: x["score"], reverse=True)
    return scored[:top_k]


def retrieve_for_comparison(
    dimension: str,
    paper_ids: list[str],
    db: Session,
    top_k: int = 3,
) -> dict[str, list[dict]]:
    """
    Retrieve relevant chunks per paper for a comparison dimension.
    Returns dict of paper_id -> list of chunks.
    """
    # Map comparison dimensions to section filters
    section_map = {
        "scope":            "introduction",
        "dataset":          "dataset",
        "methodology":      "methodology",
        "results":          "results",
        "additional_notes": None,  # search all sections
    }

    section_filter = section_map.get(dimension.lower())

    results: dict[str, list[dict]] = {}
    for paper_id in paper_ids:
        chunks = retrieve_chunks(
            query=dimension,
            paper_ids=[paper_id],
            db=db,
            section_filter=section_filter,
            top_k=top_k,
        )
        results[paper_id] = chunks

    return results