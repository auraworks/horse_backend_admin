from datetime import datetime, timezone

import pytest
from sqlalchemy.exc import IntegrityError

from src.models import ChipInputMethod, FileFormat, Horse, PartCode, Photo, PhotoMetadata

SHA = "a" * 64


def make_horse(chip: str = "123456789012345") -> Horse:
    return Horse(microchip_no=chip, chip_input_method=ChipInputMethod.ocr)


def make_photo(horse_id: int, part=PartCode.front_full, selected=False, key=None) -> Photo:
    return Photo(
        horse_id=horse_id,
        part_code=part,
        is_selected=selected,
        file_name="a.jpg",
        file_format=FileFormat.jpeg,
        content_type="image/jpeg",
        file_size=100,
        file_sha256=SHA,
        width=10,
        height=10,
        check_codes=[],
        s3_key=key or f"horses/{horse_id}/{part.value}/{id(object())}.jpg",
    )


def make_meta(photo_id: int, **kw) -> PhotoMetadata:
    base = dict(
        photo_id=photo_id,
        captured_at=datetime(2026, 10, 9, tzinfo=timezone.utc),
        blur_score=1.0,
        brightness=0.5,
        device_model="Pixel",
        meta_sha256=SHA,
    )
    base.update(kw)
    return PhotoMetadata(**base)


async def expect_reject(session, obj):
    session.add(obj)
    with pytest.raises(IntegrityError):
        await session.flush()
    await session.rollback()


async def test_valid_rows_roundtrip(db_session):
    horse = make_horse("111111111111111")
    db_session.add(horse)
    await db_session.flush()
    photo = make_photo(horse.id, selected=True)
    db_session.add(photo)
    await db_session.flush()
    db_session.add(make_meta(photo.id, gps_lat=37.5, gps_lng=127.0, gps_accuracy_m=5.0))
    await db_session.flush()
    assert photo.check_codes == []
    await db_session.rollback()


async def test_rejects_14_digit_microchip(db_session):
    await expect_reject(db_session, make_horse("12345678901234"))


async def test_rejects_uppercase_sha(db_session):
    horse = make_horse("222222222222222")
    db_session.add(horse)
    await db_session.flush()
    photo = make_photo(horse.id)
    photo.file_sha256 = "A" * 64
    await expect_reject(db_session, photo)


async def test_rejects_partial_gps(db_session):
    horse = make_horse("333333333333333")
    db_session.add(horse)
    await db_session.flush()
    photo = make_photo(horse.id)
    db_session.add(photo)
    await db_session.flush()
    await expect_reject(db_session, make_meta(photo.id, gps_lat=37.5))


async def test_rejects_brightness_out_of_range(db_session):
    horse = make_horse("444444444444444")
    db_session.add(horse)
    await db_session.flush()
    photo = make_photo(horse.id)
    db_session.add(photo)
    await db_session.flush()
    await expect_reject(db_session, make_meta(photo.id, brightness=1.5))


async def test_rejects_two_selected_same_horse_part(db_session):
    horse = make_horse("555555555555555")
    db_session.add(horse)
    await db_session.flush()
    db_session.add(make_photo(horse.id, selected=True, key="k/1"))
    await db_session.flush()
    await expect_reject(db_session, make_photo(horse.id, selected=True, key="k/2"))


def test_part_labels_and_order():
    assert [p.order for p in PartCode] == [1, 2, 3, 4, 5, 6, 7]
    assert PartCode.front_full.label == "정면전체"
    assert PartCode.microchip.label == "마이크로칩 증빙"
