import pandas as pd
import numpy as np
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
from datetime import datetime
import logging
import io

logger = logging.getLogger(__name__)

def rankPaper(csv_path, query, w_sim=0.6, w_time=0.25, w_if=0.15):
    """
    Rank papers by similarity to query.
    
    Handles CSV parsing errors gracefully.
    
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
        # ──────────────────────────────────────────────────────────────────────────
        # ISSUE: CSV has inconsistent field counts (e.g., 7 fields on line 1, 8 on line 10)
        # This happens when fields contain commas or newlines
        # ──────────────────────────────────────────────────────────────────────────
        
        logger.info(f"Loading CSV from {csv_path}")
        
        # Try reading with different quote/escape strategies
        try:
            # First attempt: use quoting
            df = pd.read_csv(
                csv_path,
                on_bad_lines='skip',  # Skip lines with inconsistent field counts
                engine='python',  # More lenient parser
                quoting=3,  # QUOTE_NONE with escapechar
                escapechar='\\'
            )
            logger.info(f"✅ Loaded CSV using lenient parser. Rows: {len(df)}")
        except Exception as first_error:
            logger.warning(f"Lenient parser failed: {first_error}. Trying fallback...")
            
            # Fallback: try with default C engine but skip bad lines
            try:
                df = pd.read_csv(
                    csv_path,
                    on_bad_lines='skip'  # Skip problematic lines
                )
                logger.info(f"✅ Loaded CSV with on_bad_lines='skip'. Rows: {len(df)}")
            except Exception as second_error:
                logger.error(f"Both parsers failed: {second_error}")
                raise
        
        if df.empty:
            logger.warning("CSV is empty after parsing")
            return df
        
        logger.info(f"CSV columns: {df.columns.tolist()}")
        logger.info(f"CSV shape: {df.shape}")
        
        # ──────────────────────────────────────────────────────────────────────────
        # Extract year from publication_date
        # ──────────────────────────────────────────────────────────────────────────
        
        if "publication_date" in df.columns:
            df["year"] = pd.to_datetime(df["publication_date"], errors="coerce").dt.year
            logger.info(f"Extracted year from publication_date. Years range: {df['year'].min()}-{df['year'].max()}")
        elif "year" not in df.columns:
            logger.warning("No 'year' or 'publication_date' column found. Using current year.")
            df["year"] = datetime.now().year
        
        # Fill NaN years with current year
        current_year = datetime.now().year
        df["year"] = df["year"].fillna(current_year)
        
        # ──────────────────────────────────────────────────────────────────────────
        # Build corpus safely
        # ──────────────────────────────────────────────────────────────────────────
        
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
                    min_df=1,
                    ngram_range=(1, 2)
                )
                
                # Fit on corpus + query
                tfidf = vectorizer.fit_transform(corpus + [query])
                
                # Similarity of query to each paper
                sim_scores = cosine_similarity(tfidf[-1], tfidf[:-1]).flatten()
                df["sim_score"] = sim_scores
                
                logger.info(f"✅ Similarity scores computed. Mean: {sim_scores.mean():.4f}, Max: {sim_scores.max():.4f}")
            except Exception as e:
                logger.error(f"Error computing similarity: {e}")
                df["sim_score"] = 0.0
        
        # ──────────────────────────────────────────────────────────────────────────
        # Recency score
        # ──────────────────────────────────────────────────────────────────────────
        
        years_ago = (current_year - df["year"]).clip(lower=0)
        df["time_score"] = 1.0 / (1.0 + years_ago)
        
        logger.info(f"✅ Time scores computed. Mean: {df['time_score'].mean():.4f}")
        
        # ──────────────────────────────────────────────────────────────────────────
        # Impact factor
        # ──────────────────────────────────────────────────────────────────────────
        
        if "impact_factor" in df.columns and df["impact_factor"].notna().sum() > 0:
            max_if = df["impact_factor"].max()
            if max_if > 0:
                df["if_score"] = (df["impact_factor"].fillna(0) / max_if).clip(0, 1)
            else:
                df["if_score"] = 0.0
            logger.info(f"✅ Impact factor scores computed. Mean: {df['if_score'].mean():.4f}")
        else:
            logger.warning("No impact factor data available")
            df["if_score"] = 0.0
        
        # ──────────────────────────────────────────────────────────────────────────
        # Normalize and calculate final score
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
        
        logger.info(f"✅ Final scores computed. Mean: {df['final_score'].mean():.4f}, Max: {df['final_score'].max():.4f}")
        logger.info(f"✅ Ranking complete! Top 3 papers:")
        
        ranked = df.sort_values("final_score", ascending=False)
        for idx, (_, row) in enumerate(ranked.head(3).iterrows(), 1):
            logger.info(f"   {idx}. {row['title'][:60]}... (score: {row['final_score']:.4f})")
        
        # Sort by final score (descending)
        return ranked
        
    except Exception as e:
        logger.error(f"❌ Fatal error in rankPaper: {e}")
        import traceback
        traceback.print_exc()
        raise