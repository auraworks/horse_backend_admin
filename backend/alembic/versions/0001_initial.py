"""initial

Revision ID: 0001_initial
Revises: 
Create Date: 2026-10-09 16:05:39.195063
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = '0001_initial'
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    bind = op.get_bind()
    postgresql.ENUM('ocr', 'manual', name='chip_input_method').create(bind, checkfirst=True)
    postgresql.ENUM('front_full', 'forehead_close', 'left_full', 'right_full', 'right_rear_oblique', 'left_rear_oblique', 'microchip', name='part_code').create(bind, checkfirst=True)
    postgresql.ENUM('jpeg', 'png', name='file_format').create(bind, checkfirst=True)
    op.create_table('horses',
    sa.Column('id', sa.Integer(), nullable=False, comment='말 ID'),
    sa.Column('microchip_no', sa.String(length=15), nullable=False, comment='마이크로칩 번호 15자리 (microchip_no)'),
    sa.Column('chip_input_method', postgresql.ENUM('ocr', 'manual', name='chip_input_method', create_type=False), nullable=True, comment='칩 번호 입력 방식 ocr|manual (chip_input_method)'),
    sa.Column('horse_no', sa.String(length=20), nullable=True, comment='마번 (KRA API)'),
    sa.Column('horse_name', sa.String(length=100), nullable=True, comment='마명 (KRA API)'),
    sa.Column('birth_date', sa.Date(), nullable=True, comment='생년월일 (KRA API)'),
    sa.Column('sex', sa.String(length=10), nullable=True, comment='성별 (KRA API)'),
    sa.Column('coat_color', sa.String(length=30), nullable=True, comment='모색 (KRA API)'),
    sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False, comment='생성일시'),
    sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False, comment='수정일시'),
    sa.CheckConstraint("microchip_no ~ '^[0-9]{15}$'", name='ck_horses_microchip_no_15_digits'),
    sa.PrimaryKeyConstraint('id'),
    sa.UniqueConstraint('microchip_no')
    )
    op.create_table('photos',
    sa.Column('id', sa.Integer(), nullable=False, comment='사진 ID'),
    sa.Column('horse_id', sa.Integer(), nullable=False, comment='말 ID (horse_id)'),
    sa.Column('part_code', postgresql.ENUM('front_full', 'forehead_close', 'left_full', 'right_full', 'right_rear_oblique', 'left_rear_oblique', 'microchip', name='part_code', create_type=False), nullable=False, comment='촬영 부위 코드 (partCode)'),
    sa.Column('is_selected', sa.Boolean(), server_default=sa.text('false'), nullable=False, comment='대표 사진 여부 (isSelected)'),
    sa.Column('file_name', sa.String(length=255), nullable=False, comment='파일명 (fileName)'),
    sa.Column('file_format', postgresql.ENUM('jpeg', 'png', name='file_format', create_type=False), nullable=False, comment='파일 형식 jpeg|png (fileFormat)'),
    sa.Column('content_type', sa.String(length=50), nullable=False, comment='콘텐츠 타입 (contentType)'),
    sa.Column('file_size', sa.BigInteger(), nullable=False, comment='파일 크기 바이트 (fileSize)'),
    sa.Column('file_sha256', sa.CHAR(length=64), nullable=False, comment='파일 SHA-256 (fileSha256)'),
    sa.Column('width', sa.Integer(), nullable=False, comment='가로 픽셀 (width)'),
    sa.Column('height', sa.Integer(), nullable=False, comment='세로 픽셀 (height)'),
    sa.Column('check_codes', postgresql.ARRAY(sa.Text()), server_default=sa.text("'{}'"), nullable=False, comment='앱 품질 검사 오류 코드 목록 (errorCodes/checkCodes)'),
    sa.Column('recognized_microchip_no', sa.String(length=15), nullable=True, comment='인식된 마이크로칩 번호 (recognizedMicrochipNumber)'),
    sa.Column('evidence_source', postgresql.ENUM('ocr', 'manual', name='chip_input_method', create_type=False), nullable=True, comment='칩 번호 증빙 출처 ocr|manual (evidenceSource)'),
    sa.Column('s3_key', sa.String(length=512), nullable=False, comment='S3 객체 키'),
    sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False, comment='생성일시'),
    sa.CheckConstraint("file_sha256 ~ '^[0-9a-f]{64}$'", name='ck_photos_file_sha256_hex'),
    sa.CheckConstraint('file_size > 0', name='ck_photos_file_size_positive'),
    sa.CheckConstraint('height > 0', name='ck_photos_height_positive'),
    sa.CheckConstraint('width > 0', name='ck_photos_width_positive'),
    sa.ForeignKeyConstraint(['horse_id'], ['horses.id'], ondelete='CASCADE'),
    sa.PrimaryKeyConstraint('id'),
    sa.UniqueConstraint('s3_key')
    )
    op.create_index(op.f('ix_photos_horse_id'), 'photos', ['horse_id'], unique=False)
    op.create_index('uq_photos_selected_per_part', 'photos', ['horse_id', 'part_code'], unique=True, postgresql_where=sa.text('is_selected'))
    op.create_table('photo_metadata',
    sa.Column('id', sa.Integer(), nullable=False, comment='메타데이터 ID'),
    sa.Column('photo_id', sa.Integer(), nullable=False, comment='사진 ID'),
    sa.Column('captured_at', sa.DateTime(timezone=True), nullable=False, comment='촬영 일시 UTC (capturedAt)'),
    sa.Column('gps_lat', sa.Double(), nullable=True, comment='GPS 위도 (gps.latitude)'),
    sa.Column('gps_lng', sa.Double(), nullable=True, comment='GPS 경도 (gps.longitude)'),
    sa.Column('gps_accuracy_m', sa.Double(), nullable=True, comment='GPS 정확도 미터 (gps.accuracyMeters)'),
    sa.Column('iso', sa.Integer(), nullable=True, comment='ISO 감도 (iso)'),
    sa.Column('exposure_time_ns', sa.BigInteger(), nullable=True, comment='노출 시간 나노초 (exposureTimeNs)'),
    sa.Column('f_number', sa.Double(), nullable=True, comment='조리개 값 (fNumber)'),
    sa.Column('focal_length_mm', sa.Double(), nullable=True, comment='초점 거리 mm (focalLengthMm)'),
    sa.Column('zoom_ratio', sa.Double(), nullable=True, comment='줌 배율 (zoomRatio)'),
    sa.Column('af_state', sa.String(length=50), nullable=True, comment='오토포커스 상태 (afState)'),
    sa.Column('ambient_lux', sa.Double(), nullable=True, comment='주변 조도 lux (ambientLux)'),
    sa.Column('blur_score', sa.Double(), nullable=False, comment='흐림 점수 (blurScore)'),
    sa.Column('brightness', sa.Double(), nullable=False, comment='밝기 0~1 (brightness)'),
    sa.Column('device_model', sa.String(length=100), nullable=False, comment='촬영 기기 모델 (deviceModel)'),
    sa.Column('meta_sha256', sa.CHAR(length=64), nullable=False, comment='메타데이터 SHA-256 (metaSha256)'),
    sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False, comment='생성일시'),
    sa.CheckConstraint("device_model <> ''", name='ck_photo_metadata_device_model_nonempty'),
    sa.CheckConstraint("meta_sha256 ~ '^[0-9a-f]{64}$'", name='ck_photo_metadata_meta_sha256_hex'),
    sa.CheckConstraint('(gps_lat IS NULL AND gps_lng IS NULL AND gps_accuracy_m IS NULL) OR (gps_lat IS NOT NULL AND gps_lng IS NOT NULL AND gps_accuracy_m IS NOT NULL AND gps_lat BETWEEN -90 AND 90 AND gps_lng BETWEEN -180 AND 180 AND gps_accuracy_m >= 0)', name='ck_photo_metadata_gps_all_or_none'),
    sa.CheckConstraint('ambient_lux >= 0', name='ck_photo_metadata_lux_nonneg'),
    sa.CheckConstraint('blur_score >= 0', name='ck_photo_metadata_blur_nonneg'),
    sa.CheckConstraint('brightness BETWEEN 0 AND 1', name='ck_photo_metadata_brightness_range'),
    sa.CheckConstraint('exposure_time_ns > 0', name='ck_photo_metadata_exposure_positive'),
    sa.CheckConstraint('f_number > 0', name='ck_photo_metadata_f_number_positive'),
    sa.CheckConstraint('focal_length_mm > 0', name='ck_photo_metadata_focal_positive'),
    sa.CheckConstraint('iso > 0', name='ck_photo_metadata_iso_positive'),
    sa.CheckConstraint('zoom_ratio > 0', name='ck_photo_metadata_zoom_positive'),
    sa.ForeignKeyConstraint(['photo_id'], ['photos.id'], ondelete='CASCADE'),
    sa.PrimaryKeyConstraint('id'),
    sa.UniqueConstraint('photo_id')
    )


def downgrade() -> None:
    op.drop_table('photo_metadata')
    op.drop_index('uq_photos_selected_per_part', table_name='photos', postgresql_where=sa.text('is_selected'))
    op.drop_index(op.f('ix_photos_horse_id'), table_name='photos')
    op.drop_table('photos')
    op.drop_table('horses')
    bind = op.get_bind()
    for name in ('file_format', 'part_code', 'chip_input_method'):
        postgresql.ENUM(name=name).drop(bind, checkfirst=True)
