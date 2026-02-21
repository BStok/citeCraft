import os
import feedparser
import csv
import requests
from urllib.parse import quote
import time
from datetime import datetime

def fetchArxivPapers(query, max_results=10):
    base_url = "http://export.arxiv.org/api/query?"
    url = f"{base_url}search_query=all:{quote(query)}&start=0&max_results={max_results}"
    
    try:
        time.sleep(3)  # Rate limiting
        response = requests.get(url, timeout=10)
        response.raise_for_status()  # Check for HTTP errors
        feed = feedparser.parse(response.content)
    except Exception as e:
        print(f"Error: {e}")
        return []
    
    papers = []
    
    for entry in feed.entries:
        # Extract DOI (sometimes it's in the link)
        doi = None
        for link in entry.links:
            if 'doi.org' in link.href:
                doi = link.href.split('doi.org/')[-1]
        
        authors = []
        authors = ", ".join(author.name for author in entry.authors)
        
        paper = {
            "Title": entry.title,
            "DOI": doi if doi else "N/A",  # Some arXiv papers may not have a DOI
            "Authors" : authors,
            "Publication Date": datetime.strptime(entry.published, "%Y-%m-%dT%H:%M:%SZ").strftime("%Y-%m-%d"),
            "Abstract": entry.summary.replace("\n", " ").strip(),
            "arXiv ID": entry.id.split('/')[-1],  # Optional: Include arXiv ID
            "PDF Link": [link.href for link in entry.links if link.type == 'application/pdf'][0],  # Optional
        }
        papers.append(paper)
    
    return papers

'''def saveToCsv(papers, filename="arxiv_papers.csv"):
    """Save the extracted papers to a CSV file."""
    if not papers:
        print("No papers found.")
        return
    
    keys = papers[0].keys()
    with open(filename, 'w', newline='', encoding='utf-8') as f:
        writer = csv.DictWriter(f, fieldnames=keys)
        writer.writeheader()
        writer.writerows(papers)
    print(f"Saved {len(papers)} papers to {filename}.")'''


def saveToCsv(papers, filename="biorxiv_preprints.csv"):
    """Save the extracted papers to a CSV file, appending if file exists."""
    if not papers:
        print("No papers found.")
        return
    
    # Get fieldnames from the first paper
    keys = papers[0].keys()
    
    # Check if file exists
    file_exists = os.path.isfile(filename)
    
    with open(filename, 'a' if file_exists else 'w', newline='', encoding='utf-8') as f:
        writer = csv.DictWriter(f, fieldnames=keys)
        
        # Write header only if creating new file
        if not file_exists:
            writer.writeheader()
        
        writer.writerows(papers)
    
    action = "Appended" if file_exists else "Saved"
    print(f"{action} {len(papers)} papers to {filename}.")

# Example usage
if __name__ == "__main__":
    
    search_query = input("What are you researching today ?\n ")
    max_results = int(input("Enter max number of results (default 10): ") or 10)
    
    papers = fetchArxivPapers(search_query, max_results)
    saveToCsv(papers,filename="arxivAuthorCheck.csv")