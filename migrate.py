import os
from sqlalchemy import create_engine
from backend.db.db import engine, Base
# IMPORTANT: You must import your models so SQLAlchemy knows they exist!
# Replace 'User, Document' with your actual class names from models.py
from backend.db.models import User, Paper, Comparison, ComparisonPaper, Collection, CollectionPaper, PaperChunk


def sync():
    print("Connecting to Supabase...")
    try:
        # This checks the connection and creates tables
        Base.metadata.create_all(bind=engine)
        print("Done! Tables created successfully.")
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    sync()