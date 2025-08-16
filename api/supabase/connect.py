from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from api.config.config import settings
from sqlalchemy import text


class SupabaseConnector:
    def __init__(self):
        self.engine = create_async_engine(settings.DATABASE_URL, echo=True)
        self.SessionLocal = sessionmaker(
            bind=self.engine, expire_on_commit=False, class_=AsyncSession
        )

    async def fetch_all(self, query: str, params: dict = None):
        async with self.SessionLocal() as session:
            result = await session.execute(text(query), params or {})
            return [dict(row._mapping) for row in result.fetchall()]

    async def fetch_one(self, query: str):
        """Fetch a single row."""
        async with self.SessionLocal() as session:
            result = await session.execute(text(query))
            row = result.fetchone()
            return dict(row._mapping) if row else None

    async def execute(self, query: str, params: dict = None, commit: bool = True):
        """
        Execute a SQL query safely with parameters.
        Example:
            await execute(
                "INSERT INTO users (name, email) VALUES (:name, :email)",
                {"name": "John", "email": "john@example.com"}
            )
        """
        async with self.SessionLocal() as session:
            await session.execute(text(query), params or {})
            if commit:
                await session.commit()
