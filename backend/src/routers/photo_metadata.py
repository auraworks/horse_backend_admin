from fastapi import APIRouter, Depends, Query, Request
from sqlalchemy.ext.asyncio import AsyncSession

from src.schemas.common import ListResponse
from src.schemas.photo_metadata import PhotoMetadataRead
from src.services import photo_metadata as svc
from src.services.crud_base import list_rows
from src.utils.deps import get_db

router = APIRouter(prefix="/photo-metadata", tags=["photo-metadata"])

FILTER_DOC = (
    "Filters: `field=op.value` (ops eq,neq,gt,gte,lt,lte,like,ilike,in,is), camelCase fields: "
    + ", ".join(svc.FIELDS)
    + ". Sort: `order=field.asc|desc`."
)


@router.get("", response_model=ListResponse[PhotoMetadataRead], summary="List photo metadata", description=FILTER_DOC)
async def list_metadata(
    request: Request,
    page: int = Query(1, ge=1, description="Page (1-based)"),
    limit: int = Query(20, ge=1, le=100, description="Page size"),
    order: str | None = Query(None, description="e.g. capturedAt.desc", examples=["capturedAt.desc"]),
    session: AsyncSession = Depends(get_db),
):
    rows, count = await list_rows(session, svc.PhotoMetadata, svc.FIELDS, request, page, limit, order)
    return {"data": [PhotoMetadataRead.from_orm_row(r) for r in rows], "count": count, "page": page, "limit": limit}


@router.get("/{metadata_id}", response_model=PhotoMetadataRead, summary="Get photo metadata")
async def get_metadata(metadata_id: int, session: AsyncSession = Depends(get_db)):
    return PhotoMetadataRead.from_orm_row(await svc.get_metadata(session, metadata_id))
