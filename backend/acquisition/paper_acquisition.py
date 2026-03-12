#gets research papers from all the libraries
#- [ ]  Arxiv
#- [ ]  biorxiv
#- [ ]  core
#- [ ]  scholar
#- [ ]  pubmed

import os

#import functions from axirv
from backend.acquisition.axirvAPI import fetchArxivPapers
from backend.acquisition.axirvAPI import saveToCsv as saveA

#import functions from biorxiv
from backend.acquisition.biorXIV import fetch_biorxiv_preprints
from backend.acquisition.biorXIV import save_to_csv as saveB

##import functions from core
from backend.acquisition.coreAPI import fetch_core_papers
from backend.acquisition.coreAPI import save_core_to_csv as saveC

##import functions from google scholar
from backend.acquisition.googleScholarAPI import fetch_google_scholar_papers
from backend.acquisition.googleScholarAPI import extract_doi
from backend.acquisition.googleScholarAPI import parse_scholar_date
from backend.acquisition.googleScholarAPI import save_to_csv as saveG

##import functions from pubmed
from backend.acquisition.pubMed import fetch_pubmed_articles
from backend.acquisition.pubMed import save_to_csv as saveP

def get_papers(query: str, save_csv: bool = False, csv_filename: str = "citeCraft.csv") -> list[dict]:
    """
    Fetch research papers from all sources for a given query.
 
    Args:
        query:        The research query string.
        save_csv:     If True, also persist results to a CSV file.
        csv_filename: Path/name of the CSV file (used only when save_csv=True).
 
    Returns:
        A flat list of paper dicts from all sources.
    """

    # keys
    core_API = os.environ["coreAPI"]
    googleAPIKey = os.environ["googleAPI"]

    
    all_papers: list[dict] = []

    # --- Arxiv ---
    arxiv_papers = fetchArxivPapers(query, max_results=5)
    all_papers.extend(arxiv_papers)
    if save_csv:
        saveA(arxiv_papers, filename=csv_filename)
 
    # --- bioRxiv ---
    biorxiv_papers = fetch_biorxiv_preprints(query, max_results=3)
    all_papers.extend(biorxiv_papers)
    if save_csv:
        saveB(biorxiv_papers, filename=csv_filename)
 
    # --- CORE ---
    core_papers = fetch_core_papers(query, core_api_key, max_results=3)
    all_papers.extend(core_papers)
    if save_csv:
        saveC(core_papers, filename=csv_filename)
 
    # --- Google Scholar ---
    scholar_papers = fetch_google_scholar_papers(query, google_api_key, max_results=6)
    all_papers.extend(scholar_papers)
    if save_csv:
        saveG(scholar_papers, filename=csv_filename)
 
    # --- PubMed ---
    pubmed_papers = fetch_pubmed_articles(query, max_results=5)
    all_papers.extend(pubmed_papers)
    if save_csv:
        saveP(pubmed_papers, filename=csv_filename)
 
    return all_papers

if __name__ == "__main__":
    query = input("Enter your research query: ")
    papers = get_papers(query, save_csv=True)
    print(f"Fetched {len(papers)} papers total.")