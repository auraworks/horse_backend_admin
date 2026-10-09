import json
from typing import Annotated

from fastapi import APIRouter, Depends, File, Form, HTTPException, Path, Query, UploadFile
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src.models import Horse
from src.models.enums import ChipInputMethod, PartCode
from src.routers.responses import R404
from src.schemas.horse import HorseRead
from src.schemas.upload import METADATA_EXAMPLE, DownloadUrl, MetadataInput, PhotoDetail, RepresentativeBody
from src.services import horse_photos as svc
from src.utils.deps import get_db

router = APIRouter()

HorseId = Annotated[int, Path(gt=0, le=2147483647, description="Horse ID")]

UPLOAD_DOC = (
    "Multipart upload of one photo into a slot (`front_full`, `forehead_close`, `left_full`, `right_full`, "
    "`right_rear_oblique`, `left_rear_oblique`, `microchip`).\n\n"
    "**Fields**\n"
    "- `photo` (file, `image/jpeg` or `image/png`, max 10MB; content-type must match `metadata.fileFormat`)\n"
    "- `metadata` (string): JSON object, schema below\n"
    "- `recognizedMicrochipNumber`, `evidenceSource` (`ocr|manual`): required only when slot = `microchip`; "
    "the horse's `chipInputMethod` is then updated to `evidenceSource`.\n\n"
    "**Representative rule:** the first photo uploaded into a horse's slot automatically becomes "
    "`isSelected=true` if no photo of that slot is selected yet; later uploads are `isSelected=false` "
    "(change it with `PUT /horses/{horseId}/photos/{slot}/representative`).\n\n"
    "**metadata example**\n```json\n" + METADATA_EXAMPLE + "\n```\n\n"
    "**metadata JSON schema**\n```json\n"
    + json.dumps(MetadataInput.model_json_schema(by_alias=True), ensure_ascii=False)
    + "\n```\n"
)


@router.get(
    "/horses/by-microchip/{microchip_no}",
    response_model=HorseRead,
    responses=R404,
    tags=["horses"],
    summary="Get a horse by microchip number",
)
async def get_by_microchip(
    microchip_no: str = Path(pattern=r"^\d{15}$", description="15-digit microchip number", examples=["410123456789012"]),
    session: AsyncSession = Depends(get_db),
):
    horse = (await session.execute(select(Horse).where(Horse.microchip_no == microchip_no))).scalar_one_or_none()
    if horse is None:
        raise HTTPException(status_code=404, detail="Horse not found")
    return horse


@router.get(
    "/horses/{horse_id}/photos",
    response_model=list[PhotoDetail],
    responses=R404,
    tags=["photos"],
    summary="List a horse's photos (part order, then newest first)",
)
async def list_horse_photos(
    horse_id: HorseId,
    part_code: PartCode | None = Query(None, alias="partCode", description="Filter by part"),
    session: AsyncSession = Depends(get_db),
):
    return await svc.list_photos(session, horse_id, part_code)


@router.post(
    "/horses/{horse_id}/photos/{slot}",
    response_model=PhotoDetail,
    status_code=201,
    tags=["photos"],
    summary="Upload a photo with metadata into a slot",
    description=UPLOAD_DOC,
    responses={**R404, 413: {"description": "Photo larger than 10MB"}, 422: {"description": "Validation error"}},
)
async def upload_photo(
    horse_id: HorseId,
    slot: Annotated[PartCode, Path(description="Slot / part code")],
    photo: Annotated[UploadFile, File(description="Image file (image/jpeg or image/png), max 10MB")],
    metadata: Annotated[
        str,
        Form(
            description="JSON string of the capture metadata (see endpoint description for the full schema)",
            examples=[METADATA_EXAMPLE],
        ),
    ],
    recognized_microchip_number: Annotated[
        str | None,
        Form(alias="recognizedMicrochipNumber", description="Required when slot=microchip: 15 digits", examples=["410123456789012"]),
    ] = None,
    evidence_source: Annotated[
        ChipInputMethod | None,
        Form(alias="evidenceSource", description="Required when slot=microchip: ocr | manual"),
    ] = None,
    session: AsyncSession = Depends(get_db),
):
    return await svc.upload_photo(session, horse_id, slot, photo, metadata, recognized_microchip_number, evidence_source)


@router.put(
    "/horses/{horse_id}/photos/{slot}/representative",
    response_model=PhotoDetail,
    responses=R404,
    tags=["photos"],
    summary="Set the representative photo of a horse+slot",
    description="Sets the given photo `isSelected=true` and every other photo of the same horse+slot to false.",
)
async def set_representative(
    horse_id: HorseId,
    slot: Annotated[PartCode, Path(description="Slot / part code")],
    body: RepresentativeBody,
    session: AsyncSession = Depends(get_db),
):
    return await svc.set_representative(session, horse_id, slot, body.photo_id)


@router.get(
    "/photos/{photo_id}/download-url",
    response_model=DownloadUrl,
    responses=R404,
    tags=["photos"],
    summary="Presigned download URL (Content-Disposition: attachment)",
)
async def download_url(
    photo_id: Annotated[int, Path(gt=0, le=2147483647, description="Photo ID")],
    session: AsyncSession = Depends(get_db),
):
    return await svc.download_url(session, photo_id)
