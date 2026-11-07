import asyncio
from functools import lru_cache
from urllib.parse import quote

import boto3
from botocore.config import Config
from botocore.exceptions import ClientError

from src.config import settings


@lru_cache
def _client():
    # Regional endpoint so presigned URLs point at s3.<region>.amazonaws.com
    # (the global endpoint answers 307 for fresh buckets).
    return boto3.client(
        "s3",
        region_name=settings.AWS_REGION,
        endpoint_url=f"https://s3.{settings.AWS_REGION}.amazonaws.com",
        config=Config(signature_version="s3v4", s3={"addressing_style": "virtual"}),
    )


def reset_client() -> None:
    """Drop the cached boto3 client (used by tests that patch AWS)."""
    _client.cache_clear()


def _upload_sync(key: str, data: bytes, content_type: str) -> None:
    _client().put_object(Bucket=settings.S3_BUCKET, Key=key, Body=data, ContentType=content_type)


async def upload_bytes(key: str, data: bytes, content_type: str) -> None:
    await asyncio.to_thread(_upload_sync, key, data, content_type)


def presign_upload_post(key: str, content_type: str, max_bytes: int, expires_in: int) -> dict:
    """Presigned POST form for a direct client -> S3 upload of exactly this key.

    S3 itself rejects the upload unless Content-Type matches and the body is 1..max_bytes bytes.
    Returns {"url": ..., "fields": {...}}. Computed locally, no network call.
    """
    return _client().generate_presigned_post(
        Bucket=settings.S3_BUCKET,
        Key=key,
        Fields={"Content-Type": content_type},
        Conditions=[{"Content-Type": content_type}, ["content-length-range", 1, max_bytes]],
        ExpiresIn=expires_in,
    )


def _head_sync(key: str) -> dict | None:
    try:
        return _client().head_object(Bucket=settings.S3_BUCKET, Key=key)
    except ClientError as e:
        if e.response.get("Error", {}).get("Code") in ("404", "NoSuchKey", "NotFound"):
            return None
        raise


async def head_object(key: str) -> dict | None:
    """Object metadata (ContentLength, ContentType, ...) or None when the key does not exist."""
    return await asyncio.to_thread(_head_sync, key)


def _copy_sync(src_key: str, dst_key: str, content_type: str) -> None:
    # Single-request server-side copy (fine up to 5GB; uploads are capped far below that).
    _client().copy_object(
        Bucket=settings.S3_BUCKET,
        Key=dst_key,
        CopySource={"Bucket": settings.S3_BUCKET, "Key": src_key},
        ContentType=content_type,
        MetadataDirective="REPLACE",
    )


async def copy_object(src_key: str, dst_key: str, content_type: str) -> None:
    await asyncio.to_thread(_copy_sync, src_key, dst_key, content_type)


def presign_view(key: str) -> str:
    """Presigned inline GET URL (TTL = PRESIGN_TTL). Computed locally, no network call."""
    return _client().generate_presigned_url(
        "get_object",
        Params={"Bucket": settings.S3_BUCKET, "Key": key},
        ExpiresIn=settings.PRESIGN_TTL,
    )


def presign_download(key: str, file_name: str) -> str:
    """Presigned GET URL forcing a download with the given file name."""
    ascii_name = file_name.encode("ascii", "ignore").decode().replace('"', "").replace("\\", "") or "download"
    disposition = f'attachment; filename="{ascii_name}"; filename*=UTF-8' + "''" + quote(file_name, safe="")
    return _client().generate_presigned_url(
        "get_object",
        Params={
            "Bucket": settings.S3_BUCKET,
            "Key": key,
            "ResponseContentDisposition": disposition,
        },
        ExpiresIn=settings.PRESIGN_TTL,
    )


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
