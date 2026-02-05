import pandas as pd
import numpy as np
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
from datetime import datetime

def rankPaper(csv_path, query,
              w_sim=0.6, w_time=0.25, w_if=0.15):
    """
    Rank papers by expected reading value.

    Weights reflect reality:
    - similarity dominates
    - recency matters
    - impact factor is a weak prior

    Returns: ranked pandas DataFrame
    """

    df = pd.read_csv(csv_path)

    # ---------- similarity ----------
    corpus = df["title"].fillna("") + " " + df["abstract"].fillna("")
    vectorizer = TfidfVectorizer(stop_words="english", max_features=5000)
    tfidf = vectorizer.fit_transform(corpus.tolist() + [query])

    sim_scores = cosine_similarity(tfidf[-1], tfidf[:-1]).flatten()
    df["sim_score"] = sim_scores

    # ---------- recency ----------
    current_year = datetime.now().year
    df["time_score"] = 1 / (1 + (current_year - df["year"]).clip(lower=0))

    # ---------- impact factor ----------
    if "impact_factor" in df.columns:
        df["if_score"] = df["impact_factor"] / df["impact_factor"].max()
    else:
        df["if_score"] = 0.0  # no pretending

    # ---------- final score ----------
    df["final_score"] = (
        w_sim * df["sim_score"] +
        w_time * df["time_score"] +
        w_if * df["if_score"]
    )

    return df.sort_values("final_score", ascending=False)
