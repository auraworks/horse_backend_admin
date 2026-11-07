import json
from typing import Annotated

from fastapi import APIRouter, Depends, File, Form, HTTPException, Path, Query, UploadFile
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src.models import Horse
from src.models.enums import ChipInputMethod, PartCode
from src.routers.responses import R404
from src.schemas.horse import HorseRead
from src.schemas.upload import (
    METADATA_EXAMPLE,
    CompleteUploadRequest,
    DownloadUrl,
    MetadataInput,
    PhotoDetail,
    RepresentativeBody,
    UploadUrlRequest,
    UploadUrlResponse,
)
from src.services import horse_photos as svc
from src.utils.deps import get_db

router = APIRouter()

HorseId = Annotated[int, Path(gt=0, le=2147483647, description="Horse ID")]

UPLOAD_DOC = (
    "Multipart upload of one photo into a slot (`front_full`, `forehead_close`, `left_full`, `right_full`, "
    "`right_rear_oblique`, `left_rear_oblique`, `microchip`).\n\n"
    "**Files over 10MB:** API Gateway rejects request bodies above 10MB, so use the presigned flow instead "
    "(`POST .../upload-url` -> POST the file to S3 -> `POST .../complete`), which accepts up to 100MB.\n\n"
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
    responses={**R404, 413: {"description": "Photo larger than 10MB (use the presigned upload flow)"}, 422: {"description": "Validation error"}},
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


PRESIGNED_DOC = (
    "Presigned direct-to-S3 upload for photos up to 100MB (bypasses API Gateway's 10MB body limit).\n\n"
    "1. `POST /horses/{horseId}/photos/{slot}/upload-url` with `{fileFormat, fileSize}` -> `uploadUrl`, `fields`, `uploadKey`.\n"
    "2. `POST uploadUrl` as `multipart/form-data` **to S3, without X-API-Key**: every entry of `fields` as a form field "
    "(verbatim), then the file as the **last** part named `file`. S3 answers `204`. "
    "S3 itself rejects wrong Content-Type, files over `maxBytes`, or an expired form (`403`).\n"
    "3. `POST /horses/{horseId}/photos/{slot}/complete` with `{uploadKey, fileName, metadata, recognizedMicrochipNumber?, "
    "evidenceSource?}` -> `201 PhotoDetail`. `metadata.fileSize` must equal the uploaded size.\n\n"
    "Unregistered uploads under `incoming/` are deleted automatically after 1 day."
)


@router.post(
    "/horses/{horse_id}/photos/{slot}/upload-url",
    response_model=UploadUrlResponse,
    tags=["photos"],
    summary="Presigned upload step 1: get an S3 upload form (up to 100MB)",
    description=PRESIGNED_DOC,
    responses={**R404, 413: {"description": "fileSize larger than 100MB"}, 422: {"description": "Validation error"}},
)
async def create_upload_url(
    horse_id: HorseId,
    slot: Annotated[PartCode, Path(description="Slot / part code")],
    body: UploadUrlRequest,
    session: AsyncSession = Depends(get_db),
):
    return await svc.create_upload_url(session, horse_id, slot, body)


@router.post(
    "/horses/{horse_id}/photos/{slot}/complete",
    response_model=PhotoDetail,
    status_code=201,
    tags=["photos"],
    summary="Presigned upload step 3: register the photo uploaded to S3",
    description=PRESIGNED_DOC,
    responses={
        **R404,
        409: {"description": "This uploadKey was already registered"},
        413: {"description": "Uploaded object larger than 100MB"},
        422: {"description": "Validation error / object not uploaded / size or type mismatch"},
    },
)
async def complete_upload(
    horse_id: HorseId,
    slot: Annotated[PartCode, Path(description="Slot / part code")],
    body: CompleteUploadRequest,
    session: AsyncSession = Depends(get_db),
):
    return await svc.complete_upload(session, horse_id, slot, body)


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
