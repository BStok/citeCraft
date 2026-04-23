import pandas as pd
import numpy as np
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
from datetime import datetime
import logging

logger = logging.getLogger(__name__)

def rankPaper(csv_path, query, w_sim=0.6, w_time=0.25, w_if=0.15):
    """
    Rank papers by similarity to query.
    
    Weights reflect reality:
    - similarity dominates (0.6)
    - recency matters (0.25)
    - impact factor is a weak prior (0.15)
    
    Args:
        csv_path: Path to CSV file with papers
        query: Search query string
        w_sim: Weight for similarity score (default 0.6)
        w_time: Weight for recency score (default 0.25)
        w_if: Weight for impact factor score (default 0.15)
    
    Returns:
        Ranked pandas DataFrame sorted by final_score (descending)
    """
    
    try:
        df = pd.read_csv(csv_path)
        logger.info(f"Loaded {len(df)} papers from {csv_path}")
    except FileNotFoundError:
        logger.error(f"CSV file not found: {csv_path}")
        raise
    except Exception as e:
        logger.error(f"Error reading CSV: {e}")
        raise
    
    if df.empty:
        logger.warning("CSV is empty")
        return df
    
    # ──────────────────────────────────────────────────────────────────────────
    # ISSUE 1: "year" column may not exist
    # The CSV from get_papers() uses "publication_date", not "year"
    # ──────────────────────────────────────────────────────────────────────────
    
    # Extract year from publication_date if it exists
    if "publication_date" in df.columns:
        df["year"] = pd.to_datetime(df["publication_date"], errors="coerce").dt.year
    elif "year" not in df.columns:
        logger.warning("No 'year' or 'publication_date' column found. Using current year for all papers.")
        df["year"] = datetime.now().year
    
    # Fill NaN years with current year (so recency score doesn't break)
    current_year = datetime.now().year
    df["year"] = df["year"].fillna(current_year)
    
    # ──────────────────────────────────────────────────────────────────────────
    # ISSUE 2: Missing or NaN values in title/abstract crash vectorizer
    # ──────────────────────────────────────────────────────────────────────────
    
    # Build corpus safely
    title = df["title"].fillna("").astype(str)
    abstract = df["abstract"].fillna("").astype(str)
    corpus = (title + " " + abstract).tolist()
    
    # Remove empty documents
    if all(not doc.strip() for doc in corpus):
        logger.warning("All documents are empty. Cannot compute similarity.")
        df["sim_score"] = 0.0
    else:
        try:
            vectorizer = TfidfVectorizer(
                stop_words="english",
                max_features=5000,
                min_df=1,  # Include rare terms (helps with niche queries)
                ngram_range=(1, 2)  # Unigrams + bigrams for better matching
            )
            
            # Fit on corpus + query
            tfidf = vectorizer.fit_transform(corpus + [query])
            
            # Similarity of query to each paper
            sim_scores = cosine_similarity(tfidf[-1], tfidf[:-1]).flatten()
            df["sim_score"] = sim_scores
            
            logger.info(f"Similarity scores computed. Mean: {sim_scores.mean():.4f}, Max: {sim_scores.max():.4f}")
        except Exception as e:
            logger.error(f"Error computing similarity: {e}")
            df["sim_score"] = 0.0
    
    # ──────────────────────────────────────────────────────────────────────────
    # ISSUE 3: Time score calculation with NaN years
    # ──────────────────────────────────────────────────────────────────────────
    
    # Recency score: older papers get lower scores
    # Papers from this year: 1.0
    # Papers from 10 years ago: ~0.09
    years_ago = (current_year - df["year"]).clip(lower=0)
    df["time_score"] = 1.0 / (1.0 + years_ago)
    
    logger.info(f"Time scores computed. Mean: {df['time_score'].mean():.4f}")
    
    # ──────────────────────────────────────────────────────────────────────────
    # ISSUE 4: Impact factor handling
    # Many papers won't have this field, so handle gracefully
    # ──────────────────────────────────────────────────────────────────────────
    
    if "impact_factor" in df.columns and df["impact_factor"].notna().sum() > 0:
        # Normalize to [0, 1]
        max_if = df["impact_factor"].max()
        if max_if > 0:
            df["if_score"] = (df["impact_factor"].fillna(0) / max_if).clip(0, 1)
        else:
            df["if_score"] = 0.0
        logger.info(f"Impact factor scores computed. Mean: {df['if_score'].mean():.4f}")
    else:
        logger.warning("No impact factor data available")
        df["if_score"] = 0.0
    
    # ──────────────────────────────────────────────────────────────────────────
    # ISSUE 5: Final score calculation
    # Make sure all components are normalized to [0, 1]
    # ──────────────────────────────────────────────────────────────────────────
    
    # Normalize similarity scores to [0, 1]
    if df["sim_score"].max() > 0:
        df["sim_score"] = df["sim_score"] / df["sim_score"].max()
    
    # Verify weights sum to 1
    total_weight = w_sim + w_time + w_if
    if total_weight != 1.0:
        logger.warning(f"Weights sum to {total_weight}, not 1.0. Normalizing.")
        w_sim /= total_weight
        w_time /= total_weight
        w_if /= total_weight
    
    # Calculate final score
    df["final_score"] = (
        w_sim * df["sim_score"] +
        w_time * df["time_score"] +
        w_if * df["if_score"]
    )
    
    logger.info(f"Final scores computed. Mean: {df['final_score'].mean():.4f}, Max: {df['final_score'].max():.4f}")
    
    # Sort by final score (descending)
    return df.sort_values("final_score", ascending=False)