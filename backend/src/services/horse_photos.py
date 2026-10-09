import json
import logging
import re
import uuid

from fastapi import HTTPException, UploadFile
from pydantic import ValidationError
from sqlalchemy.exc import IntegrityError
from sqlalchemy import func, select, update
from sqlalchemy.ext.asyncio import AsyncSession

from src.config import settings
from src.models import Horse, Photo, PhotoMetadata
from src.models.enums import BODY_PARTS, ChipInputMethod, FileFormat, PartCode
from src.schemas.photo_metadata import Gps
from src.schemas.upload import MetadataInput, PhotoDetail, PhotoMetadataOut, Stats
from src.services import storage
from src.services.crud_base import get_or_404

logger = logging.getLogger(__name__)

CONTENT_TYPES = {FileFormat.jpeg: "image/jpeg", FileFormat.png: "image/png"}
EXT = {FileFormat.jpeg: "jpg", FileFormat.png: "png"}
CHIP_RE = re.compile(r"^\d{15}$")

PHOTO_COLS = (
    "id", "horse_id", "part_code", "is_selected", "file_name", "file_format", "content_type", "file_size",
    "file_sha256", "width", "height", "check_codes", "recognized_microchip_no", "evidence_source", "created_at",
)
META_COLS = tuple(k for k in PhotoMetadataOut.model_fields if k != "gps")


def _is_unique_violation(e: IntegrityError) -> bool:
    orig = e.orig
    state = getattr(orig, "sqlstate", None) or getattr(getattr(orig, "__cause__", None), "sqlstate", None)
    return state == "23505"


def _422(detail) -> HTTPException:
    return HTTPException(status_code=422, detail=detail)


def to_detail(photo: Photo, meta: PhotoMetadata | None) -> PhotoDetail:
    out = None
    if meta is not None:
        gps = None
        if meta.gps_lat is not None:
            gps = Gps(latitude=meta.gps_lat, longitude=meta.gps_lng, accuracy_meters=meta.gps_accuracy_m)
        out = PhotoMetadataOut(gps=gps, **{k: getattr(meta, k) for k in META_COLS})
    return PhotoDetail(
        **{k: getattr(photo, k) for k in PHOTO_COLS},
        part_label=photo.part_code.label,
        view_url=storage.presign_view(photo.s3_key),
        metadata=out,
    )


def _client_file_name(raw: str | None) -> str:
    """Sanitized basename of the client-supplied filename (no path parts, no control chars, <=255)."""
    if not raw:
        return ""
    name = raw.replace("\\", "/").split("/")[-1]
    name = "".join(ch for ch in name if ch.isprintable()).strip()
    if name in (".", ".."):
        return ""
    return name[:255]


async def _detail(session: AsyncSession, photo: Photo) -> PhotoDetail:
    meta = (await session.execute(select(PhotoMetadata).where(PhotoMetadata.photo_id == photo.id))).scalar_one_or_none()
    return to_detail(photo, meta)


def parse_metadata(raw: str) -> MetadataInput:
    try:
        return MetadataInput.model_validate_json(raw)
    except ValidationError as e:
        raise _422(json.loads(e.json(include_url=False, include_context=False, include_input=False)))


async def list_photos(session: AsyncSession, horse_id: int, part_code: PartCode | None) -> list[PhotoDetail]:
    await get_or_404(session, Horse, horse_id, "Horse")
    stmt = (
        select(Photo, PhotoMetadata)
        .outerjoin(PhotoMetadata, PhotoMetadata.photo_id == Photo.id)
        .where(Photo.horse_id == horse_id)
    )
    if part_code:
        stmt = stmt.where(Photo.part_code == part_code)
    rows = (await session.execute(stmt)).all()
    rows.sort(key=lambda r: (r[0].part_code.order, -r[0].created_at.timestamp(), -r[0].id))
    return [to_detail(p, m) for p, m in rows]


