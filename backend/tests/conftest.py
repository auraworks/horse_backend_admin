import os
from collections.abc import AsyncIterator

import pytest
import pytest_asyncio
from dotenv import dotenv_values
from httpx import ASGITransport, AsyncClient
from sqlalchemy import text
from sqlalchemy.engine import make_url
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.pool import NullPool

import src.models  # noqa: F401
from src.config import BASE_DIR, settings
from src.database import Base
from src.main import app
from src.utils.deps import get_db

TEST_DATABASE_URL = os.environ.get("TEST_DATABASE_URL") or dotenv_values(
    BASE_DIR / ".env"
).get("TEST_DATABASE_URL")


@pytest_asyncio.fixture(scope="session")
async def engine():
    assert TEST_DATABASE_URL, "TEST_DATABASE_URL is not set"
    test_url, app_url = make_url(TEST_DATABASE_URL), make_url(settings.DATABASE_URL)
    assert test_url.database and test_url.database.endswith("_test"), "test DB name must end with _test"
    assert (test_url.host, test_url.port, test_url.database) != (
        app_url.host,
        app_url.port,
        app_url.database,
    ), "test DB must differ from app DB"
    eng = create_async_engine(TEST_DATABASE_URL, poolclass=NullPool)
    async with eng.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
        await conn.run_sync(Base.metadata.create_all)
    yield eng
    async with eng.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
    await eng.dispose()


@pytest_asyncio.fixture
async def db_session(engine) -> AsyncIterator[AsyncSession]:
    maker = async_sessionmaker(engine, expire_on_commit=False)
    async with maker() as session:
        yield session


@pytest_asyncio.fixture
async def client(engine) -> AsyncIterator[AsyncClient]:
    maker = async_sessionmaker(engine, expire_on_commit=False)

    async def override_get_db() -> AsyncIterator[AsyncSession]:
        async with maker() as session:
            yield session

    app.dependency_overrides[get_db] = override_get_db
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as c:
        yield c
    app.dependency_overrides.clear()


@pytest.fixture
def api_headers() -> dict[str, str]:
    return {"X-API-Key": settings.API_ACCESS_KEY}


@pytest_asyncio.fixture
async def clean_db(engine):
    """Empty all tables before a test (the RDS test DB is shared across tests)."""
    async with engine.begin() as conn:
        await conn.execute(text("TRUNCATE photo_metadata, photos, horses RESTART IDENTITY CASCADE"))


@pytest.fixture
def s3():
    """moto-mocked S3 with the photo bucket created."""
    import boto3
    from moto import mock_aws

    from src.services import storage

    for k in ("AWS_ACCESS_KEY_ID", "AWS_SECRET_ACCESS_KEY"):
        os.environ[k] = "testing"
    with mock_aws():
        storage.reset_client()
        client = boto3.client("s3", region_name=settings.AWS_REGION)
        client.create_bucket(
            Bucket=settings.S3_BUCKET,
            CreateBucketConfiguration={"LocationConstraint": settings.AWS_REGION},
        )
        yield client
        storage.reset_client()
