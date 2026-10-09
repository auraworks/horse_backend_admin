from fastapi import APIRouter, Depends, Path, Query, Request, Response
from sqlalchemy.ext.asyncio import AsyncSession

from src.schemas.common import ListResponse
from src.schemas.photo import PhotoRead, PhotoUpdate
from src.services import photo as svc
from src.services.crud_base import list_rows
from src.utils.deps import get_db

R400 = {400: {"description": "Invalid filter/order"}}
R404 = {404: {"description": "Not found"}}
R409 = {409: {"description": "Duplicate microchip number"}}

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


@router.patch("/{photo_id}", responses=R404, response_model=PhotoRead, summary="Update a photo (checkCodes only)")
async def update_photo(body: PhotoUpdate, photo_id: int = Path(gt=0, le=2147483647, description="ID"), session: AsyncSession = Depends(get_db)):
    return await svc.update_photo(session, photo_id, body)


@router.delete("/{photo_id}", responses=R404, status_code=204, summary="Delete a photo (and its S3 object)")
async def delete_photo(photo_id: int = Path(gt=0, le=2147483647, description="ID"), session: AsyncSession = Depends(get_db)):
    await svc.delete_photo(session, photo_id)
    return Response(status_code=204)
