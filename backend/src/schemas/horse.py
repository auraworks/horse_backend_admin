from datetime import date, datetime

from pydantic import ConfigDict, Field

from src.models.enums import ChipInputMethod
from src.schemas.common import CamelModel

MICROCHIP = r"^[0-9]{15}$"


class HorseBase(CamelModel):
    chip_input_method: ChipInputMethod | None = Field(
        default=None, description="How the chip number was entered (ocr|manual)", examples=["ocr"]
    )
    horse_no: str | None = Field(default=None, max_length=20, description="마번 (KRA)", examples=["0012345"])
    horse_name: str | None = Field(default=None, max_length=100, description="마명 (KRA)", examples=["번개"])
    birth_date: date | None = Field(default=None, description="생년월일 (KRA)", examples=["2020-03-01"])
    sex: str | None = Field(default=None, max_length=10, description="성별 (KRA)", examples=["수"])
    coat_color: str | None = Field(default=None, max_length=30, description="모색 (KRA)", examples=["밤색"])


class HorseCreate(HorseBase):
    microchip_no: str = Field(pattern=MICROCHIP, description="Microchip number, exactly 15 digits", examples=["410123456789012"])


class HorseUpdate(HorseBase):
    model_config = ConfigDict(extra="forbid")
    microchip_no: str | None = Field(
        default=None, pattern=MICROCHIP, description="Microchip number, exactly 15 digits", examples=["410123456789012"]
    )


class HorseRead(HorseBase):
    id: int = Field(description="Horse ID", examples=[1])
    microchip_no: str = Field(description="Microchip number", examples=["410123456789012"])
    created_at: datetime = Field(description="Created at", examples=["2026-10-09T01:00:00Z"])
    updated_at: datetime = Field(description="Updated at", examples=["2026-10-09T01:00:00Z"])
