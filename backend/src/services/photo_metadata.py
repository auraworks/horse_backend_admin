from sqlalchemy.ext.asyncio import AsyncSession

from src.models import PhotoMetadata
from src.services.crud_base import get_or_404

FIELDS = {
    "id": PhotoMetadata.id,
    "photoId": PhotoMetadata.photo_id,
    "capturedAt": PhotoMetadata.captured_at,
    "iso": PhotoMetadata.iso,
    "exposureTimeNs": PhotoMetadata.exposure_time_ns,
    "fNumber": PhotoMetadata.f_number,
    "focalLengthMm": PhotoMetadata.focal_length_mm,
    "zoomRatio": PhotoMetadata.zoom_ratio,
    "afState": PhotoMetadata.af_state,
    "ambientLux": PhotoMetadata.ambient_lux,
    "blurScore": PhotoMetadata.blur_score,
    "brightness": PhotoMetadata.brightness,
    "deviceModel": PhotoMetadata.device_model,
    "metaSha256": PhotoMetadata.meta_sha256,
}


async def get_metadata(session: AsyncSession, id_: int) -> PhotoMetadata:
    return await get_or_404(session, PhotoMetadata, id_, "PhotoMetadata")
