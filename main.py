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

@app.post("/compare_papers")
async def compare(request: Request):
    data = await request.json()
    folder_path = data.get("folder_path")
    if not folder_path:
        return JSONResponse({"error": "No folder path provided"}, status_code=400)

    try:
        comparison = compare_papers(folder_path)
        return {"comparison": comparison}
    except Exception as e:
        return JSONResponse({"error": str(e)}, status_code=500)


if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=5000, reload=True)