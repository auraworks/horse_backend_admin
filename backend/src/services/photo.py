import logging

from sqlalchemy.ext.asyncio import AsyncSession

from sqlalchemy import select

from src.models import Photo
from src.schemas.photo import PhotoUpdate
from src.services import storage
from src.services.crud_base import get_or_404

logger = logging.getLogger(__name__)

FIELDS = {
    "id": Photo.id,
    "horseId": Photo.horse_id,
    "partCode": Photo.part_code,
    "isSelected": Photo.is_selected,
    "fileName": Photo.file_name,
    "fileFormat": Photo.file_format,
    "contentType": Photo.content_type,
    "fileSize": Photo.file_size,
    "fileSha256": Photo.file_sha256,
    "width": Photo.width,
    "height": Photo.height,
    "recognizedMicrochipNo": Photo.recognized_microchip_no,
    "evidenceSource": Photo.evidence_source,
    "createdAt": Photo.created_at,
}


async def get_photo(session: AsyncSession, photo_id: int) -> Photo:
    return await get_or_404(session, Photo, photo_id, "Photo")


async def update_photo(session: AsyncSession, photo_id: int, body: PhotoUpdate) -> Photo:
    photo = await get_photo(session, photo_id)
    photo.check_codes = body.check_codes
    await session.commit()
    await session.refresh(photo)
    return photo


async def delete_photo(session: AsyncSession, photo_id: int) -> None:
    photo = await get_photo(session, photo_id)
    key = photo.s3_key
    was_selected = photo.is_selected
    horse_id, part_code = photo.horse_id, photo.part_code
    await session.delete(photo)
    await session.flush()
    if was_selected:
        # promote the newest remaining photo of the same horse+slot as representative
        nxt = (
            await session.execute(
                select(Photo)
                .where(Photo.horse_id == horse_id, Photo.part_code == part_code)
                .order_by(Photo.created_at.desc(), Photo.id.desc())
                .limit(1)
            )
        ).scalar_one_or_none()
        if nxt is not None:
            nxt.is_selected = True
    await session.commit()
    try:
        await storage.delete_objects([key])
    except Exception:
        logger.exception("Failed to delete S3 object: %s", key)
