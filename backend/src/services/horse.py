import logging

from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from src.models import Horse, Photo
from src.schemas.horse import HorseCreate, HorseUpdate
from src.services import storage
from src.services.crud_base import get_or_404

logger = logging.getLogger(__name__)

FIELDS = {
    "id": Horse.id,
    "microchipNo": Horse.microchip_no,
    "chipInputMethod": Horse.chip_input_method,
    "horseNo": Horse.horse_no,
    "horseName": Horse.horse_name,
    "birthDate": Horse.birth_date,
    "sex": Horse.sex,
    "coatColor": Horse.coat_color,
    "createdAt": Horse.created_at,
    "updatedAt": Horse.updated_at,
}


def _dup() -> HTTPException:
    return HTTPException(status_code=409, detail="Microchip number already exists")


def _is_unique_violation(e: IntegrityError) -> bool:
    orig = e.orig
    state = getattr(orig, "sqlstate", None) or getattr(getattr(orig, "__cause__", None), "sqlstate", None)
    return state == "23505"


async def get_horse(session: AsyncSession, horse_id: int) -> Horse:
    return await get_or_404(session, Horse, horse_id, "Horse")


async def create_horse(session: AsyncSession, body: HorseCreate) -> Horse:
    horse = Horse(**body.model_dump())
    session.add(horse)
    try:
        await session.commit()
    except IntegrityError as e:
        await session.rollback()
        if _is_unique_violation(e):
            raise _dup()
        raise
    await session.refresh(horse)
    return horse


async def update_horse(session: AsyncSession, horse_id: int, body: HorseUpdate) -> Horse:
    horse = await get_horse(session, horse_id)
    for k, v in body.model_dump(exclude_unset=True).items():
        if k == "microchip_no" and v is None:
            continue
        setattr(horse, k, v)
    try:
        await session.commit()
    except IntegrityError as e:
        await session.rollback()
        if _is_unique_violation(e):
            raise _dup()
        raise
    await session.refresh(horse)
    return horse


async def delete_horse(session: AsyncSession, horse_id: int) -> None:
    horse = await get_horse(session, horse_id)
    keys = list((await session.execute(select(Photo.s3_key).where(Photo.horse_id == horse_id))).scalars())
    await session.delete(horse)  # photos + metadata removed by FK ON DELETE CASCADE
    await session.commit()
    # DB is the source of truth: S3 cleanup runs after commit; failures are logged, not raised.
    try:
        await storage.delete_objects(keys)
    except Exception:
        logger.exception("Failed to delete S3 objects: %s", keys)
