
from openai import OpenAI
from prompt import prompt

import os
from huggingface_hub import InferenceClient

client = InferenceClient(
    provider="hf-inference",
    api_key=os.environ["HF_TOKEN"],
)

result = client.feature_extraction(
    "Today is a sunny day and I will get some ice cream.",
    model="Qwen/Qwen3-VL-Embedding-2B",
)

def comparePapers(xml_paths):
    """ Compares multiple paers and outputs a matrix containing the following columns:
        Metadata[authors, date] || Scope || Dataset || Methodology || Results || Additional Notes"""