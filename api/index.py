from fastapi import FastAPI, HTTPException, Request, Query
from dotenv import load_dotenv
import os
import requests
from pydantic import BaseModel
from fastapi.responses import StreamingResponse
from fastapi.middleware.cors import CORSMiddleware
from typing import Union
from fastapi import FastAPI, Query
from fastapi import Depends

from .supabase import get_supabase_client


load_dotenv()

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/api")
def hello_world():
    return {"message": "Everything works fine"}


@app.get("/api/ping-db")
async def get_all_rows(db=Depends(get_supabase_client)):
    """
    Retrieves all rows and columns from a specified table.
    """

    print(f"Type of db object: {type(db)}")
    try:
        # This is the Supabase equivalent of 'SELECT * FROM your_table_name'
        response = await db.table("problems").select("*").limit(10).execute()

        # The actual data is in the .data attribute
        if response.data:
            return response.data
        return []
    except Exception as e:
        print(f"An error occurred: {e}")
        return None


# @app.get("/api/db")
# async def get_context(
#     q: str = Query(..., min_length=2), db: AsyncClient = Depends(get_supabase_client)
# ):

#     query = """
#         SELECT *,
#                similarity(question, :search_term) AS score
#         FROM problems
#         WHERE question % :search_term
#         ORDER BY score DESC
#         LIMIT 5;
#     """
#     results = await db.fetch_all(query, params={"search_term": q})
#     print(results)

#     most_probable_question = results[0]

#     other_probable_questions = [val for index, val in enumerate(results) if index > 0]
#     second = results[1:]
#     print(second)
#     return {
#         "query": q,
#         "most_probable_question": most_probable_question,
#         "other_probable_questions": other_probable_questions,
#     }
