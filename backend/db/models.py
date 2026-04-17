# backend/db/models.py
from sqlalchemy import Column, String, Text, Integer, DateTime, ForeignKey,Index
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import declarative_base
from datetime import datetime
import uuid

Base = declarative_base()

class User(Base):
    __tablename__ = "users"
    id            = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    firebase_uid = Column(String,unique=True, nullable=True)
    username      = Column(String, unique=True, nullable=False)
    password_hash = Column(String, nullable=False)
    created_at    = Column(DateTime, default=datetime.utcnow)

class Paper(Base):
    __tablename__ = "papers"
    # internal
    id            = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id       = Column(UUID(as_uuid=True), ForeignKey("users.id"))
    xml_path      = Column(String)
    created_at    = Column(DateTime, default=datetime.utcnow)
    # finding papers grid
    title         = Column(String)
    doi           = Column(String)
    publication_date = Column(String)
    abstract      = Column(Text)
    authors       = Column(Text)
    citation_count = Column(Integer)
    pdf_link      = Column(String)
    source        = Column(String)   # e.g. "Semantic Scholar", "arXiv", "uploaded"
    is_indexed       = Column(Integer, default=0)
    
class Comparison(Base):
    __tablename__ = "comparisons"
    id            = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id       = Column(UUID(as_uuid=True), ForeignKey("users.id"))
    name          = Column(String)
    created_at    = Column(DateTime, default=datetime.utcnow)

class ComparisonPaper(Base):
    __tablename__ = "comparison_papers"
    id            = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    comparison_id = Column(UUID(as_uuid=True), ForeignKey("comparisons.id"))
    paper_id      = Column(UUID(as_uuid=True), ForeignKey("papers.id"))
    # comparison grid
    scope         = Column(Text)
    dataset       = Column(Text)
    methodology   = Column(Text)
    results       = Column(Text)
    additional_notes = Column(Text)
    sources_json  = Column(JSONB)    # _sources dict for future source lines UI

class Collection(Base):
    __tablename__ = "collections"
    id            = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id       = Column(UUID(as_uuid=True), ForeignKey("users.id"))
    label         = Column(String)
    created_at    = Column(DateTime, default=datetime.utcnow)

class CollectionPaper(Base):
    __tablename__ = "collection_papers"
    collection_id = Column(UUID(as_uuid=True), ForeignKey("collections.id"), primary_key=True)
    paper_id      = Column(UUID(as_uuid=True), ForeignKey("papers.id"), primary_key=True)


class PaperChunk(Base):
    """
    Stores chunked text from uploaded PDFs with section metadata.
    Embeddings are stored as a JSONB float array — we use pgvector
    via raw SQL for the similarity search to avoid ORM complexity.
    """
    __tablename__ = "paper_chunks"
 
    id            = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    paper_id      = Column(UUID(as_uuid=True), ForeignKey("papers.id"), nullable=False)
    # Section this chunk belongs to e.g. "abstract", "methodology", "results"
    section       = Column(String, nullable=False)
    # Index of this chunk within the section (for ordering)
    chunk_index   = Column(Integer, nullable=False)
    # The actual text of the chunk
    text          = Column(Text, nullable=False)
    # Token count (approx) for debugging
    token_count   = Column(Integer)
    # Embedding stored as JSONB float array — converted to pgvector via SQL
    embedding     = Column(JSONB)
    created_at    = Column(DateTime, default=datetime.utcnow)
 
    __table_args__ = (
        # Index for fast lookup by paper
        Index("ix_paper_chunks_paper_id", "paper_id"),
        # Index for fast lookup by section
        Index("ix_paper_chunks_section", "section"),
    )
 