from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from src.models.enums import PartCode
from src.schemas.upload import PartInfo, Stats
from src.services import horse_photos as svc
from src.utils.deps import get_db

router = APIRouter()


@router.get("/photo-parts", response_model=list[PartInfo], tags=["photos"], summary="List photo part codes (7, display order)")
async def photo_parts():
    return [PartInfo(code=p, label=p.label, order=p.order) for p in PartCode]


@router.get("/stats", response_model=Stats, tags=["system"], summary="Dashboard counts")
async def get_stats(session: AsyncSession = Depends(get_db)):
    return await svc.stats(session)
