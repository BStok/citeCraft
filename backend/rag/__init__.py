# backend/rag/embedder.py
import os
from typing import Union
from huggingface_hub import InferenceClient

# ─── Client setup ─────────────────────────────────────────────────────────────

client = InferenceClient(api_key=os.environ.get("HF_TOKEN"))

# allenai/specter is the lighter, faster version — good for free tier
# switch to allenai/specter2 if you upgrade HF plan
EMBEDDING_MODEL = "sentence-transformers/allenai-specter"


def embed_text(text: str) -> list[float]:
    """
    Generate a single embedding vector for a text string.
    Returns a list of floats (768 dimensions for specter).
    """
    # Truncate to avoid token limit issues (specter max is 512 tokens)
    words = text.split()
    if len(words) > 400:
        text = " ".join(words[:400])

    response = client.feature_extraction(
        text,
        model=EMBEDDING_MODEL,
    )

    # HF returns nested list for batches — flatten if needed
    if isinstance(response[0], list):
        return response[0]
    return list(response)


def embed_batch(texts: list[str], batch_size: int = 8) -> list[list[float]]:
    """
    Generate embeddings for a list of texts in batches.
    Returns list of embedding vectors.
    """
    all_embeddings = []

    for i in range(0, len(texts), batch_size):
        batch = texts[i:i + batch_size]
        for text in batch:
            try:
                embedding = embed_text(text)
                all_embeddings.append(embedding)
            except Exception as e:
                print(f"Embedding failed for chunk {i}: {e}")
                # Append zero vector as fallback so indices stay aligned
                all_embeddings.append([0.0] * 768)

    return all_embeddings


if __name__ == "__main__":
    test = "This paper proposes a novel methodology for fairness-aware loan approval."
    vec = embed_text(test)
    print(f"Embedding dim: {len(vec)}")
    print(f"First 5 values: {vec[:5]}")