
import os
import requests
import pandas as pd
import time

def fetch_biorxiv_preprints( query, max_results=10):

    """
    Fetch preprints from bioRxiv API with improved error handling.
    API Docs: https://api.biorxiv.org/

    The format of the endpoint is 
    https://api.biorxiv.org/details/[server]/[interval]/[cursor]/[format] 
    or https://api.biorxiv.org/details/[server]/[DOI]/na/[format]
    """
    base_url = "https://api.biorxiv.org/details/biorxiv/2024-01-01/2025-08-10/45"

    preprints = []
    cursor = 0
    
    while len(preprints) < max_results:
        params = {
            "query": query,
            "limit": min(100, max_results - len(preprints)),  # API allows max 100/request
            "skip": cursor
        }
        
        try:
            response = requests.get(base_url, params=params)
            response.raise_for_status()  # Check for HTTP errors
            
            data = response.json()
            
            # Debug: Print API response to check structure
            print(f"API Response for '{query}':", data.keys() if isinstance(data, dict) else "Invalid JSON")
            
            if not data.get("messages") or not isinstance(data["collection"], list):
                print("Unexpected API response structure. No results found.")
                break
                
            for item in data["collection"]:
                preprint = {
                    "Title": item.get("title", "N/A"),
                    "DOI": item.get("doi", "N/A"),
                    "Date": item.get("date", "N/A"),
                    "Authors": item.get("authors", "N/A"),
                    "Abstract": item.get("abstract", "N/A"),
                    "Category": item.get("category", "N/A"),
                    "PDF_Link": f"https://www.biorxiv.org/content/{item.get('doi', '')}v1.full.pdf",
                    "Source": "bioRxiv"
                }
                preprints.append(preprint)
            
            cursor += len(data["collection"])
            time.sleep(1)  # Respect API rate limits
            
            if len(data["collection"]) < params["limit"]:
                break
                
        except requests.exceptions.RequestException as e:
            print(f"Request failed: {e}")
            break
        except Exception as e:
            print(f"Unexpected error: {e}")
            break
    
    return preprints[:max_results]

def save_to_csv(preprints, filename="biorxiv_preprints.csv"):
    """Save results to CSV."""
    '''if not preprints:
        print("No preprints found to save.")
        return
    
    df = pd.DataFrame(preprints)
    df.to_csv(filename, index=False)
    print(f"Saved {len(preprints)} preprints to {filename}")'''

    #add results to file
    df = pd.DataFrame(preprints)

    #checking existense
    if os.path.isfile(filename):
        existing_df = pd.read_csv(filename)
        combined_df = pd.concat([existing_df, df], ignore_index = True)
        #removing possible duplicates
        combined_df = combined_df.drop_duplicates(subset=["DOI"], keep="last")

        #saving final combined data
        combined_df.to_csv(filename, index=False)
        print(f"Appended {len(df)} preprints to existing {filename} (now {len(combined_df)} total)")
    else:
        # Create new file
        df.to_csv(filename, index=False)
        print(f"Created new file and saved {len(df)} preprints to {filename}")
