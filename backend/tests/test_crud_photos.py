from datetime import datetime, timezone

import pytest

from src.config import settings
from src.models import Horse, Photo, PhotoMetadata
from src.models.enums import FileFormat, PartCode

pytestmark = pytest.mark.usefixtures("clean_db")
URL = "/api/v1/photos"
TS = datetime(2026, 10, 9, tzinfo=timezone.utc)


async def seed(db, s3=None):
    horses = [Horse(microchip_no="410000000000001"), Horse(microchip_no="410000000000002")]
    db.add_all(horses)
    await db.flush()
    photos = []
    combos = [(horses[0], PartCode.front_full), (horses[0], PartCode.left_full), (horses[1], PartCode.front_full)]
    for i, (h, part) in enumerate(combos):
        key = f"horses/{h.id}/{part.value}/{i}.jpg"
        if s3:
            s3.put_object(Bucket=settings.S3_BUCKET, Key=key, Body=b"x")
        photos.append(
            Photo(horse_id=h.id, part_code=part, file_name=f"{i}.jpg", file_format=FileFormat.jpeg,
                  content_type="image/jpeg", file_size=10 + i, file_sha256="a" * 64, width=10, height=10,
                  s3_key=key, check_codes=["BLUR"])
        )
    db.add_all(photos)
    await db.flush()
    db.add(PhotoMetadata(photo_id=photos[0].id, captured_at=TS, gps_lat=37.5, gps_lng=127.0,
                         gps_accuracy_m=3.0, iso=100, blur_score=1.0, brightness=0.5,
                         device_model="X", meta_sha256="b" * 64))
    db.add(PhotoMetadata(photo_id=photos[1].id, captured_at=TS, blur_score=2.0, brightness=0.4,
                         device_model="Y", meta_sha256="c" * 64))
    await db.commit()
    return horses, photos


async def test_list_get(client, api_headers, db_session):
    horses, photos = await seed(db_session)
    body = (await client.get(URL, headers=api_headers)).json()
    assert body["count"] == 3 and body["page"] == 1
    row = body["data"][0]
    for k in ("id", "horseId", "partCode", "createdAt", "isSelected", "checkCodes", "fileSha256"):
        assert k in row
    assert "s3Key" not in row
    r = await client.get(URL, params={"horseId": f"eq.{horses[0].id}", "order": "createdAt.desc"}, headers=api_headers)
    assert r.json()["count"] == 2
    r = await client.get(URL, params={"partCode": "eq.left_full"}, headers=api_headers)
    assert r.json()["count"] == 1
    assert (await client.get(URL, params={"partCode": "eq.nope"}, headers=api_headers)).status_code == 400
    assert (await client.get(URL, params={"s3Key": "like.%"}, headers=api_headers)).status_code == 400
    r = await client.get(URL, params={"limit": 2, "page": 2}, headers=api_headers)
    assert len(r.json()["data"]) == 1 and r.json()["count"] == 3
    r = await client.get(f"{URL}/{photos[0].id}", headers=api_headers)
    assert r.status_code == 200 and r.json()["partCode"] == "front_full"
    assert (await client.get(f"{URL}/99999", headers=api_headers)).status_code == 404


async def test_patch_check_codes_only(client, api_headers, db_session):
    _, photos = await seed(db_session)
    pid = photos[0].id
    r = await client.patch(f"{URL}/{pid}", json={"checkCodes": ["DARK", "BLUR"]}, headers=api_headers)
    assert r.status_code == 200 and r.json()["checkCodes"] == ["DARK", "BLUR"]
    r = await client.patch(f"{URL}/{pid}", json={"checkCodes": []}, headers=api_headers)
    assert r.json()["checkCodes"] == []
    for bad in ({"isSelected": True}, {"s3Key": "x"}, {"fileSha256": "0" * 64}, {"partCode": "left_full"}):
        assert (await client.patch(f"{URL}/{pid}", json=bad, headers=api_headers)).status_code == 422
    assert (await client.patch(f"{URL}/99999", json={"checkCodes": []}, headers=api_headers)).status_code == 404


async def test_delete_removes_s3_object(client, api_headers, db_session, s3):
    _, photos = await seed(db_session, s3)
    r = await client.delete(f"{URL}/{photos[0].id}", headers=api_headers)
    assert r.status_code == 204
    assert (await client.get(f"{URL}/{photos[0].id}", headers=api_headers)).status_code == 404
    left = {o["Key"] for o in s3.list_objects_v2(Bucket=settings.S3_BUCKET)["Contents"]}
    assert photos[0].s3_key not in left and photos[1].s3_key in left
    assert (await client.delete(f"{URL}/{photos[0].id}", headers=api_headers)).status_code == 404
    assert (await client.get("/api/v1/photo-metadata", headers=api_headers)).json()["count"] == 1


async def test_no_generic_post(client, api_headers):
    assert (await client.post(URL, json={}, headers=api_headers)).status_code == 405


async def test_photo_metadata_list_get(client, api_headers, db_session):
    _, photos = await seed(db_session)
    MD = "/api/v1/photo-metadata"
    body = (await client.get(MD, params={"order": "blurScore.asc"}, headers=api_headers)).json()
    assert body["count"] == 2
    first, second = body["data"]
    assert first["gps"] == {"latitude": 37.5, "longitude": 127.0, "accuracyMeters": 3.0}
    assert second["gps"] is None and second["photoId"] == photos[1].id
    r = await client.get(MD, params={"photoId": f"eq.{photos[1].id}"}, headers=api_headers)
    assert r.json()["count"] == 1
    r = await client.get(f"{MD}/{first['id']}", headers=api_headers)
    assert r.status_code == 200 and r.json()["deviceModel"] == "X"
    assert (await client.get(f"{MD}/99999", headers=api_headers)).status_code == 404
    assert (await client.get(MD, params={"bogus": "eq.1"}, headers=api_headers)).status_code == 400
    assert (await client.post(MD, json={}, headers=api_headers)).status_code == 405


async def test_requires_api_key(client):
    for u in ("/api/v1/horses", "/api/v1/photos", "/api/v1/photo-metadata"):
        assert (await client.get(u)).status_code == 401
