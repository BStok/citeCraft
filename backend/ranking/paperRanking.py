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
    
    Handles capitalized column names and various CSV formats.
    
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
        logger.info(f"Loading CSV from {csv_path}")
        
        # Load CSV with lenient parsing
        try:
            df = pd.read_csv(
                csv_path,
                on_bad_lines='skip',
                engine='python',
            )
            logger.info(f"✅ Loaded CSV. Rows: {len(df)}")
        except Exception as first_error:
            logger.warning(f"Lenient parser failed: {first_error}")
            df = pd.read_csv(csv_path, on_bad_lines='skip')
            logger.info(f"✅ Loaded CSV with fallback. Rows: {len(df)}")
        
        if df.empty:
            logger.warning("CSV is empty after parsing")
            return df
        
        logger.info(f"CSV columns: {df.columns.tolist()}")
        
        # ──────────────────────────────────────────────────────────────────────────
        # NORMALIZE COLUMN NAMES TO LOWERCASE
        # Handle both 'title' and 'Title', 'abstract' and 'Abstract', etc.
        # ──────────────────────────────────────────────────────────────────────────
        
        df_cols_lower = {col: col.lower() for col in df.columns}
        df.rename(columns=df_cols_lower, inplace=True)
        
        logger.info(f"Normalized columns: {df.columns.tolist()}")
        
        # ──────────────────────────────────────────────────────────────────────────
        # Extract year from publication_date
        # ──────────────────────────────────────────────────────────────────────────
        
        current_year = datetime.now().year
        
        if "publication date" in df.columns:
            # Some CSVs use "Publication Date" with space
            df["year"] = pd.to_datetime(df["publication date"], errors="coerce").dt.year
            logger.info(f"Extracted year from 'publication date' column")
        elif "publication_date" in df.columns:
            # Some use underscore
            df["year"] = pd.to_datetime(df["publication_date"], errors="coerce").dt.year
            logger.info(f"Extracted year from 'publication_date' column")
        elif "year" not in df.columns:
            logger.warning("No year column found. Using current year for all papers.")
            df["year"] = current_year
        
        # Fill NaN years with current year
        df["year"] = df["year"].fillna(current_year)
        logger.info(f"Year range: {df['year'].min()}-{df['year'].max()}")
        
        # ──────────────────────────────────────────────────────────────────────────
        # Build corpus safely (title + abstract)
        # ──────────────────────────────────────────────────────────────────────────
        
        if "title" not in df.columns:
            logger.error(f"❌ 'title' column not found. Available: {df.columns.tolist()}")
            raise KeyError("'title' column not found in CSV")
        
        if "abstract" not in df.columns:
            logger.error(f"❌ 'abstract' column not found. Available: {df.columns.tolist()}")
            raise KeyError("'abstract' column not found in CSV")
        
        title = df["title"].fillna("").astype(str)
        abstract = df["abstract"].fillna("").astype(str)
        corpus = (title + " " + abstract).tolist()
        
        logger.info(f"Corpus built. First doc length: {len(corpus[0])} chars")
        
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
                logger.info(f"Computing TF-IDF vectors for {len(corpus)} documents...")
                tfidf = vectorizer.fit_transform(corpus + [query])
                
                # Similarity of query to each paper
                sim_scores = cosine_similarity(tfidf[-1], tfidf[:-1]).flatten()
                df["sim_score"] = sim_scores
                
                logger.info(f"✅ Similarity scores computed.")
                logger.info(f"   Mean: {sim_scores.mean():.4f}")
                logger.info(f"   Max: {sim_scores.max():.4f}")
                logger.info(f"   Min: {sim_scores.min():.4f}")
                
            except Exception as e:
                logger.error(f"Error computing similarity: {e}")
                import traceback
                traceback.print_exc()
                df["sim_score"] = 0.0
        
        # ──────────────────────────────────────────────────────────────────────────
        # Recency score (papers from this year get 1.0, older papers get lower)
        # ──────────────────────────────────────────────────────────────────────────
        
        years_ago = (current_year - df["year"]).clip(lower=0)
        df["time_score"] = 1.0 / (1.0 + years_ago)
        
        logger.info(f"✅ Time scores computed. Mean: {df['time_score'].mean():.4f}")
        
        # ──────────────────────────────────────────────────────────────────────────
        # Impact factor (if available)
        # ──────────────────────────────────────────────────────────────────────────
        
        if "impact_factor" in df.columns and df["impact_factor"].notna().sum() > 0:
            max_if = df["impact_factor"].max()
            if max_if > 0:
                df["if_score"] = (df["impact_factor"].fillna(0) / max_if).clip(0, 1)
            else:
                df["if_score"] = 0.0
            logger.info(f"✅ Impact factor scores computed. Mean: {df['if_score'].mean():.4f}")
        else:
            logger.info("ℹ️  No impact factor data available")
            df["if_score"] = 0.0
        
        # ──────────────────────────────────────────────────────────────────────────
        # Normalize and calculate final score
        # ──────────────────────────────────────────────────────────────────────────
        
        # Normalize similarity scores to [0, 1]
        if df["sim_score"].max() > 0:
            df["sim_score"] = df["sim_score"] / df["sim_score"].max()
            logger.info(f"✅ Normalized similarity scores to [0, 1]")
        
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
        
        logger.info(f"✅ Final scores computed.")
        logger.info(f"   Mean: {df['final_score'].mean():.4f}")
        logger.info(f"   Max: {df['final_score'].max():.4f}")
        
        # Sort by final score (descending)
        ranked = df.sort_values("final_score", ascending=False)
        
        logger.info(f"✅ Ranking complete! Top 5 papers:")
        for idx, (_, row) in enumerate(ranked.head(5).iterrows(), 1):
            title = row['title'][:60] if len(str(row['title'])) > 60 else row['title']
            score = row['final_score']
            logger.info(f"   {idx}. {title}... (score: {score:.4f})")
        
        return ranked
        
    except KeyError as e:
        logger.error(f"❌ Column not found: {e}")
        logger.error(f"Available columns: {df.columns.tolist()}")
        raise
    except Exception as e:
        logger.error(f"❌ Fatal error in rankPaper: {e}")
        import traceback
        traceback.print_exc()
        raise