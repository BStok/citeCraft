from huggingface_hub import InferenceClient
import os
from openai import OpenAI
from dotenv import load_dotenv

load_dotenv()

token = os.getenv("HF_TOKEN")
print(token)

def keyword_extractor(user_qry):
    """This function generates a list of extracted keywords from the user query for finding research paper"""
    prompt = prompt = prompt = f"""You are an information extraction engine. Your job is to extract structured fields from a user query.
If the user query uses casual, vague, or layman terms, translate them into academically or technically correct terminology before extraction.
Do not explain anything. Do not add extra text. Do not guess missing information. If a field is not explicitly mentioned, return null.

Output format: (wants_papers, academic_title, journal, publication_date, author)

Field rules:
- wants_papers: true or false
- academic_title: title with academically correct terminology as would be used in research, or null
- journal: journal or conference name, or null
- publication_date: explicit or relative date constraint, or null
- author: specific author name, or null

Extraction rules:
- wants_papers = true ONLY if the query clearly asks for research papers, journals, or academic studies
- academic_title must be a cleaned, formal topic title (no filler words)
- Never infer a journal, date, or author
- Return the output exactly in Python tuple format

Examples:

User query: "papers on skull surgery"
Output: (True, "Craniotomy", None, None, None)

User query: "studies about brain tumor removal by Dr. Smith"
Output: (True, "Neurosurgical Tumor Resection", None, None, "Dr. Smith")

User query: "research on engg sensors for automation"
Output: (True, "Sensor Network Design for Automation", None, None, None)

User query: "papers about building drones"
Output: (True, "Unmanned Aerial Vehicle Design", None, None, None)

User query: "find AI for images"
Output: (True, "Computer Vision", None, None, None)

User query: "{user_qry}"
"""


    

    client = OpenAI(
                    base_url="https://router.huggingface.co/v1",
                    api_key=os.environ["HF_TOKEN"],
                )

    completion = client.chat.completions.create(
    model="Qwen/Qwen3-Coder-480B-A35B-Instruct:novita",
    messages=[
        {
            "role": "user",
            "content": prompt 
        }
        ],
    )

    result = completion.choices[0].message
    return result

query = "studies about heart operation methods"
result = keyword_extractor(query)
print(result)