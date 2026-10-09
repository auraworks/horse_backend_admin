from datetime import datetime

from pydantic import Field

from src.models.enums import ChipInputMethod, FileFormat, PartCode
from src.schemas.common import CamelModel
from src.schemas.photo_metadata import Gps

SHA = r"^[0-9a-f]{64}$"
SHA_EX = "a3f5c1d2e4b6978081726354abcdef0123456789abcdef0123456789abcdef01"


class MetadataInput(CamelModel):
    """Capture metadata sent by the mobile app as the `metadata` multipart field (JSON string)."""

    file_format: FileFormat = Field(description="File format; must match the photo content-type (image/jpeg | image/png)", examples=["jpeg"])
    file_size: int = Field(gt=0, description="File size in bytes", examples=[2345678])
    file_sha256: str = Field(pattern=SHA, description="SHA-256 of the file (64 lowercase hex)", examples=[SHA_EX])
    width: int = Field(gt=0, description="Width in px", examples=[4000])
    height: int = Field(gt=0, description="Height in px", examples=[3000])
    error_codes: list[str] = Field(description="App quality-check error codes ([] allowed)", examples=[["BLUR"]])
    captured_at: datetime = Field(description="Capture time, UTC ISO 8601", examples=["2026-10-09T01:23:45Z"])
    gps: Gps | None = Field(default=None, description="GPS or null; if present all three fields are required", examples=[{"latitude": 37.5665, "longitude": 126.978, "accuracyMeters": 4.5}])
    iso: int | None = Field(default=None, gt=0, description="ISO (>0) or null", examples=[100])
    exposure_time_ns: int | None = Field(default=None, gt=0, description="Exposure time in ns (>0) or null", examples=[8000000])
    f_number: float | None = Field(default=None, gt=0, description="F-number (>0) or null", examples=[1.8])
    focal_length_mm: float | None = Field(default=None, gt=0, description="Focal length mm (>0) or null", examples=[6.9])
    zoom_ratio: float | None = Field(default=None, gt=0, description="Zoom ratio (>0) or null", examples=[1.0])
    af_state: str | None = Field(default=None, description="AF state or null", examples=["FOCUSED_LOCKED"])
    ambient_lux: float | None = Field(default=None, ge=0, description="Ambient lux (>=0) or null", examples=[300.0])
    blur_score: float = Field(ge=0, description="Blur score (>=0)", examples=[12.5])
    brightness: float = Field(ge=0, le=1, description="Brightness in [0,1]", examples=[0.52])
    device_model: str = Field(min_length=1, description="Device model (non-empty)", examples=["SM-S918N"])
    meta_sha256: str = Field(pattern=SHA, description="SHA-256 of the metadata (stored as sent)", examples=[SHA_EX])


METADATA_EXAMPLE = MetadataInput(
    file_format=FileFormat.jpeg, file_size=2345678, file_sha256=SHA_EX, width=4000, height=3000,
    error_codes=[], captured_at=datetime(2026, 10, 9, 1, 23, 45),
    gps=Gps(latitude=37.5665, longitude=126.978, accuracy_meters=4.5),
    iso=100, exposure_time_ns=8000000, f_number=1.8, focal_length_mm=6.9, zoom_ratio=1.0,
    af_state="FOCUSED_LOCKED", ambient_lux=300.0, blur_score=12.5, brightness=0.52,
    device_model="SM-S918N", meta_sha256=SHA_EX,
).model_dump_json(by_alias=True)


class PhotoMetadataOut(CamelModel):
    captured_at: datetime = Field(description="Captured at (UTC)", examples=["2026-10-09T01:23:45Z"])
    gps: Gps | None = Field(default=None, description="GPS or null")
    iso: int | None = Field(default=None, description="ISO", examples=[100])
    exposure_time_ns: int | None = Field(default=None, description="Exposure ns", examples=[8000000])
    f_number: float | None = Field(default=None, description="F number", examples=[1.8])
    focal_length_mm: float | None = Field(default=None, description="Focal length mm", examples=[6.9])
    zoom_ratio: float | None = Field(default=None, description="Zoom ratio", examples=[1.0])
    af_state: str | None = Field(default=None, description="AF state", examples=["FOCUSED_LOCKED"])
    ambient_lux: float | None = Field(default=None, description="Ambient lux", examples=[300.0])
    blur_score: float = Field(description="Blur score", examples=[12.5])
    brightness: float = Field(description="Brightness 0..1", examples=[0.52])
    device_model: str = Field(description="Device model", examples=["SM-S918N"])
    meta_sha256: str = Field(description="Metadata SHA-256", examples=[SHA_EX])


class PhotoDetail(CamelModel):
    id: int = Field(description="Photo ID", examples=[1])
    horse_id: int = Field(description="Horse ID", examples=[1])
    part_code: PartCode = Field(description="Shot part code", examples=["front_full"])
    part_label: str = Field(description="Korean part label", examples=["정면전체"])
    is_selected: bool = Field(description="Representative photo of its horse+part", examples=[True])
    file_name: str = Field(description="File name", examples=["a1b2.jpg"])
    file_format: FileFormat = Field(description="File format", examples=["jpeg"])
    content_type: str = Field(description="Content type", examples=["image/jpeg"])
    file_size: int = Field(description="Size in bytes", examples=[2345678])
    file_sha256: str = Field(description="SHA-256 of the file", examples=[SHA_EX])
    width: int = Field(description="Width px", examples=[4000])
    height: int = Field(description="Height px", examples=[3000])
    check_codes: list[str] = Field(description="App quality-check codes", examples=[["BLUR"]])
    recognized_microchip_no: str | None = Field(default=None, description="Recognized chip number (microchip slot)", examples=["410123456789012"])
    evidence_source: ChipInputMethod | None = Field(default=None, description="Chip evidence source (microchip slot)", examples=["ocr"])
    created_at: datetime = Field(description="Created at", examples=["2026-10-09T01:30:00Z"])
    view_url: str = Field(description="Presigned inline URL (valid 3600s)", examples=["https://s3.../horses/1/front_full/x.jpg?X-Amz-..."])
    metadata: PhotoMetadataOut | None = Field(default=None, description="Capture metadata or null")


class RepresentativeBody(CamelModel):
    photo_id: int = Field(gt=0, le=2147483647, description="Photo to make representative (must belong to this horse and slot)", examples=[12])


class DownloadUrl(CamelModel):
    url: str = Field(description="Presigned URL with Content-Disposition: attachment", examples=["https://s3.../...?X-Amz-..."])
    expires_in: int = Field(description="Seconds until expiry", examples=[3600])
    file_name: str = Field(description="Suggested file name", examples=["a1b2.jpg"])


class PartInfo(CamelModel):
    code: PartCode = Field(description="Part code", examples=["front_full"])
    label: str = Field(description="Korean label", examples=["정면전체"])
    order: int = Field(description="Display order (1-based)", examples=[1])


class Stats(CamelModel):
    horse_count: int = Field(description="Total horses", examples=[12])
    photo_count: int = Field(description="Total photos", examples=[80])
    horses_with_all_six_parts: int = Field(description="Horses with >=1 photo in each of the 6 body parts (microchip excluded)", examples=[5])
