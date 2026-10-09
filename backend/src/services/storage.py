import asyncio
from functools import lru_cache

import boto3

from src.config import settings


@lru_cache
def _client():
    return boto3.client("s3", region_name=settings.AWS_REGION)


def reset_client() -> None:
    """Drop the cached boto3 client (used by tests that patch AWS)."""
    _client.cache_clear()


def _delete_objects_sync(keys: list[str]) -> None:
    client = _client()
    for i in range(0, len(keys), 1000):
        chunk = keys[i : i + 1000]
        resp = client.delete_objects(
            Bucket=settings.S3_BUCKET,
            Delete={"Objects": [{"Key": k} for k in chunk], "Quiet": True},
        )
        if resp.get("Errors"):
            raise RuntimeError(f"S3 delete errors: {resp['Errors']}")


async def delete_objects(keys: list[str]) -> None:
    keys = [k for k in keys if k]
    if keys:
        await asyncio.to_thread(_delete_objects_sync, keys)
