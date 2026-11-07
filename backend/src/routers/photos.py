from typing import Literal

from fastapi import APIRouter, Depends, Path, Query, Request, Response
from fastapi.responses import RedirectResponse
from sqlalchemy.ext.asyncio import AsyncSession

from src.routers.responses import R400, R404
from src.schemas.common import ListResponse
from src.schemas.photo import PhotoRead, PhotoUpdate
from src.schemas.upload import ImageVariantUrl
from src.services import image_variants
from src.services import photo as svc
from src.services.crud_base import list_rows
from src.utils.deps import get_db

router = APIRouter(prefix="/photos", tags=["photos"])

FILTER_DOC = (
    "Filters: `field=op.value` (ops eq,neq,gt,gte,lt,lte,like,ilike,in,is), camelCase fields: "
    + ", ".join(svc.FIELDS)
    + ". Sort: `order=field.asc|desc`."
)


@router.get("", response_model=ListResponse[PhotoRead], responses=R400, summary="List photos", description=FILTER_DOC)
async def list_photos(
    request: Request,
    page: int = Query(1, ge=1, description="Page (1-based)"),
    limit: int = Query(20, ge=1, le=100, description="Page size"),
    order: str | None = Query(None, description="e.g. createdAt.desc", examples=["createdAt.desc"]),
    session: AsyncSession = Depends(get_db),
):
    rows, count = await list_rows(session, svc.Photo, svc.FIELDS, request, page, limit, order)
    return {"data": rows, "count": count, "page": page, "limit": limit}


@router.get("/{photo_id}", responses=R404, response_model=PhotoRead, summary="Get a photo")
async def get_photo(photo_id: int = Path(gt=0, le=2147483647, description="ID"), session: AsyncSession = Depends(get_db)):
    return await svc.get_photo(session, photo_id)


IMAGE_DOC = (
    "On-the-fly lightweight version of a photo, e.g. `?type=webp&width=1024`.\n\n"
    "- `type`: `webp` (default) | `avif` | `jpeg` | `png`\n"
    "- `width` / `height`: bounding box in px (16..4096). The image keeps its aspect ratio, is never upscaled, "
    "and EXIF orientation is applied. Omitted sides are unbounded (up to 4096).\n"
    "- `quality`: 1..100 (default 80, ignored for png)\n"
    "- `redirect`: `true` (default) answers `302` to a presigned S3 URL; "
    "`false` answers JSON `{url, expiresIn, contentType, cached}`.\n\n"
    "The first request for a given combination generates the variant (about 1-5s for large originals); "
    "later requests reuse the stored copy. Variants are deleted together with the photo."
)


@router.get(
    "/{photo_id}/image",
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
        return RedirectResponse(out["url"], status_code=302, headers={"Cache-Control": "private, max-age=600"})
    return out


@router.patch("/{photo_id}", responses=R404, response_model=PhotoRead, summary="Update a photo (checkCodes only)")
async def update_photo(body: PhotoUpdate, photo_id: int = Path(gt=0, le=2147483647, description="ID"), session: AsyncSession = Depends(get_db)):
    return await svc.update_photo(session, photo_id, body)


@router.delete("/{photo_id}", responses=R404, status_code=204, summary="Delete a photo (and its S3 object)")
async def delete_photo(photo_id: int = Path(gt=0, le=2147483647, description="ID"), session: AsyncSession = Depends(get_db)):
    await svc.delete_photo(session, photo_id)
    return Response(status_code=204)
