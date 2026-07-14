# CiteCraft

> AI-powered research navigation platform for discovering, comparing, and understanding academic papers using Retrieval-Augmented Generation (RAG).

[![FastAPI](https://img.shields.io/badge/FastAPI-0.100+-009688?style=flat&logo=fastapi)](https://fastapi.tiangolo.com)
[![React](https://img.shields.io/badge/React-18-61DAFB?style=flat&logo=react)](https://react.dev)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-336791?style=flat&logo=postgresql)](https://postgresql.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?style=flat&logo=typescript)](https://typescriptlang.org)

---

## Overview

CiteCraft replaces manual literature review workflows with an end-to-end AI pipeline. Researchers can search millions of papers, upload PDFs for semantic analysis, compare papers across custom dimensions, and query paper content in natural language — all from a single interface.

The system was originally built with Grobid for PDF parsing. This was replaced with a custom section-aware chunking and RAG pipeline to reduce deployment overhead and enable richer semantic retrieval.

## Demo
- **Live demo:** [cite-craft.vercel.app](https://cite-craft.vercel.app)
- **Watch demo video** [here](https://drive.google.com/file/d/1DoXK4ylpawe8AgIVmvCC1KF4qV45dGsc/view?usp=sharing)

---

## Key Features

### Paper Discovery
- Multi-source academic search across Semantic Scholar, arXiv, and CORE
- Automatic metadata extraction (title, authors, DOI, abstract, citation count)
- Client-side citation generation in APA, MLA, IEEE, and BibTeX formats
- CSV export of search results

### RAG Pipeline (Core)
- Section-aware PDF chunking — chunks are tagged by paper section (abstract, introduction, methodology, results, conclusion) rather than split at fixed token boundaries
- Sentence-transformer embeddings stored as JSONB in PostgreSQL
- Cosine similarity retrieval at query time, with optional section filtering
- Qwen 2.5-72B via HuggingFace Inference API for answer generation

### Paper Comparison
- Upload multiple PDFs or select from saved collections
- Configurable comparison dimensions (scope, dataset, methodology, results, custom questions)
- RAG retrieval per dimension per paper — each cell is independently grounded in source chunks
- Source chunk attribution — collapsible per-cell source text with relevance scores
- Results persisted to PostgreSQL and viewable in comparison history
- CSV export of comparison table

### Paper Understanding
- Chat interface over a single paper
- Section-scoped retrieval (focus queries on specific paper sections)
- Markdown-rendered responses with collapsible source attribution
- Session-persistent chat history across navigation

### Collections
- Named collections with a 5-paper limit per collection
- Papers auto-indexed on addition — embeddings computed once and reused across compare and understand workflows
- Direct PDF upload to collection with automatic indexing
- Indexed/not-indexed status tracking per paper

---

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                     React Frontend                      │
│  TanStack Query · Wouter · shadcn/ui · Zod validation   │
└────────────────────────┬────────────────────────────────┘
                         │ REST
┌────────────────────────▼────────────────────────────────┐
│                    FastAPI Backend                      │
│         JWT Auth · SQLAlchemy ORM · Pydantic            │
└──────┬──────────────┬──────────────────┬────────────────┘
       │              │                  │
┌──────▼──────┐ ┌─────▼──────┐ ┌────────▼───────┐
│  PostgreSQL │ │RAG Pipeline│ │  HuggingFace   │
│  (Supabase) │ |            │ │  Inference API │
│             │ │ pypdf      │ │                │
│  papers     │ │ chunking   │ │  Qwen 2.5-72B  │
│  chunks     │ │ embeddings │ │                │
│  comparisons│ │ retrieval  │ └────────────────┘
│  collections│ └────────────┘
└─────────────┘
```

---

## RAG Pipeline Detail

```
PDF Upload
    │
    ▼
pypdf text extraction
    │
    ▼
Section-aware chunking
(sections detected via heading patterns)
    │
    ▼
Sentence-transformer embedding
(per chunk, batched)
    │
    ▼
JSONB storage in PostgreSQL
(paper_chunks table, indexed by paper_id + section)
    │
    ▼
Query time: embed question → cosine similarity search
    │        optional section filter
    ▼
Top-k chunks → LLM context window → answer
```

**Current tradeoff:** embeddings stored as JSONB float arrays with Python-side cosine similarity. Planned migration to pgvector with HNSW indexing for O(log n) approximate nearest-neighbour search at scale.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18, TypeScript, Vite, TanStack Query, Wouter, shadcn/ui, Zod |
| Backend | FastAPI, SQLAlchemy, Pydantic, psycopg2 |
| Database | PostgreSQL 16 (Railway) |
| RAG | pypdf, sentence-transformers, JSONB vector storage |
| LLM | Qwen 2.5-72B via HuggingFace Inference API |
| Auth | JWT, OAuth2 password flow |
| Deployment | Railway (backend + DB), Vercel (frontend) |

---

## Project Structure

```
citeCraft/
├── main.py                          # FastAPI app, all route definitions
├── frontend/ver1/client/            # React frontend
│   └── src/
│       ├── pages/                   # Route-level components
│       ├── hooks/                   # TanStack Query hooks
│       ├── context/                 # Session state (React context)
│       └── components/              # Shared UI components
└── backend/
    ├── acquisition/
    │   └── paper_acquisition.py     # Multi-source paper search
    ├── rag/
    │   ├── pipeline.py              # Index, compare, understand orchestration
    │   ├── retriever.py             # Embedding + cosine similarity retrieval
    │   └── embedder.py              # Sentence-transformer wrapper
    ├── parsing/
    │   └── pdf_parser.py            # Section-aware PDF chunking
    ├── comparison/
    │   └── comp.py                  # Legacy Grobid comparison (reference)
    ├── auth/
    │   └── auth.py                  # JWT generation and verification
    └── db/
        ├── db.py                    # SQLAlchemy session and init
        └── models.py                # ORM models
```

---

## Local Development

### Prerequisites
- Python 3.11+
- Node.js 18+
- PostgreSQL instance (local or Railway)

### Backend
```bash
# Clone and install
git clone https://github.com/yourusername/citeCraft.git
cd citeCraft
pip install -r requirements.txt

# Environment variables
cp .env.example .env
# Add: DATABASE_URL, HF_TOKEN, JWT_SECRET

# Run
python main.py
# API available at http://localhost:5000
# Interactive docs at http://localhost:5000/docs
```

### Frontend
```bash
cd frontend/ver1/client
npm install

# Environment
echo "VITE_API_URL=http://localhost:5000" > .env.local

npm run dev
# Available at http://localhost:5173
```

---

## API Reference

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/auth/register` | Register new user |
| POST | `/auth/login` | Login, returns JWT |
| POST | `/upload_pdf` | Upload PDF, returns paper_id |
| POST | `/search_papers` | Search academic databases |
| POST | `/papers/index` | Index PDFs for RAG |
| POST | `/papers/compare` | RAG-based comparison |
| POST | `/papers/{id}/ask` | Ask question about paper |
| GET | `/collections` | List user collections |
| POST | `/collections` | Create collection |
| POST | `/collections/{id}/papers` | Add paper to collection |
| POST | `/collections/{id}/upload` | Upload PDF to collection |
| GET | `/comparisons` | List past comparisons |
| GET | `/comparisons/{id}` | Get comparison detail |

Full interactive API documentation available at `/docs` (Swagger UI).

---

## Design Decisions

**Why RAG over Grobid?**
Grobid requires a running Java server, making it unsuitable for lightweight cloud deployment. The custom RAG pipeline achieves comparable extraction quality with a significantly smaller footprint and adds semantic retrieval capabilities Grobid cannot provide.

**Why section-aware chunking?**
Fixed-size chunking splits text arbitrarily, often breaking semantic units. Section-aware chunking preserves context within paper sections and enables section-scoped retrieval at query time — improving both precision and explainability.

**Why JSONB for embeddings?**
Pragmatic choice for initial deployment — pgvector requires explicit extension enablement and ORM configuration overhead. JSONB works correctly at current scale. Migration to pgvector with HNSW indexing is planned for production scaling.


**Why Qwen 2.5-72B?**
Free tier access via HuggingFace Inference API with strong multilingual academic reasoning. Easily swappable — the LLM call is isolated in `pipeline.py`.

---

## Planned Improvements

- [ ] pgvector migration with HNSW indexing
- [ ] Streaming LLM responses via FastAPI `StreamingResponse`
- [ ] Google Drive integration for paper import
- [ ] Hybrid search (keyword + semantic)
- [ ] Re-ranking retrieved chunks before LLM context assembly
- [ ] Background indexing queue (Celery + Redis) for large PDFs
- [ ] Citation network visualization
