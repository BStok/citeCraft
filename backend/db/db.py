import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from backend.db.models import Base
from dotenv import load_dotenv

load_dotenv()

# Use single DATABASE_URL if available (Railway), otherwise build from parts (local)
DATABASE_URL = os.environ.get("DATABASE_URL")

if DATABASE_URL:
    # Railway uses postgres:// but SQLAlchemy needs postgresql://
    if DATABASE_URL.startswith("postgres://"):
        DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)
else:
    # Local dev fallback
    DATABASE_URL = (
        f"postgresql://{os.environ.get('DB_USER', 'postgres')}:"
        f"{os.environ.get('DB_PASSWORD')}@"
        f"{os.environ.get('DB_HOST', 'localhost')}:"
        f"{os.environ.get('DB_PORT', '5432')}/"
        f"{os.environ.get('DB_NAME', 'citecraft')}"
    )

engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(bind=engine)

def init_db():
    """Creates all tables if they don't exist."""
    Base.metadata.create_all(engine)

def get_db():
    """Returns a DB session. Use as context manager."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()