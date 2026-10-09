from fastapi import APIRouter, Depends, Query, Request, Response
from sqlalchemy.ext.asyncio import AsyncSession

from src.schemas.common import ListResponse
from src.schemas.horse import HorseCreate, HorseRead, HorseUpdate
from src.services import horse as svc
from src.services.crud_base import list_rows
from src.utils.deps import get_db

router = APIRouter(prefix="/horses", tags=["horses"])

FILTER_DOC = (
    "Filters: `field=op.value` (ops eq,neq,gt,gte,lt,lte,like,ilike,in,is), camelCase fields: "
    + ", ".join(svc.FIELDS)
    + ". Sort: `order=field.asc|desc`."
)


@router.get("", response_model=ListResponse[HorseRead], summary="List horses", description=FILTER_DOC)
async def list_horses(
    request: Request,
    page: int = Query(1, ge=1, description="Page (1-based)"),
    limit: int = Query(20, ge=1, le=100, description="Page size"),
    order: str | None = Query(None, description="e.g. createdAt.desc", examples=["createdAt.desc"]),
    session: AsyncSession = Depends(get_db),
):
    rows, count = await list_rows(session, svc.Horse, svc.FIELDS, request, page, limit, order)
    return {"data": rows, "count": count, "page": page, "limit": limit}


@router.get("/{horse_id}", response_model=HorseRead, summary="Get a horse")
async def get_horse(horse_id: int, session: AsyncSession = Depends(get_db)):
    return await svc.get_horse(session, horse_id)


@router.post("", response_model=HorseRead, status_code=201, summary="Create a horse")
async def create_horse(body: HorseCreate, session: AsyncSession = Depends(get_db)):
    return await svc.create_horse(session, body)


@router.patch("/{horse_id}", response_model=HorseRead, summary="Update a horse")
async def update_horse(horse_id: int, body: HorseUpdate, session: AsyncSession = Depends(get_db)):
    return await svc.update_horse(session, horse_id, body)


@router.delete("/{horse_id}", status_code=204, summary="Delete a horse (and its photos incl. S3 objects)")
async def delete_horse(horse_id: int, session: AsyncSession = Depends(get_db)):
    await svc.delete_horse(session, horse_id)
    return Response(status_code=204)
