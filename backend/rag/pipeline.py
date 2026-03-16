from dotenv import load_dotenv
load_dotenv()

import os
import re
import json
from sqlalchemy.orm import Session
from huggingface_hub import InferenceClient

from backend.rag.retriever import index_paper, retrieve_chunks, retrieve_for_comparison
from backend.db.models import Paper

client = InferenceClient(api_key=os.environ.get("HF_TOKEN"))
MODEL = "Qwen/Qwen2.5-72B-Instruct"

# Comparison dimensions ─

DEFAULT_DIMENSIONS = [
    "scope",
    "dataset",
    "methodology",
    "results",
    "additional_notes",
]

#  Prompts

COMPARISON_PROMPT = """You are a research assistant comparing academic papers.

Based ONLY on the following excerpts from a paper, answer this question:
"{dimension}"

Paper excerpts:
{chunks}

Be concise and specific. If the information is not present in the excerpts, say "Not specified".
Respond in 3-5 sentences maximum.
"""

UNDERSTANDING_PROMPT = """You are a research assistant helping explain academic papers.

Based ONLY on the following excerpts from a paper, answer this question:
"{question}"

Paper excerpts:
{chunks}

Be clear and concise. If the information is not present in the excerpts, say "Not found in the provided sections".
"""


def _format_chunks(chunks: list[dict]) -> str:
    """Format retrieved chunks into a readable string for the LLM."""
    if not chunks:
        return "No relevant excerpts found."
    parts = []
    for i, c in enumerate(chunks, 1):
        parts.append(f"[Excerpt {i} — {c['section']}]\n{c['text']}")
    return "\n\n".join(parts)


def _call_llm(prompt: str) -> str:
    """Call Qwen with a prompt and return the response text."""
    response = client.chat.completions.create(
        model=MODEL,
        messages=[{"role": "user", "content": prompt}],
        max_tokens=500,
        temperature=0.1,
    )
    return response.choices[0].message.content.strip()


#  Index pipeline 

def index_papers(pdf_paths: list[str], paper_ids: list[str], db: Session) -> dict:
    """
    Index multiple papers. Returns status per paper.
    """
    results = {}
    for pdf_path, paper_id in zip(pdf_paths, paper_ids):
        try:
            n_chunks = index_paper(pdf_path, paper_id, db)
            results[paper_id] = {"status": "ok", "chunks": n_chunks}
        except Exception as e:
            results[paper_id] = {"status": "error", "error": str(e)}
    return results


# Comparison pipeline 

def compare_papers_rag(
    paper_ids: list[str],
    db: Session,
    dimensions: list[str] = None,
    custom_question: str = None,
) -> list[dict]:
    """
    Compare multiple papers across dimensions using RAG.

    Args:
        paper_ids:        List of paper DB UUIDs to compare
        db:               DB session
        dimensions:       List of comparison dimensions (defaults to DEFAULT_DIMENSIONS)
        custom_question:  Optional free-form question to add as extra dimension

    Returns:
        List of row dicts:
        {
            "dimension": str,
            "values": { paper_id: answer }
        }
    """
    if dimensions is None:
        dimensions = DEFAULT_DIMENSIONS

    if custom_question:
        dimensions = dimensions + [custom_question]

    rows = []

    for dimension in dimensions:
        # Retrieve relevant chunks per paper for this dimension
        chunks_per_paper = retrieve_for_comparison(dimension, paper_ids, db, top_k=3)

        values = {}
        for paper_id in paper_ids:
            chunks = chunks_per_paper.get(paper_id, [])
            formatted = _format_chunks(chunks)

            prompt = COMPARISON_PROMPT.format(
                dimension=dimension,
                chunks=formatted,
            )

            try:
                answer = _call_llm(prompt)
            except Exception as e:
                answer = f"Error generating answer: {e}"

            values[paper_id] = answer

        rows.append({
            "dimension": dimension,
            "values":    values,
        })

    return rows


# Understanding pipeline 

def understand_paper(
    paper_id: str,
    question: str,
    db: Session,
    section_filter: str = None,
) -> str:
    """
    Answer a question about a single paper using RAG.

    Args:
        paper_id:       Paper DB UUID
        question:       User's question
        db:             DB session
        section_filter: Optional section to restrict search

    Returns:
        Answer string
    """
    chunks = retrieve_chunks(
        query=question,
        paper_ids=[paper_id],
        db=db,
        section_filter=section_filter,
        top_k=5,
    )

    formatted = _format_chunks(chunks)
    prompt = UNDERSTANDING_PROMPT.format(
        question=question,
        chunks=formatted,
    )

    return _call_llm(prompt)