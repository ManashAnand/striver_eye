# supabase/connect.py
import os
from supabase import AsyncClient, acreate_client
from dotenv import load_dotenv
import asyncio

load_dotenv()

SUPABASE_URL = os.environ.get("SUPABASE_URL")
SUPABASE_KEY = os.environ.get("SUPABASE_KEY")

if not SUPABASE_URL or not SUPABASE_KEY:
    raise ValueError("Supabase URL and Key must be set in environment variables.")


# Singleton pattern
class SupabaseClient:
    _client: AsyncClient | None = None
    _lock = asyncio.Lock()

    @classmethod
    async def get_client(cls) -> AsyncClient:
        if cls._client is None:
            async with cls._lock:
                if cls._client is None:
                    cls._client = await acreate_client(SUPABASE_URL, SUPABASE_KEY)
        return cls._client


async def get_supabase_client():
    return await SupabaseClient.get_client()