async def upload_photo(
    session: AsyncSession,
    horse_id: int,
    slot: PartCode,
    photo: UploadFile,
    metadata: str,
    recognized_microchip_number: str | None,
    evidence_source: ChipInputMethod | None,
) -> PhotoDetail:
    horse = await get_or_404(session, Horse, horse_id, "Horse")
    meta_in = parse_metadata(metadata)

    if slot is PartCode.microchip:
        errs = []
        if not recognized_microchip_number or not CHIP_RE.match(recognized_microchip_number):
            errs.append({"loc": ["recognizedMicrochipNumber"], "msg": "must be exactly 15 digits", "type": "value_error"})
        if evidence_source is None:
            errs.append({"loc": ["evidenceSource"], "msg": "required for the microchip slot (ocr|manual)", "type": "missing"})
        if errs:
            raise _422(errs)
    else:
        recognized_microchip_number = None
        evidence_source = None

    expected = CONTENT_TYPES[meta_in.file_format]
    ctype = (photo.content_type or "").split(";")[0].strip().lower()
    if ctype != expected:
        raise _422(
            f"Photo content-type {ctype!r} does not match fileFormat "
            f"{meta_in.file_format.value!r} (expected {expected!r})"
        )
    data = await photo.read(settings.MAX_UPLOAD_BYTES + 1)
    if len(data) > settings.MAX_UPLOAD_BYTES:
        raise HTTPException(status_code=413, detail="Photo exceeds the 10MB upload limit")
    if not data:
        raise _422("Photo file is empty")

    object_name = f"{uuid.uuid4()}.{EXT[meta_in.file_format]}"
    file_name = _client_file_name(photo.filename) or object_name
    key = f"horses/{horse_id}/{slot.value}/{object_name}"
    await storage.upload_bytes(key, data, expected)

    committed = False
    try:
        has_selected = (
            await session.execute(
                select(Photo.id).where(Photo.horse_id == horse_id, Photo.part_code == slot, Photo.is_selected).limit(1)
            )
        ).first() is not None
        row = Photo(
            horse_id=horse_id, part_code=slot, is_selected=not has_selected, file_name=file_name,
            file_format=meta_in.file_format, content_type=expected,
            file_size=meta_in.file_size, file_sha256=meta_in.file_sha256, width=meta_in.width,
            height=meta_in.height, check_codes=meta_in.error_codes,
            recognized_microchip_no=recognized_microchip_number, evidence_source=evidence_source, s3_key=key,
        )
        session.add(row)
        await session.flush()
        gps = meta_in.gps
        meta = PhotoMetadata(
            photo_id=row.id, captured_at=meta_in.captured_at,
            gps_lat=gps.latitude if gps else None, gps_lng=gps.longitude if gps else None,
            gps_accuracy_m=gps.accuracy_meters if gps else None,
            iso=meta_in.iso, exposure_time_ns=meta_in.exposure_time_ns, f_number=meta_in.f_number,
            focal_length_mm=meta_in.focal_length_mm, zoom_ratio=meta_in.zoom_ratio, af_state=meta_in.af_state,
            ambient_lux=meta_in.ambient_lux, blur_score=meta_in.blur_score, brightness=meta_in.brightness,
            device_model=meta_in.device_model, meta_sha256=meta_in.meta_sha256,
        )
        session.add(meta)
        if slot is PartCode.microchip:
            horse.chip_input_method = evidence_source
        await session.commit()
        committed = True
    except BaseException as e:  # incl. cancellation (client disconnect): never orphan the object
        if not committed:
            try:
                await session.rollback()
            except BaseException:
                logger.exception("Rollback failed after upload error")
            try:
                await storage.delete_objects([key])
            except BaseException:
                logger.exception("Failed to clean up S3 object after DB error: %s", key)
        if isinstance(e, IntegrityError) and _is_unique_violation(e):
            raise HTTPException(status_code=409, detail="Concurrent upload conflict on representative photo; retry")
        raise
    await session.refresh(row)
    await session.refresh(meta)
    return to_detail(row, meta)


async def set_representative(session: AsyncSession, horse_id: int, slot: PartCode, photo_id: int) -> PhotoDetail:
    await get_or_404(session, Horse, horse_id, "Horse")
    target = await session.get(Photo, photo_id)
    if target is None or target.horse_id != horse_id or target.part_code != slot:
        raise HTTPException(status_code=404, detail="Photo not found in this horse/slot")
    # Order matters: the partial unique index allows only one selected row per horse+slot.
    await session.execute(
        update(Photo)
        .where(Photo.horse_id == horse_id, Photo.part_code == slot, Photo.is_selected, Photo.id != photo_id)
        .values(is_selected=False)
    )
    await session.execute(update(Photo).where(Photo.id == photo_id).values(is_selected=True))
    try:
        await session.commit()
    except IntegrityError as e:
        await session.rollback()
        if _is_unique_violation(e):
            raise HTTPException(status_code=409, detail="Concurrent representative change; retry")
        raise
    await session.refresh(target)
    return await _detail(session, target)


async def download_url(session: AsyncSession, photo_id: int) -> dict:
    photo = await get_or_404(session, Photo, photo_id, "Photo")
    return {
        "url": storage.presign_download(photo.s3_key, photo.file_name),
        "expires_in": settings.PRESIGN_TTL,
        "file_name": photo.file_name,
    }


async def stats(session: AsyncSession) -> Stats:
    six = (
        select(Photo.horse_id)
        .where(Photo.part_code.in_(BODY_PARTS))
        .group_by(Photo.horse_id)
        .having(func.count(func.distinct(Photo.part_code)) == len(BODY_PARTS))
        .subquery()
    )
    row = (
        await session.execute(
            select(
                select(func.count()).select_from(Horse).scalar_subquery(),
                select(func.count()).select_from(Photo).scalar_subquery(),
                select(func.count()).select_from(six).scalar_subquery(),
            )
        )
    ).one()
    return Stats(horse_count=row[0], photo_count=row[1], horses_with_all_six_parts=row[2])
