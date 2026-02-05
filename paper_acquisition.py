#gets research papers from all the libraries
#- [ ]  Arxiv
#- [ ]  biorxiv
#- [ ]  core
#- [ ]  scholar
#- [ ]  pubmed

import os

#import functions from axirv
from axirvAPI import fetchArxivPapers
from axirvAPI import saveToCsv as saveA

#import functions from biorxiv
from biorXIV import fetch_biorxiv_preprints
from biorXIV import save_to_csv as saveB

##import functions from core
from coreAPI import fetch_core_papers
from coreAPI import save_core_to_csv as saveC
core_API = os.environ["coreAPI"]

##import functions from google scholar
from googleScholarAPI import fetch_google_scholar_papers
from googleScholarAPI import extract_doi
from googleScholarAPI import parse_scholar_date
from googleScholarAPI import save_to_csv as saveG
googleAPIKey = os.environ["googleAPI"]

##import functions from pubmed
from pubMed import fetch_pubmed_articles
from pubMed import save_to_csv as saveP


if __name__ == "__main__":
    # User input
    query = input("Enter your research query:")
    SaveDir="citeCradtt.csv"

    #Fetch and save papers from axirv
    papers = fetchArxivPapers(query, max_results=5)
    saveA(papers,filename=SaveDir)

    #Fetch from biorXIV
    biorxivPreprints = fetch_biorxiv_preprints(query, max_results=3)
    saveB(biorxivPreprints, filename=SaveDir)

    #Fetch from core
    corePapers = fetch_core_papers(query,core_API,max_results=3 )
    saveC(corePapers, filename=SaveDir)

    #Fetch from google schoalr
    googleScholarPapers = fetch_google_scholar_papers(query, googleAPIKey, max_results=6 )
    saveG(googleScholarPapers, filename=SaveDir)

    #pubmed_articles = fetch_pubmed_articles(query)
    pubmedArticles = fetch_pubmed_articles(query,max_results=5)
    saveP(pubmedArticles, filename=SaveDir)
