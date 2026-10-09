from datetime import datetime

from pydantic import Field

from src.schemas.common import CamelModel


class Gps(CamelModel):
    latitude: float = Field(ge=-90, le=90, description="Latitude", examples=[37.5665])
    longitude: float = Field(ge=-180, le=180, description="Longitude", examples=[126.978])
    accuracy_meters: float = Field(ge=0, description="Accuracy in meters", examples=[5.0])


class PhotoMetadataRead(CamelModel):
    id: int = Field(description="Metadata ID", examples=[1])
    photo_id: int = Field(description="Photo ID", examples=[1])
    captured_at: datetime = Field(description="Captured at (UTC)", examples=["2026-10-09T01:00:00Z"])
    gps: Gps | None = Field(default=None, description="GPS or null", examples=[None])
    iso: int | None = Field(default=None, description="ISO", examples=[100])
    exposure_time_ns: int | None = Field(default=None, description="Exposure ns", examples=[8000000])
    f_number: float | None = Field(default=None, description="F number", examples=[1.8])
    focal_length_mm: float | None = Field(default=None, description="Focal length mm", examples=[6.9])
    zoom_ratio: float | None = Field(default=None, description="Zoom ratio", examples=[1.0])
    af_state: str | None = Field(default=None, description="AF state", examples=["FOCUSED_LOCKED"])
    ambient_lux: float | None = Field(default=None, description="Ambient lux", examples=[300.0])
    blur_score: float = Field(description="Blur score", examples=[12.5])
    brightness: float = Field(description="Brightness 0..1", examples=[0.5])
    device_model: str = Field(description="Device model", examples=["SM-S918N"])
    meta_sha256: str = Field(description="Metadata SHA-256", examples=["0" * 64])

    @classmethod
    def from_orm_row(cls, m) -> "PhotoMetadataRead":
        gps = None
        if m.gps_lat is not None:
            gps = Gps(latitude=m.gps_lat, longitude=m.gps_lng, accuracy_meters=m.gps_accuracy_m)
        data = {k: getattr(m, k) for k in cls.model_fields if k != "gps"}
        return cls(gps=gps, **data)
