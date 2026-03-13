import requests
import pandas as pd
from datetime import datetime
import time

def fetch_core_papers(query, api_key, max_results=10):
 
    base_url = "https://api.core.ac.uk/v3/search/works"
    headers = {"Authorization": f"Bearer {api_key}"}
    papers = []
    page = 1
    results_per_page = min(100, max_results)  

    while len(papers) < max_results:
        params = {
            "q": query,
            "limit": results_per_page,
            "offset": (page - 1) * results_per_page,
            "fields": "title,doi,authors,abstract,year,downloadUrl"  
        }

        try:
            response = requests.get(base_url, headers=headers, params=params)
            response.raise_for_status()
            data = response.json()

            if not data.get("results"):
                print("No more results found.")
                break

            for result in data["results"]:
                paper = {
                    "Title": result.get("title", "N/A"),
                    "DOI": result.get("doi", "N/A"),
                    "Publication Year": result.get("year", "N/A"),
                    "Abstract": result.get("abstract", "N/A"),
                    "Authors": ", ".join([author.get("name", "N/A") for author in result.get("authors", [])]),
                    "PDF Link": result.get("downloadUrl", "N/A"),
                    "Source": "CORE"
                }
                papers.append(paper)

            page += 1
            time.sleep(1)  # Respect API rate limits

        except requests.exceptions.RequestException as e:
            print(f"API request failed: {e}")
            break

    return papers[:max_results]

def save_core_to_csv(papers, filename="biorxiv_preprints.csv"):
    """Save papers to a CSV file."""
    if not papers:
        print("No papers to save.")
        return

    df = pd.DataFrame(papers)
    df.to_csv(filename, mode='a', index=False, encoding='utf-8')
    print(f"Saved {len(papers)} papers to {filename}")
