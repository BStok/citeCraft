import os
from backend.acquisition.axirvAPI import fetchArxivPapers
from backend.acquisition.axirvAPI import saveToCsv as saveA
from backend.acquisition.biorXIV import fetch_biorxiv_preprints
from backend.acquisition.biorXIV import save_to_csv as saveB
from backend.acquisition.coreAPI import fetch_core_papers
from backend.acquisition.coreAPI import save_core_to_csv as saveC
from backend.acquisition.googleScholarAPI import fetch_google_scholar_papers
from backend.acquisition.googleScholarAPI import save_to_csv as saveG
from backend.acquisition.pubMed import fetch_pubmed_articles
from backend.acquisition.pubMed import save_to_csv as saveP


def normalize(paper: dict, source: str) -> dict:
    """Normalize all source-specific key names to a consistent schema."""
    return {
        "title":            paper.get("Title") or paper.get("title"),
        "doi":              paper.get("DOI") or paper.get("doi"),
        "authors":          paper.get("Authors") or paper.get("authors"),
        "publication_date": (
            paper.get("Publication Date") or
            paper.get("publication_date") or
            paper.get("Date") or
            paper.get("date") or
            str(paper.get("Publication Year") or paper.get("year") or "")
        ),
        "abstract":         paper.get("Abstract") or paper.get("abstract"),
        "pdf_link":         (
            paper.get("PDF Link") or
            paper.get("pdf_link") or
            paper.get("PDF_Link") or
            paper.get("pdfLink")
        ),
        "citation_count":   paper.get("citation_count") or paper.get("citationCount") or paper.get("Citation Count"),
        "source":           source,
    }


def get_papers(query: str, save_csv: bool = False, csv_filename: str = "citeCraft.csv") -> list[dict]:
    """
    Fetch and normalize research papers from all sources.
    Returns a flat list of normalized paper dicts.
    """
    core_api_key   = os.environ.get("coreAPI", "")
    google_api_key = os.environ.get("googleAPI", "")

    all_papers: list[dict] = []

    # --- Arxiv ---
    try:
        arxiv_papers = fetchArxivPapers(query, max_results=5)
        normalized = [normalize(p, "arXiv") for p in arxiv_papers]
        all_papers.extend(normalized)
        if save_csv:
            saveA(arxiv_papers, filename=csv_filename)
    except Exception as e:
        print(f"Arxiv error: {e}")

    # --- bioRxiv ---
    try:
        biorxiv_papers = fetch_biorxiv_preprints(query, max_results=3)
        normalized = [normalize(p, "bioRxiv") for p in biorxiv_papers]
        all_papers.extend(normalized)
        if save_csv:
            saveB(biorxiv_papers, filename=csv_filename)
    except Exception as e:
        print(f"bioRxiv error: {e}")

    # --- CORE ---
    try:
        core_papers = fetch_core_papers(query, core_api_key, max_results=3)
        normalized = [normalize(p, "CORE") for p in core_papers]
        all_papers.extend(normalized)
        if save_csv:
            saveC(core_papers, filename=csv_filename)
    except Exception as e:
        print(f"CORE error: {e}")

    # --- Google Scholar ---
    try:
        scholar_papers = fetch_google_scholar_papers(query, google_api_key, max_results=6)
        normalized = [normalize(p, "Google Scholar") for p in scholar_papers]
        all_papers.extend(normalized)
        if save_csv:
            saveG(scholar_papers, filename=csv_filename)
    except Exception as e:
        print(f"Google Scholar error: {e}")

    # --- PubMed ---
    try:
        pubmed_papers = fetch_pubmed_articles(query, max_results=5)
        normalized = [normalize(p, "PubMed") for p in pubmed_papers]
        all_papers.extend(normalized)
        if save_csv:
            saveP(pubmed_papers, filename=csv_filename)
    except Exception as e:
        print(f"PubMed error: {e}")

    return all_papers


if __name__ == "__main__":
    query = input("Enter your research query: ")
    papers = get_papers(query, save_csv=True)
    print(f"Fetched {len(papers)} papers total.")