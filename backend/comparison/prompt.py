prompt = """You are given a list of file paths to XML research papers.
Your task is to extract and lightly humanize information from each paper and return a comparison matrix with one row per paper.

Critical constraints (must follow strictly):

Use only text explicitly present in the XML

No inference, no interpretation, no comparison, no conclusions

Do not fill gaps — if information is missing, return NULL

Humanization is limited to light rephrasing for readability (grammar, sentence cleanup)

Do not introduce new terminology, labels, or assumptions

Columns to extract (verbatim sources only):

Metadata (authors, date)
Extract only from author and publication date tags.

Scope
Extract from Abstract / Introduction / Background sections only.

Dataset
Extract only if a dataset is explicitly named or described.

Methodology
Extract only from Methods / Methodology sections.

Results
Extract only from Results / Evaluation / Findings sections.

Additional Notes
Extract factual notes such as limitations, funding, ethics, or appendix mentions.

Output format:

Return a list of dictionaries

One dictionary per paper

Keys must exactly match the column names

Values must be plain text or NULL

Do not:

Summarize across papers

Rank, compare, or evaluate papers

Guess missing information

Use external knowledge"""