import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from dotenv import load_dotenv

# Ensure the Base is imported so it's available for init_db
from backend.db.models import Base 

load_dotenv()

DATABASE_URL = os.environ.get("DATABASE_URL")

# Basic cleanup for Railway/Supabase compatibility
if DATABASE_URL:
    if DATABASE_URL.startswith("postgres://"):
        DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)

# Create the engine
engine = create_engine(
    DATABASE_URL,
    # This helps with the 'pooler' connection by keeping the connection alive
    pool_pre_ping=True
)
SessionLocal = sessionmaker(bind=engine)

def init_db():
    """Creates all tables if they don't exist."""
    # This is the line that actually talks to Supabase
    Base.metadata.create_all(bind=engine)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()