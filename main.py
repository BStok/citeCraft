from dotenv import load_dotenv
load_dotenv()  # Load env vars before anything else

import uvicorn
from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from typing import Optional

from backend.acquisition.paper_acquisition import get_papers
from backend.comparison.comp import compare_papers

app = FastAPI()

class SearchRequest(BaseModel):
    query: str
    save_csv: Optional[bool] = False
    csv_filename: Optional[str] = "citeCraft.csv"
 
 
class CompareRequest(BaseModel):
    folder_path: str

@app.post("/search_papers")
async def search_papers(body: SearchRequest):
    try:
        papers = get_papers(body.query, save_csv=body.save_csv, csv_filename=body.csv_filename)
        return {"papers": papers}
    except Exception as e:
        return JSONResponse({"error": str(e)}, status_code=500)
    
 
class CompareRequest(BaseModel):
    file_paths: list[str]

@app.post("/compare_papers")
async def compare(body: CompareRequest):
    try:
        rows = compare_papers(body.file_paths)
        return {"comparison": rows}
    except Exception as e:
        return JSONResponse({"error": str(e)}, status_code=500)


if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=5000, reload=True)