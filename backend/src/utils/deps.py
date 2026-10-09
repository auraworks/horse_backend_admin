import secrets
from collections.abc import AsyncIterator

from fastapi import Depends, HTTPException, status
from fastapi.security import APIKeyHeader
from sqlalchemy.ext.asyncio import AsyncSession

from src.config import settings
from src.database import get_session

api_key_header = APIKeyHeader(
    name="X-API-Key",
    auto_error=False,
    description="Fixed access key (env API_ACCESS_KEY).",
)


async def get_db() -> AsyncIterator[AsyncSession]:
    async for session in get_session():
        yield session


async def require_api_key(api_key: str | None = Depends(api_key_header)) -> None:
    if not api_key or not secrets.compare_digest(
        api_key.encode("utf-8"), settings.API_ACCESS_KEY.encode("utf-8")
    ):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or missing API key",
        )
