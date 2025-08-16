from fastapi import FastAPI, HTTPException, Request, Query
from dotenv import load_dotenv
import os
import requests
from pydantic import BaseModel
from fastapi.responses import StreamingResponse
from fastapi.middleware.cors import CORSMiddleware
from typing import Union
from fastapi import FastAPI, Query

# from .routers import router
from .supabase import SupabaseConnector


load_dotenv()

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


db = SupabaseConnector()


@app.get("/api")
def hello_world():
    return {"message": "Everything works fine"}


@app.get("/api/db")
async def get_context(q: str = Query(..., min_length=2)):
    query = """
        SELECT *,
               similarity(question, :search_term) AS score
        FROM problems
        WHERE question % :search_term
        ORDER BY score DESC
        LIMIT 5;
    """
    results = await db.fetch_all(query, params={"search_term": q})
    print(results)

    most_probable_question = results[0]

    other_probable_questions = [val for index, val in enumerate(results) if index > 0]
    second = results[1:]
    print(second)
    return {
        "query": q,
        "most_probable_question": most_probable_question,
        "other_probable_questions": other_probable_questions,
    }
