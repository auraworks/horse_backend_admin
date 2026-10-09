from datetime import date, datetime

from sqlalchemy import CheckConstraint, Date, DateTime, Enum, String, func
from sqlalchemy.orm import Mapped, mapped_column

from src.database import Base
from src.models.enums import ChipInputMethod


def pg_enum(enum_cls: type, name: str) -> Enum:
    return Enum(enum_cls, name=name, values_callable=lambda e: [m.value for m in e])


class Horse(Base):
    __tablename__ = "horses"
    __table_args__ = (
        CheckConstraint("microchip_no ~ '^[0-9]{15}$'", name="ck_horses_microchip_no_15_digits"),
    )

    id: Mapped[int] = mapped_column(primary_key=True, comment="말 ID")
    microchip_no: Mapped[str] = mapped_column(
        String(15), unique=True, nullable=False, comment="마이크로칩 번호 15자리 (microchip_no)"
    )
    chip_input_method: Mapped[ChipInputMethod | None] = mapped_column(
        pg_enum(ChipInputMethod, "chip_input_method"), comment="칩 번호 입력 방식 ocr|manual (chip_input_method)"
    )
    horse_no: Mapped[str | None] = mapped_column(String(20), comment="마번 (KRA API)")
    horse_name: Mapped[str | None] = mapped_column(String(100), comment="마명 (KRA API)")
    birth_date: Mapped[date | None] = mapped_column(Date, comment="생년월일 (KRA API)")
    sex: Mapped[str | None] = mapped_column(String(10), comment="성별 (KRA API)")
    coat_color: Mapped[str | None] = mapped_column(String(30), comment="모색 (KRA API)")
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False, comment="생성일시"
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
        comment="수정일시",
    )
