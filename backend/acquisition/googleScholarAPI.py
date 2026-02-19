
import requests
import pandas as pd
import time
from datetime import datetime

def extract_doi(result):
    """Extract DOI from various possible fields in the result"""
    if result.get("inline_links", {}).get("doi", {}).get("link"):
        return result["inline_links"]["doi"]["link"].replace("https://doi.org/", "")
    return "N/A"

def parse_scholar_date(date_str):
    """Parse Google Scholar's date format (e.g., '2023 - Journal name')"""
    if not date_str:
        return "N/A"
    try:
        year = date_str.split(" - ")[0].strip()
        if year.isdigit():
            return f"{year}-01-01"  # Default to Jan 1 if only year is available
        return "N/A"
    except:
        return "N/A"

def fetch_google_scholar_papers(query, api_key, max_results=10):
   
    base_url = "https://serpapi.com/search.json"
    papers = []
    start = 0
    
    while len(papers) < max_results:
        params = {
            "engine": "google_scholar",
            "q": query,
            "api_key": api_key,
            "start": start,
            "num": min(20, max_results - len(papers))  # Google Scholar returns max 20 per page
        }
        
        try:
            response = requests.get(base_url, params=params)
            response.raise_for_status()
            data = response.json()
            
            if "organic_results" not in data:
                print("No results found or API error")
                break
                
            for result in data["organic_results"]:
                try:
                    authors = "N/A"
                    pub_info = result.get("publication_info", {})
                    if pub_info and "authors" in pub_info:
                        author_list = [author.get("name", "") for author in pub_info["authors"] if isinstance(author, dict)]
                        authors = ", ".join(filter(None, author_list)) if author_list else "N/A"
                except:
                    authors = "N/A"
                
                
                paper = {
                    "Title": result.get("title", "N/A"),
                    "DOI": extract_doi(result),
                    "Publication Date": parse_scholar_date(result.get("publication_info", {}).get("summary", "")),
                    "Abstract": result.get("snippet", "N/A"),
                    "Authors": authors,
                    "Citation Count": result.get("inline_links", {}).get("cited_by", {}).get("total", "N/A"),
                    "PDF Link": result.get("inline_links", {}).get("pdf", {}).get("link", "N/A"),
                    "Source": "Google Scholar"
                }
                papers.append(paper)
                
            start += len(data["organic_results"])
            time.sleep(2)  
            
            if "serpapi_pagination" not in data or "next" not in data["serpapi_pagination"]:
                break  
                
        except requests.exceptions.RequestException as e:
            print(f"API request failed: {e}")
            break
            
    return papers[:max_results]





def save_to_csv(papers, filename="biorxiv_preprints.csv"):
    """Save papers to CSV file"""
    if not papers:
        print("No papers to save")
        return
        
    df = pd.DataFrame(papers)
    df.to_csv(filename,mode='a', index=False, encoding='utf-8')
    print(f"Saved {len(papers)} papers to {filename}")

if __name__ == "__main__":
    # Get user input
    query = input("What are you researching today ? \n")
    api_key = "8cbb556b1ada1c075f1d9a78922bf952f6f9f7b626a07f8583515cd5652bad4a"
    max_results = int(input("Enter max number of results (default 10): ") or 10)
    
    # Fetch and save papers
    papers = fetch_google_scholar_papers(query, api_key, max_results)
    save_to_csv(papers)