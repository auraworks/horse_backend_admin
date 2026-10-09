import pytest

from src.config import settings
from src.models import Photo
from src.models.enums import FileFormat, PartCode

pytestmark = pytest.mark.usefixtures("clean_db")
URL = "/api/v1/horses"


async def mk(client, h, chip, **kw):
    r = await client.post(URL, json={"microchipNo": chip, **kw}, headers=h)
    assert r.status_code == 201, r.text
    return r.json()


async def test_create_and_get(client, api_headers):
    h = await mk(client, api_headers, "410000000000001", horseName="번개", horseNo="A1", chipInputMethod="ocr")
    assert h["microchipNo"] == "410000000000001" and h["horseName"] == "번개"
    assert h["chipInputMethod"] == "ocr" and "createdAt" in h and "updatedAt" in h
    r = await client.get(f"{URL}/{h['id']}", headers=api_headers)
    assert r.status_code == 200 and r.json()["id"] == h["id"]
    assert (await client.get(f"{URL}/99999", headers=api_headers)).status_code == 404


async def test_duplicate_409(client, api_headers):
    await mk(client, api_headers, "410000000000001")
    r = await client.post(URL, json={"microchipNo": "410000000000001"}, headers=api_headers)
    assert r.status_code == 409


@pytest.mark.parametrize("chip", ["123", "41000000000000a", "4100000000000012", ""])
async def test_bad_microchip_422(client, api_headers, chip):
    r = await client.post(URL, json={"microchipNo": chip}, headers=api_headers)
    assert r.status_code == 422


async def test_list_filter_order_pagination(client, api_headers):
    for i in range(5):
        await mk(client, api_headers, f"41000000000010{i}", horseNo=f"M{i}", horseName=f"말{i}")
    r = await client.get(URL, headers=api_headers)
    body = r.json()
    assert set(body) == {"data", "count", "page", "limit"} and body["count"] == 5
    r = await client.get(URL, params={"microchipNo": "eq.410000000000102"}, headers=api_headers)
    assert r.json()["count"] == 1 and r.json()["data"][0]["horseNo"] == "M2"
    # ilike with URL-encoded % exactly as the frontend sends it
    r = await client.get(f"{URL}?microchipNo=ilike.%25102%25", headers=api_headers)
    assert r.json()["count"] == 1
    r = await client.get(f"{URL}?horseNo=ilike.%25m4%25", headers=api_headers)
    assert r.json()["count"] == 1
    r = await client.get(URL, params={"horseName": "ilike.%말3%"}, headers=api_headers)
    assert r.json()["count"] == 1
    r = await client.get(URL, params={"horseNo": "in.(M0,M1)"}, headers=api_headers)
    assert r.json()["count"] == 2
    r = await client.get(URL, params={"birthDate": "is.null"}, headers=api_headers)
    assert r.json()["count"] == 5
    r = await client.get(URL, params={"page": 2, "limit": 2, "order": "horseNo.desc"}, headers=api_headers)
    body = r.json()
    assert [x["horseNo"] for x in body["data"]] == ["M2", "M1"]
    assert body["count"] == 5 and body["page"] == 2 and body["limit"] == 2


async def test_bad_filter_and_order_400(client, api_headers):
    for params in (
        {"s3Key": "eq.x"},
        {"__table__": "eq.x"},
        {"horseNo": "bogus.x"},
        {"horseNo": "noop"},
        {"id": "eq.abc"},
        {"order": "password.asc"},
        {"order": "id.sideways"},
    ):
        r = await client.get(URL, params=params, headers=api_headers)
        assert r.status_code == 400, params


async def test_patch(client, api_headers):
    a = await mk(client, api_headers, "410000000000001")
    b = await mk(client, api_headers, "410000000000002")
    r = await client.patch(
        f"{URL}/{a['id']}", json={"horseName": "새이름", "birthDate": "2020-01-02"}, headers=api_headers
    )
    assert r.status_code == 200 and r.json()["horseName"] == "새이름" and r.json()["birthDate"] == "2020-01-02"
    r = await client.patch(f"{URL}/{a['id']}", json={"microchipNo": b["microchipNo"]}, headers=api_headers)
    assert r.status_code == 409
    assert (await client.patch(f"{URL}/{a['id']}", json={"microchipNo": "12"}, headers=api_headers)).status_code == 422
    assert (await client.patch(f"{URL}/{a['id']}", json={"bogus": 1}, headers=api_headers)).status_code == 422
    assert (await client.patch(f"{URL}/9999", json={"horseName": "x"}, headers=api_headers)).status_code == 404


async def test_delete_removes_photos_and_s3(client, api_headers, db_session, s3):
    h = await mk(client, api_headers, "410000000000001")
    for i in range(2):
        key = f"horses/{h['id']}/front_full/{i}.jpg"
        s3.put_object(Bucket=settings.S3_BUCKET, Key=key, Body=b"x")
        db_session.add(
            Photo(horse_id=h["id"], part_code=PartCode.front_full, file_name=f"{i}.jpg",
                  file_format=FileFormat.jpeg, content_type="image/jpeg", file_size=1,
                  file_sha256="0" * 64, width=1, height=1, s3_key=key)
        )
    await db_session.commit()
    r = await client.delete(f"{URL}/{h['id']}", headers=api_headers)
    assert r.status_code == 204
    assert (await client.get(f"{URL}/{h['id']}", headers=api_headers)).status_code == 404
    assert (await client.get("/api/v1/photos", headers=api_headers)).json()["count"] == 0
    assert "Contents" not in s3.list_objects_v2(Bucket=settings.S3_BUCKET)
    assert (await client.delete(f"{URL}/{h['id']}", headers=api_headers)).status_code == 404
