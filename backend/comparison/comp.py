import os
from dotenv import load_dotenv
load_dotenv()
import re
import json
from huggingface_hub import InferenceClient
from backend.comparison.promptt import EXTRACTION_PROMPT
from backend.parsing.paper_parsing import pdf_to_tei_xml, process_pdf, load_xml, extract_paper, format_for_llm
from pathlib import Path


client = InferenceClient(
    api_key=os.environ["HF_TOKEN"]
)

MODEL = "Qwen/Qwen2.5-72B-Instruct"  # good HF-hosted model for extraction tasks


def extract_single_paper(xml_path: str) -> dict:
    """Runs LLM extraction on a single parsed paper. Returns structured dict."""
    root = load_xml(xml_path)
    paper_content = format_for_llm(extract_paper(root))

    prompt = EXTRACTION_PROMPT.format(paper_content=paper_content)

    response = client.chat.completions.create(
        model=MODEL,
        messages=[{"role": "user", "content": prompt}],
        max_tokens=1500,
        temperature=0.1,  # low temp = less hallucination
    )

    raw = response.choices[0].message.content.strip()

    # Strip markdown fences if model ignores instructions
    if raw.startswith("```"):
        raw = re.sub(r"^```(?:json)?\n?", "", raw)
        raw = re.sub(r"\n?```$", "", raw)

    try:
        return json.loads(raw)
    except json.JSONDecodeError as e:
        print(f"JSON parse error for {xml_path}: {e}")
        print(f"Raw response: {raw[:300]}")
        return {}


def compare_papers(pdf_or_xml_paths: list[str]) -> list[dict]:
    """
    Compares multiple papers and outputs a list of row dicts with columns:
    Metadata[authors, date] | Scope | Dataset | Methodology | Results | Additional Notes
    
    Accepts either .pdf or .tei.xml paths.
    """
    rows = []

    for path in pdf_or_xml_paths:
        path = Path(path)
        print(f"Processing: {path.name}")

        # Convert PDF to XML if needed
        if path.suffix.lower() == ".pdf":
            xml_path = Path("./parsed_xmls") / path.with_suffix(".tei.xml").name
            xml_path.parent.mkdir(parents=True, exist_ok=True)
            pdf_to_tei_xml(str(path), str(xml_path))
        else:
            xml_path = path

        extracted = extract_single_paper(str(xml_path))

        if not extracted:
            print(f"  ⚠ Skipping {path.name} — extraction failed")
            continue

        # Flatten into a table row
        row = {
            "file":             path.name,
            "authors":          extracted.get("metadata", {}).get("authors"),
            "date":             extracted.get("metadata", {}).get("date"),
            "scope":            extracted.get("scope", {}).get("value"),
            "dataset":          extracted.get("dataset", {}).get("value"),
            "methodology":      extracted.get("methodology", {}).get("value"),
            "results":          extracted.get("results", {}).get("value"),
            "additional_notes": extracted.get("additional_notes", {}).get("value"),
            # Keep source lines attached for future UI feature
            "_sources": {
                "scope":       extracted.get("scope", {}).get("source_lines"),
                "dataset":     extracted.get("dataset", {}).get("source_lines"),
                "methodology": extracted.get("methodology", {}).get("source_lines"),
                "results":     extracted.get("results", {}).get("source_lines"),
            }
        }
        rows.append(row)
        print(f"  ✓ Done: {row['authors']} ({row['date']})")

    return rows


def print_comparison_table(rows: list[dict]):
    """Quick console preview of the comparison matrix."""
    columns = ["file", "authors", "date", "scope", "dataset", "methodology", "results", "additional_notes"]
    for i, row in enumerate(rows, 1):
        print(f"\n{'='*60}")
        print(f"Paper {i}: {row['file']}")
        print(f"{'='*60}")
        for col in columns:
            val = row.get(col) or "—"
            print(f"  {col.upper():<20} {val[:120]}")  # truncate long values for display


