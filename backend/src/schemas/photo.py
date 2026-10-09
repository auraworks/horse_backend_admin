from datetime import datetime

from pydantic import ConfigDict, Field

from src.models.enums import ChipInputMethod, FileFormat, PartCode
from src.schemas.common import CamelModel


class PhotoRead(CamelModel):
    id: int = Field(description="Photo ID", examples=[1])
    horse_id: int = Field(description="Horse ID", examples=[1])
    part_code: PartCode = Field(description="Shot part code", examples=["front_full"])
    is_selected: bool = Field(description="Representative photo of its horse+part", examples=[False])
    file_name: str = Field(description="File name", examples=["a1b2.jpg"])
    file_format: FileFormat = Field(description="File format", examples=["jpeg"])
    content_type: str = Field(description="Content type", examples=["image/jpeg"])
    file_size: int = Field(description="Size in bytes", examples=[123456])
    file_sha256: str = Field(description="SHA-256 of the file", examples=["0" * 64])
    width: int = Field(description="Width px", examples=[4000])
    height: int = Field(description="Height px", examples=[3000])
    check_codes: list[str] = Field(description="App quality-check codes", examples=[["BLUR"]])
    recognized_microchip_no: str | None = Field(default=None, description="Recognized chip number", examples=["410123456789012"])
    evidence_source: ChipInputMethod | None = Field(default=None, description="Chip evidence source", examples=["ocr"])
    created_at: datetime = Field(description="Created at", examples=["2026-10-09T01:00:00Z"])


class PhotoUpdate(CamelModel):
    """Only editable field is checkCodes; isSelected goes through the representative endpoint."""

    model_config = ConfigDict(extra="forbid")
    check_codes: list[str] = Field(description="App quality-check codes ([] allowed)", examples=[["BLUR", "DARK"]])
