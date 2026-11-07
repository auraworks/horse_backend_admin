"""Public (no X-API-Key) endpoints: lightweight on-the-fly photo variants.

Only resized/re-encoded copies are exposed (Pillow drops EXIF, so no GPS); originals stay
behind the API key (`viewUrl`, `download-url`).
"""
from typing import Literal

from fastapi import APIRouter, Depends, Path, Query
from fastapi.responses import RedirectResponse
from sqlalchemy.ext.asyncio import AsyncSession

from src.routers.responses import R404
from src.schemas.upload import ImageVariantUrl
from src.services import image_variants
from src.utils.deps import get_db

router = APIRouter(tags=["photos"])


IMAGE_DOC = (
    "On-the-fly lightweight version of a photo, e.g. `?type=webp&width=1024`.\n\n"
    "- `type`: `webp` (default) | `avif` | `jpeg` | `png`\n"
    "- `width` / `height`: bounding box in px (16..4096). The image keeps its aspect ratio, is never upscaled, "
    "and EXIF orientation is applied. Omitted sides are unbounded (up to 4096).\n"
    "- `quality`: 1..100 (default 80, ignored for png)\n"
    "- `redirect`: `true` (default) answers `302` to a presigned S3 URL; "
    "`false` answers JSON `{url, expiresIn, contentType, cached}`.\n\n"
    "The first request for a given combination generates the variant (about 1-5s for large originals); "
    "later requests reuse the stored copy. Variants are deleted together with the photo.\n\n"
    "**Public:** no X-API-Key needed, so the URL works directly in `<img src>` / a browser. "
    "Variants never contain EXIF/GPS metadata; originals stay private."
)


@router.get(
    "/photos/{photo_id}/image",
    response_model=ImageVariantUrl,
    summary="Resized / converted image (on the fly, cached)",
    description=IMAGE_DOC,
    responses={
        **R404,
        302: {"description": "Redirect to the presigned variant URL (redirect=true)"},
        422: {"description": "Invalid parameters or undecodable photo"},
        502: {"description": "Transform failed"},
    },
)
async def photo_image(
    photo_id: int = Path(gt=0, le=2147483647, description="ID"),
    type_: Literal["webp", "avif", "jpeg", "png"] = Query("webp", alias="type", description="Output format"),
    width: int | None = Query(None, ge=16, le=4096, description="Max width px"),
    height: int | None = Query(None, ge=16, le=4096, description="Max height px"),
    quality: int = Query(80, ge=1, le=100, description="Encoder quality (lossy formats)"),
    redirect: bool = Query(True, description="302 to the image (true) or JSON with the URL (false)"),
    session: AsyncSession = Depends(get_db),
):
    out = await image_variants.variant_url(session, photo_id, type_, width, height, quality)
    if redirect:
        # The presigned URL lives PRESIGN_TTL seconds; let clients reuse the redirect for a while.
        return RedirectResponse(out["url"], status_code=302, headers={"Cache-Control": "public, max-age=600"})
    return out
