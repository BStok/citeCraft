# backend/db/models.py
from sqlalchemy import Column, String, Text, Integer, DateTime, ForeignKey
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import declarative_base
from datetime import datetime
import uuid

Base = declarative_base()

class User(Base):
    __tablename__ = "users"
    id            = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
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