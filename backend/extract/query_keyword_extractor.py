from huggingface_hub import InferenceClient
import os
from openai import OpenAI
from dotenv import load_dotenv
import backend.extract.prompts as prompts

load_dotenv()


def keyword_extractor(user_qry):
    """This function generates a list of extracted keywords from the user query for finding research paper"""
    prompt = prompts.keyword_extract(user_qry)
  
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