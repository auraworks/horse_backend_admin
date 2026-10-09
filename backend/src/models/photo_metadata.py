from datetime import datetime

from sqlalchemy import (
    CHAR,
    BigInteger,
    CheckConstraint,
    DateTime,
    Double,
    ForeignKey,
    Integer,
    String,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column

from src.database import Base


class PhotoMetadata(Base):
    __tablename__ = "photo_metadata"
    __table_args__ = (
        CheckConstraint(
            "(gps_lat IS NULL AND gps_lng IS NULL AND gps_accuracy_m IS NULL) OR "
            "(gps_lat IS NOT NULL AND gps_lng IS NOT NULL AND gps_accuracy_m IS NOT NULL "
            "AND gps_lat BETWEEN -90 AND 90 AND gps_lng BETWEEN -180 AND 180 AND gps_accuracy_m >= 0)",
            name="ck_photo_metadata_gps_all_or_none",
        ),
        CheckConstraint("iso > 0", name="ck_photo_metadata_iso_positive"),
        CheckConstraint("exposure_time_ns > 0", name="ck_photo_metadata_exposure_positive"),
        CheckConstraint("f_number > 0", name="ck_photo_metadata_f_number_positive"),
        CheckConstraint("focal_length_mm > 0", name="ck_photo_metadata_focal_positive"),
        CheckConstraint("zoom_ratio > 0", name="ck_photo_metadata_zoom_positive"),
        CheckConstraint("ambient_lux >= 0", name="ck_photo_metadata_lux_nonneg"),
        CheckConstraint("blur_score >= 0", name="ck_photo_metadata_blur_nonneg"),
        CheckConstraint("brightness BETWEEN 0 AND 1", name="ck_photo_metadata_brightness_range"),
        CheckConstraint("device_model <> ''", name="ck_photo_metadata_device_model_nonempty"),
        CheckConstraint("meta_sha256 ~ '^[0-9a-f]{64}$'", name="ck_photo_metadata_meta_sha256_hex"),
    )

    id: Mapped[int] = mapped_column(primary_key=True, comment="메타데이터 ID")
    photo_id: Mapped[int] = mapped_column(
        ForeignKey("photos.id", ondelete="CASCADE"), unique=True, nullable=False, comment="사진 ID"
    )
    captured_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, comment="촬영 일시 UTC (capturedAt)"
    )
    gps_lat: Mapped[float | None] = mapped_column(Double, comment="GPS 위도 (gps.latitude)")
    gps_lng: Mapped[float | None] = mapped_column(Double, comment="GPS 경도 (gps.longitude)")
    gps_accuracy_m: Mapped[float | None] = mapped_column(Double, comment="GPS 정확도 미터 (gps.accuracyMeters)")
    iso: Mapped[int | None] = mapped_column(Integer, comment="ISO 감도 (iso)")
    exposure_time_ns: Mapped[int | None] = mapped_column(BigInteger, comment="노출 시간 나노초 (exposureTimeNs)")
    f_number: Mapped[float | None] = mapped_column(Double, comment="조리개 값 (fNumber)")
    focal_length_mm: Mapped[float | None] = mapped_column(Double, comment="초점 거리 mm (focalLengthMm)")
    zoom_ratio: Mapped[float | None] = mapped_column(Double, comment="줌 배율 (zoomRatio)")
    af_state: Mapped[str | None] = mapped_column(String(50), comment="오토포커스 상태 (afState)")
    ambient_lux: Mapped[float | None] = mapped_column(Double, comment="주변 조도 lux (ambientLux)")
    blur_score: Mapped[float] = mapped_column(Double, nullable=False, comment="흐림 점수 (blurScore)")
    brightness: Mapped[float] = mapped_column(Double, nullable=False, comment="밝기 0~1 (brightness)")
    device_model: Mapped[str] = mapped_column(String(100), nullable=False, comment="촬영 기기 모델 (deviceModel)")
    meta_sha256: Mapped[str] = mapped_column(CHAR(64), nullable=False, comment="메타데이터 SHA-256 (metaSha256)")
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False, comment="생성일시"
    )
