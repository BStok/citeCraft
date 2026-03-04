### CiteCraft

CiteCraft is a research workflow tool for discovering, comparing, and analyzing academic papers through a structured backend pipeline.

The system is currently CLI-driven and organized by functionality inside the backend directory.

## Functionalities
  1. Paper Discovery & Extraction:  Search and retrieve relevant academic papers based on a user query.
     citeCraft/backend/acquisition/paper_acquisition.py

     The CLI will prompt for keywords or a query (can be vague).
     The script refines the query to academically relevant keywords and returns a ranked CSV file (up to 10 results) containing:
    
      Paper Metadata [Author, Journal, Date of Publishing]
      DOI
      Downloadable links (if available)
      
      Output: Ranked CSV file of relevant papers.

  2. Paper Comparison : Compare multiple research papers and generate structured insights.
                        Steps:
                         1. Add all PDFs to a folder.
                         2. Run: citeCraft/backend/comp/paper_comparison.py
                         3. Provide the folder path when prompted.
     The script parses all papers and generates a CSV containing:
      -Extracted metadata
      -Key metrics
      -Comparative analysis
      -Remarks across papers
      
      Output: Detailed comparison CSV.

  3. Paper Analysis & Understanding: (Working name — this module focuses on deep paper inspection.)
                                      Run: citeCraft/backend/parsing/paper_parsing.py
                                      This module allows structured interaction with a single paper.

     Available options (via dropdown/CLI selection):
        Scope:
        - Metadata
        - Individual sections
        - Entire paper

        Actions:
         -Summarize
         -Explain
         -Extract key metrics
         -Retrieve citation-related data

This module is designed to help users quickly interpret and extract structured insights from specific parts of a research paper.

## Tech Stack:

Python
NLP (spaCy, TF-IDF, regex)
LLM-assisted extraction 

SQLite (Replit environment)

CSV-based outputs
