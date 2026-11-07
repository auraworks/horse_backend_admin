"""On-the-fly lightweight photo variants (`GET /photos/{id}/image?type=webp&width=1024`).

Variants are generated once, stored under `derived/<original key>/...` and served by presigned URL.
Generation runs in AWS Lambda in production (IMAGE_TRANSFORM_MODE=lambda) so the small EC2 box never
decodes 100MB originals; `local` mode runs Pillow in-process (dev/tests).
"""
import asyncio
import json
import logging
import tempfile
from functools import lru_cache

import boto3
from botocore.config import Config
from fastapi import HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from src.config import settings
from src.imaging.transform import FORMATS, TransformError, transform
from src.models import Photo
from src.services import storage
from src.services.crud_base import get_or_404

logger = logging.getLogger(__name__)

# Limit concurrent local transforms per worker (each can hold a large decoded image in RAM).
_local_slots = asyncio.Semaphore(1)


def derived_prefix(s3_key: str) -> str:
    return f"derived/{s3_key}/"


def variant_key(s3_key: str, fmt: str, width: int, height: int, quality: int) -> str:
    return f"{derived_prefix(s3_key)}w{width}_h{height}_q{quality}.{FORMATS[fmt][2]}"


@lru_cache
def _lambda():
    return boto3.client(
        "lambda",
        region_name=settings.AWS_REGION,
        config=Config(read_timeout=35, connect_timeout=5, retries={"max_attempts": 0}),
    )


def _invoke_lambda(event: dict) -> dict:
    resp = _lambda().invoke(FunctionName=settings.IMAGE_TRANSFORM_FUNCTION, Payload=json.dumps(event).encode())
    payload = json.loads(resp["Payload"].read() or b"{}")
    if resp.get("FunctionError"):
        raise RuntimeError(f"image transform lambda failed: {payload}")
    return payload


def _transform_local(event: dict) -> dict:
    client = storage._client()
    with tempfile.TemporaryFile() as f:
        client.download_fileobj(event["bucket"], event["srcKey"], f)
        f.seek(0)
        try:
            data, w, h = transform(f, event["type"], event["width"], event["height"], event["quality"])
        except TransformError as e:
            return {"ok": False, "error": str(e)}
    client.put_object(
        Bucket=event["bucket"], Key=event["dstKey"], Body=data, ContentType=FORMATS[event["type"]][1],
        CacheControl="private, max-age=31536000, immutable",
    )
    return {"ok": True, "size": len(data), "width": w, "height": h}


async def _generate(event: dict) -> dict:
    if settings.IMAGE_TRANSFORM_MODE == "lambda":
        return await asyncio.to_thread(_invoke_lambda, event)
    async with _local_slots:
        return await asyncio.to_thread(_transform_local, event)


async def variant_url(
    session: AsyncSession, photo_id: int, fmt: str, width: int | None, height: int | None, quality: int
) -> dict:
    photo = await get_or_404(session, Photo, photo_id, "Photo")
    cap = settings.IMAGE_MAX_DIMENSION
    # Missing side = unbounded (up to the cap); the image keeps its aspect ratio and is never upscaled.
    w, h = width or cap, height or cap
    if fmt == "png":
        quality = 0  # lossless: quality is meaningless, keep one cache entry
    key = variant_key(photo.s3_key, fmt, w, h, quality)

    cached = await storage.head_object(key) is not None
    if not cached:
        event = {
            "bucket": settings.S3_BUCKET, "srcKey": photo.s3_key, "dstKey": key,
            "type": fmt, "width": w, "height": h, "quality": quality or 100,
        }
        try:
            result = await _generate(event)
        except Exception:
            logger.exception("Image variant generation failed for photo %s (%s)", photo_id, key)
            raise HTTPException(status_code=502, detail="Image transform failed")
        if not result.get("ok"):
            raise HTTPException(status_code=422, detail=f"Photo cannot be transformed: {result.get('error')}")

    return {
        "url": storage.presign_view(key),
        "expires_in": settings.PRESIGN_TTL,
        "content_type": FORMATS[fmt][1],
        "cached": cached,
    }
