#biomedical literature
import requests
import pandas as pd
import time
from datetime import datetime
from xml.etree import ElementTree as ET

def fetch_pubmed_articles(query, api_key=None, max_results=10):
    """
    Fetch research articles from PubMed using Entrez API.
    Docs: https://www.ncbi.nlm.nih.gov/books/NBK25499/
    """
    base_url = "https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi"
    fetch_url = "https://eutils.ncbi.nlm.nih.gov/entrez/eutils/efetch.fcgi"
    articles = []
    
    # Step 1: Search PubMed to get article IDs
    search_params = {
        "db": "pubmed",
        "term": query,
        "retmax": max_results,
        "retmode": "json",
        "api_key": api_key
    }
    
    try:
        # Get list of article IDs matching the query
        search_response = requests.get(base_url, params=search_params)
        search_response.raise_for_status()
        search_data = search_response.json()
        
        if "esearchresult" not in search_data or "idlist" not in search_data["esearchresult"]:
            print("No results found for query.")
            return articles
            
        id_list = search_data["esearchresult"]["idlist"]
        if not id_list:
            return articles
            
        # Step 2: Fetch details for each article
        fetch_params = {
            "db": "pubmed",
            "id": ",".join(id_list),
            "retmode": "xml",
            "api_key": api_key
        }
        
        fetch_response = requests.get(fetch_url, params=fetch_params)
        fetch_response.raise_for_status()
        root = ET.fromstring(fetch_response.content)
        
        for article in root.findall(".//PubmedArticle"):
            # Extract article details
            title = article.findtext(".//ArticleTitle", "N/A").strip()
            abstract = article.findtext(".//AbstractText", "N/A").strip()
            pub_date = article.find(".//PubDate")
            date_str = "N/A"
            
            if pub_date is not None:
                year = pub_date.findtext("Year", "").strip()
                month = pub_date.findtext("Month", "").strip()
                day = pub_date.findtext("Day", "").strip()
                if year:
                    date_str = f"{year}-{month.zfill(2)}-{day.zfill(2)}" if month and day else year
            
            authors = []
            for author in article.findall(".//Author"):
                last_name = author.findtext("LastName", "").strip()
                fore_name = author.findtext("ForeName", "").strip()
                if last_name:
                    authors.append(f"{fore_name} {last_name}".strip())
            
            doi = "N/A"
            article_id_list = article.findall(".//ArticleId")
            for article_id in article_id_list:
                if article_id.get("IdType", "") == "doi":
                    doi = article_id.text.strip()
                    break
            
            articles.append({
                "Title": title,
                "DOI": doi,
                "Publication Date": date_str,
                "Abstract": abstract,
                "Authors": ", ".join(authors) if authors else "N/A",
                "PubMed ID": article.findtext(".//PMID", "N/A").strip(),
                "Source": "PubMed"
            })
            
            if len(articles) >= max_results:
                break
                
    except requests.exceptions.RequestException as e:
        print(f"API request failed: {e}")
    except ET.ParseError as e:
        print(f"XML parsing error: {e}")
        
    return articles[:max_results]

def save_to_csv(articles, filename="biorxiv_preprints.csv"):
    """Save articles to CSV."""
    if not articles:
        print("No articles to save.")
        return
        
    df = pd.DataFrame(articles)
    df.to_csv(filename,mode='a',  index=False, encoding='utf-8')
    print(f"Saved {len(articles)} articles to {filename}")

if __name__ == "__main__":
    # User input
    query = input("Enter your research query: ")
    api_key = None  # Optional: Replace with your NCBI API key for higher rate limits
    max_results = int(input("Max results (default 10): ") or 10)
    
    # Fetch and save articles
    articles = fetch_pubmed_articles(query, api_key, max_results)
    save_to_csv(articles)