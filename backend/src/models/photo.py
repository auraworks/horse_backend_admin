from datetime import datetime

from sqlalchemy import (
    CHAR,
    BigInteger,
    Boolean,
    CheckConstraint,
    DateTime,
    ForeignKey,
    Index,
    Integer,
    String,
    Text,
    func,
    text,
)
from sqlalchemy.dialects.postgresql import ARRAY
from sqlalchemy.orm import Mapped, mapped_column

from src.database import Base
from src.models.enums import ChipInputMethod, FileFormat, PartCode
from src.models.horse import pg_enum


class Photo(Base):
    __tablename__ = "photos"
    __table_args__ = (
        CheckConstraint("file_size > 0", name="ck_photos_file_size_positive"),
        CheckConstraint("file_sha256 ~ '^[0-9a-f]{64}$'", name="ck_photos_file_sha256_hex"),
        CheckConstraint("width > 0", name="ck_photos_width_positive"),
        CheckConstraint("height > 0", name="ck_photos_height_positive"),
        Index(
            "uq_photos_selected_per_part",
            "horse_id",
            "part_code",
            unique=True,
            postgresql_where=text("is_selected"),
        ),
    )

    id: Mapped[int] = mapped_column(primary_key=True, comment="사진 ID")
    horse_id: Mapped[int] = mapped_column(
        ForeignKey("horses.id", ondelete="CASCADE"), nullable=False, index=True, comment="말 ID (horse_id)"
    )
    part_code: Mapped[PartCode] = mapped_column(
        pg_enum(PartCode, "part_code"), nullable=False, comment="촬영 부위 코드 (partCode)"
    )
    is_selected: Mapped[bool] = mapped_column(
        Boolean, nullable=False, server_default=text("false"), comment="대표 사진 여부 (isSelected)"
    )
    file_name: Mapped[str] = mapped_column(String(255), nullable=False, comment="파일명 (fileName)")
    file_format: Mapped[FileFormat] = mapped_column(
        pg_enum(FileFormat, "file_format"), nullable=False, comment="파일 형식 jpeg|png (fileFormat)"
    )
    content_type: Mapped[str] = mapped_column(String(50), nullable=False, comment="콘텐츠 타입 (contentType)")
    file_size: Mapped[int] = mapped_column(BigInteger, nullable=False, comment="파일 크기 바이트 (fileSize)")
    file_sha256: Mapped[str] = mapped_column(CHAR(64), nullable=False, comment="파일 SHA-256 (fileSha256)")
    width: Mapped[int] = mapped_column(Integer, nullable=False, comment="가로 픽셀 (width)")
    height: Mapped[int] = mapped_column(Integer, nullable=False, comment="세로 픽셀 (height)")
    check_codes: Mapped[list[str]] = mapped_column(
        ARRAY(Text),
        nullable=False,
        server_default=text("'{}'"),
        comment="앱 품질 검사 오류 코드 목록 (errorCodes/checkCodes)",
    )
    recognized_microchip_no: Mapped[str | None] = mapped_column(
        String(15), comment="인식된 마이크로칩 번호 (recognizedMicrochipNumber)"
    )
    evidence_source: Mapped[ChipInputMethod | None] = mapped_column(
        pg_enum(ChipInputMethod, "chip_input_method"), comment="칩 번호 증빙 출처 ocr|manual (evidenceSource)"
    )
    s3_key: Mapped[str] = mapped_column(String(512), unique=True, nullable=False, comment="S3 객체 키")
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False, comment="생성일시"
    )
