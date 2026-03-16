print("starts here")
import re
from pathlib import Path
from typing import Optional
import pypdf
from dotenv import load_dotenv
print("updated")
load_dotenv()

# ─── Section Detection ────────────────────────────────────────────────────────

# Common academic paper section headers — order matters (more specific first)
SECTION_PATTERNS = [
    (r"\babstract\b",                          "abstract"),
    (r"\bintroduction\b",                      "introduction"),
    (r"\brelated\s+work\b",                    "related_work"),
    (r"\bliterature\s+review\b",               "related_work"),
    (r"\bbackground\b",                        "background"),
    (r"\bmethodology\b|\bmethods?\b",          "methodology"),
    (r"\bexperiments?\b|\bexperimental\b",     "experiments"),
    (r"\bdatasets?\b|\bdata\b",                "dataset"),
    (r"\bresults?\b",                          "results"),
    (r"\bdiscussion\b",                        "discussion"),
    (r"\bconclusion\b|\bconclusions\b",        "conclusion"),
    (r"\blimitations?\b",                      "limitations"),
    (r"\breferences?\b|\bbibliography\b",      "references"),
    (r"\backnowledg",                          "acknowledgements"),
    (r"\bappendix\b",                          "appendix"),
]

# Compiled patterns for speed
COMPILED_PATTERNS = [
    (re.compile(pat, re.IGNORECASE), label)
    for pat, label in SECTION_PATTERNS
]

CHUNK_SIZE   = 300   # target tokens per chunk
CHUNK_OVERLAP = 50   # overlap between chunks


def detect_section(line: str) -> Optional[str]:
    """
    Check if a line looks like a section header.
    Returns section label or None.
    """
    stripped = line.strip()

    # Section headers are usually short (< 60 chars) and not full sentences
    if not stripped or len(stripped) > 60 or stripped.endswith("."):
        return None

    # Must match one of our known patterns
    for pattern, label in COMPILED_PATTERNS:
        if pattern.search(stripped):
            return label

    return None


def naive_tokenize(text: str) -> list[str]:
    """Split text into tokens (words + punctuation). Approx token count."""
    return text.split()


def chunk_text(text: str, chunk_size: int = CHUNK_SIZE, overlap: int = CHUNK_OVERLAP) -> list[str]:
    """
    Split text into overlapping token chunks.
    Returns list of chunk strings.
    """
    tokens = naive_tokenize(text)
    if not tokens:
        return []

    chunks = []
    start = 0
    while start < len(tokens):
        end = min(start + chunk_size, len(tokens))
        chunk = " ".join(tokens[start:end])
        chunks.append(chunk)
        if end == len(tokens):
            break
        start += chunk_size - overlap

    return chunks


def extract_text_from_pdf(pdf_path: str) -> str:
    """Extract raw text from a PDF using pypdf."""
    path = Path(pdf_path)
    if not path.exists():
        raise FileNotFoundError(f"PDF not found: {pdf_path}")

    text_parts = []
    with open(path, "rb") as f:
        reader = pypdf.PdfReader(f)
        for page in reader.pages:
            page_text = page.extract_text()
            if page_text:
                text_parts.append(page_text)

    return "\n".join(text_parts)


def parse_pdf_into_chunks(pdf_path: str) -> list[dict]:
    """
    Full pipeline:
      1. Extract text from PDF
      2. Detect sections by scanning lines for headers
      3. Split each section into token chunks with overlap
      4. Return list of chunk dicts with metadata

    Returns:
        List of dicts:
        {
            "section":      str,   # e.g. "methodology"
            "chunk_index":  int,   # index within section
            "text":         str,   # chunk text
            "token_count":  int,   # approx tokens
        }
    """
    raw_text = extract_text_from_pdf(pdf_path)
    lines = raw_text.split("\n")

    # ── Step 1: Split into sections ──────────────────────────────────────────
    sections: dict[str, list[str]] = {}   # section_label -> list of text lines
    current_section = "preamble"          # text before any detected header
    sections[current_section] = []

    for line in lines:
        detected = detect_section(line)
        if detected:
            # Start a new section
            current_section = detected
            if current_section not in sections:
                sections[current_section] = []
            # Don't add the header line itself to the content
        else:
            sections[current_section].append(line)

    # ── Step 2: Chunk each section ───────────────────────────────────────────
    all_chunks: list[dict] = []

    # Skip references/acknowledgements — not useful for RAG
    skip_sections = {"references", "acknowledgements", "appendix"}

    for section_label, section_lines in sections.items():
        if section_label in skip_sections:
            continue

        section_text = " ".join(
            line.strip() for line in section_lines if line.strip()
        )

        if not section_text:
            continue

        chunks = chunk_text(section_text)
        for idx, chunk in enumerate(chunks):
            all_chunks.append({
                "section":     section_label,
                "chunk_index": idx,
                "text":        chunk,
                "token_count": len(naive_tokenize(chunk)),
            })

    return all_chunks


if __name__ == "__main__":
    import sys
    import json

    if len(sys.argv) < 2:
        print("Usage: python pdf_parser.py <path_to_pdf>")
        sys.exit(1)

    chunks = parse_pdf_into_chunks(sys.argv[1])
    print(f"Total chunks: {len(chunks)}")
    for c in chunks[:5]:
        print(json.dumps(c, indent=2))