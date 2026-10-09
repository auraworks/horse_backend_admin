import json
from urllib.parse import unquote

import pytest

from src.config import settings

pytestmark = pytest.mark.usefixtures("clean_db", "s3")
SHA = "a" * 64
CHIP = "410000000000001"


def meta(**over):
    d = {
        "fileFormat": "jpeg", "fileSize": 4, "fileSha256": SHA, "width": 100, "height": 80, "errorCodes": ["BLUR"],
        "capturedAt": "2026-10-09T01:23:45Z",
        "gps": {"latitude": 37.5, "longitude": 127.0, "accuracyMeters": 3.0},
        "iso": 100, "exposureTimeNs": 8000000, "fNumber": 1.8, "focalLengthMm": 6.9, "zoomRatio": 1.0,
        "afState": None, "ambientLux": 10.0, "blurScore": 1.5, "brightness": 0.5,
        "deviceModel": "SM-S918N", "metaSha256": "b" * 64,
    }
    d.update(over)
    return d


async def mk_horse(client, h, chip=CHIP):
    r = await client.post("/api/v1/horses", json={"microchipNo": chip}, headers=h)
    assert r.status_code == 201
    return r.json()["id"]


async def upload(client, h, horse_id, slot="front_full", m=None, data=b"\xff\xd8abc", ctype="image/jpeg", extra=None,
                 filename="p.jpg"):
    return await client.post(
        f"/api/v1/horses/{horse_id}/photos/{slot}",
        headers=h,
        files={"photo": (filename, data, ctype)},
        data={"metadata": json.dumps(m if m is not None else meta()), **(extra or {})},
    )


async def test_upload_body_slot(client, api_headers, s3):
    hid = await mk_horse(client, api_headers)
    r = await upload(client, api_headers, hid)
    assert r.status_code == 201, r.text
    b = r.json()
    assert b["partCode"] == "front_full" and b["partLabel"] == "정면전체"
    assert b["isSelected"] is True and b["checkCodes"] == ["BLUR"]
    assert b["metadata"]["gps"]["accuracyMeters"] == 3.0 and b["metadata"]["afState"] is None
    assert "X-Amz-Signature" in b["viewUrl"]
    keys = [o["Key"] for o in s3.list_objects_v2(Bucket=settings.S3_BUCKET)["Contents"]]
    assert len(keys) == 1 and keys[0].startswith(f"horses/{hid}/front_full/") and keys[0].endswith(".jpg")
    # second upload in same slot is not selected
    r2 = await upload(client, api_headers, hid)
    assert r2.json()["isSelected"] is False
    lst = await client.get(f"/api/v1/horses/{hid}/photos", headers=api_headers)
    assert [p["id"] for p in lst.json()] == [r2.json()["id"], b["id"]]  # newest first
    assert (await client.get(f"/api/v1/horses/{hid}/photos?partCode=left_full", headers=api_headers)).json() == []


async def test_upload_png_and_null_gps(client, api_headers):
    hid = await mk_horse(client, api_headers)
    r = await upload(client, api_headers, hid, m=meta(fileFormat="png", gps=None), ctype="image/png")
    assert r.status_code == 201 and r.json()["metadata"]["gps"] is None and r.json()["fileName"] == "p.jpg"


async def test_upload_microchip_slot(client, api_headers):
    hid = await mk_horse(client, api_headers)
    r = await upload(client, api_headers, hid, slot="microchip",
                     extra={"recognizedMicrochipNumber": "410999999999999", "evidenceSource": "manual"})
    assert r.status_code == 201, r.text
    assert r.json()["recognizedMicrochipNo"] == "410999999999999" and r.json()["evidenceSource"] == "manual"
    horse = (await client.get(f"/api/v1/horses/{hid}", headers=api_headers)).json()
    assert horse["chipInputMethod"] == "manual"
    # missing / invalid chip fields
    assert (await upload(client, api_headers, hid, slot="microchip")).status_code == 422
    bad = await upload(client, api_headers, hid, slot="microchip",
                       extra={"recognizedMicrochipNumber": "123", "evidenceSource": "ocr"})
    assert bad.status_code == 422


@pytest.mark.parametrize(
    "over",
    [
        {"fileSha256": "xyz"},
        {"metaSha256": "A" * 64},
        {"gps": {"latitude": 37.5}},
        {"gps": {"latitude": 91, "longitude": 0, "accuracyMeters": 1}},
        {"brightness": 1.5},
        {"blurScore": -1},
        {"deviceModel": ""},
        {"iso": 0},
        {"fileSize": 0},
        {"width": 0},
        {"errorCodes": "BLUR"},
    ],
)
async def test_invalid_metadata_422(client, api_headers, over):
    hid = await mk_horse(client, api_headers)
    assert (await upload(client, api_headers, hid, m=meta(**over))).status_code == 422


async def test_invalid_json_and_slot_422(client, api_headers):
    hid = await mk_horse(client, api_headers)
    r = await client.post(
        f"/api/v1/horses/{hid}/photos/front_full", headers=api_headers,
        files={"photo": ("p.jpg", b"x", "image/jpeg")}, data={"metadata": "{not json"},
    )
    assert r.status_code == 422
    assert (await upload(client, api_headers, hid, slot="tail")).status_code == 422


async def test_wrong_content_type_422(client, api_headers):
    hid = await mk_horse(client, api_headers)
    r = await upload(client, api_headers, hid, ctype="image/png")
    assert r.status_code == 422
    assert (await upload(client, api_headers, hid, ctype="text/plain")).status_code == 422


async def test_too_large_413(client, api_headers, s3):
    hid = await mk_horse(client, api_headers)
    r = await upload(client, api_headers, hid, data=b"x" * (settings.MAX_UPLOAD_BYTES + 1))
    assert r.status_code == 413
    assert "Contents" not in s3.list_objects_v2(Bucket=settings.S3_BUCKET)
    ok = await upload(client, api_headers, hid, data=b"x" * settings.MAX_UPLOAD_BYTES)
    assert ok.status_code == 201


async def test_unknown_horse_404(client, api_headers):
    assert (await upload(client, api_headers, 999999)).status_code == 404
    assert (await client.get("/api/v1/horses/999999/photos", headers=api_headers)).status_code == 404


async def test_db_failure_deletes_s3_object(client, api_headers, s3):
    hid = await mk_horse(client, api_headers)
    with pytest.raises(Exception):
        await upload(client, api_headers, hid, m=meta(fileSize=10**30))  # overflows BIGINT at DB level
    assert "Contents" not in s3.list_objects_v2(Bucket=settings.S3_BUCKET)


async def test_representative_switch(client, api_headers):
    hid = await mk_horse(client, api_headers)
    ids = [(await upload(client, api_headers, hid)).json()["id"] for _ in range(3)]
    other = (await upload(client, api_headers, hid, slot="left_full")).json()["id"]

    r = await client.put(f"/api/v1/horses/{hid}/photos/front_full/representative", json={"photoId": ids[2]}, headers=api_headers)
    assert r.status_code == 200 and r.json()["id"] == ids[2] and r.json()["isSelected"] is True
    r = await client.put(f"/api/v1/horses/{hid}/photos/front_full/representative", json={"photoId": ids[1]}, headers=api_headers)
    assert r.status_code == 200
    photos = (await client.get(f"/api/v1/horses/{hid}/photos?partCode=front_full", headers=api_headers)).json()
    assert [p["id"] for p in photos if p["isSelected"]] == [ids[1]]
    # other slot untouched
    left = (await client.get(f"/api/v1/horses/{hid}/photos?partCode=left_full", headers=api_headers)).json()
    assert left[0]["id"] == other and left[0]["isSelected"] is True
    # photo from another slot / unknown -> 404
    bad = await client.put(f"/api/v1/horses/{hid}/photos/front_full/representative", json={"photoId": other}, headers=api_headers)
    assert bad.status_code == 404
    assert (await client.put(f"/api/v1/horses/{hid}/photos/front_full/representative", json={"photoId": 0}, headers=api_headers)).status_code == 422


async def test_download_url(client, api_headers):
    hid = await mk_horse(client, api_headers)
    pid = (await upload(client, api_headers, hid)).json()["id"]
    r = await client.get(f"/api/v1/photos/{pid}/download-url", headers=api_headers)
    assert r.status_code == 200
    b = r.json()
    assert b["expiresIn"] == 3600 and b["fileName"] == "p.jpg"
    assert "attachment" in unquote(b["url"])
    assert (await client.get("/api/v1/photos/999999/download-url", headers=api_headers)).status_code == 404


async def test_photo_parts(client, api_headers):
    r = await client.get("/api/v1/photo-parts", headers=api_headers)
    body = r.json()
    assert [p["code"] for p in body] == [
        "front_full", "forehead_close", "left_full", "right_full", "right_rear_oblique", "left_rear_oblique", "microchip"
    ]
    assert body[0] == {"code": "front_full", "label": "정면전체", "order": 1}
    assert body[6]["order"] == 7


async def test_by_microchip(client, api_headers):
    hid = await mk_horse(client, api_headers)
    r = await client.get(f"/api/v1/horses/by-microchip/{CHIP}", headers=api_headers)
    assert r.status_code == 200 and r.json()["id"] == hid
    assert (await client.get("/api/v1/horses/by-microchip/410000000000009", headers=api_headers)).status_code == 404
    assert (await client.get("/api/v1/horses/by-microchip/abc", headers=api_headers)).status_code == 422


async def test_stats(client, api_headers):
    empty = (await client.get("/api/v1/stats", headers=api_headers)).json()
    assert empty == {"horseCount": 0, "photoCount": 0, "horsesWithAllSixParts": 0}
    full = await mk_horse(client, api_headers)
    for slot in ["front_full", "forehead_close", "left_full", "right_full", "right_rear_oblique", "left_rear_oblique"]:
        assert (await upload(client, api_headers, full, slot=slot)).status_code == 201
    partial = await mk_horse(client, api_headers, chip="410000000000002")
    await upload(client, api_headers, partial)
    await upload(client, api_headers, partial, slot="microchip",
                 extra={"recognizedMicrochipNumber": CHIP, "evidenceSource": "ocr"})
    s = (await client.get("/api/v1/stats", headers=api_headers)).json()
    assert s == {"horseCount": 2, "photoCount": 8, "horsesWithAllSixParts": 1}
    assert (await client.get("/api/v1/stats")).status_code == 401


async def test_openapi_documents_upload(client):
    spec = (await client.get("/openapi.json")).json()
    op = spec["paths"]["/api/v1/horses/{horse_id}/photos/{slot}"]["post"]
    assert "metaSha256" in op["description"] and "isSelected" in op["description"]
    ref = op["requestBody"]["content"]["multipart/form-data"]["schema"]["$ref"].split("/")[-1]
    props = spec["components"]["schemas"][ref]["properties"]
    assert {"photo", "metadata", "recognizedMicrochipNumber", "evidenceSource"} <= set(props)


async def test_dashboard_login_page(client):
    r = await client.get("/dashboard/login")
    assert r.status_code == 200
    r = await client.get("/dashboard/", follow_redirects=False)
    assert r.status_code in (302, 303, 307) and "login" in r.headers["location"]
    bad = await client.post("/dashboard/login", data={"username": "admin", "password": "wrong"}, follow_redirects=False)
    assert bad.status_code == 400
    ok = await client.post(
        "/dashboard/login",
        data={"username": settings.ADMIN_DB_USER, "password": settings.ADMIN_DB_PASSWORD},
        follow_redirects=False,
    )
    assert ok.status_code in (302, 303)


async def test_refresh_failure_after_commit_keeps_object(client, api_headers, s3, monkeypatch):
    from sqlalchemy.ext.asyncio import AsyncSession

    hid = await mk_horse(client, api_headers)

    async def boom(self, *a, **k):
        raise RuntimeError("refresh failed")

    monkeypatch.setattr(AsyncSession, "refresh", boom)
    with pytest.raises(RuntimeError):
        await upload(client, api_headers, hid)
    monkeypatch.undo()
    assert len(s3.list_objects_v2(Bucket=settings.S3_BUCKET)["Contents"]) == 1
    assert len((await client.get(f"/api/v1/horses/{hid}/photos", headers=api_headers)).json()) == 1


async def test_naive_captured_at_is_utc(client, api_headers):
    hid = await mk_horse(client, api_headers)
    r = await upload(client, api_headers, hid, m=meta(capturedAt="2026-10-09T01:23:45"))
    assert r.status_code == 201
    assert r.json()["metadata"]["capturedAt"].startswith("2026-10-09T01:23:45") and r.json()["metadata"]["capturedAt"].endswith(("Z", "+00:00"))
    r = await upload(client, api_headers, hid, m=meta(capturedAt="2026-10-09T10:23:45+09:00"))
    assert r.json()["metadata"]["capturedAt"].startswith("2026-10-09T01:23:45")


async def test_content_type_params_and_ascii_filename(client, api_headers):
    hid = await mk_horse(client, api_headers)
    r = await upload(client, api_headers, hid, ctype="Image/JPEG; charset=binary")
    assert r.status_code == 201
    d = (await client.get(f"/api/v1/photos/{r.json()['id']}/download-url", headers=api_headers)).json()
    assert 'filename%3D%22' in d["url"] or 'filename="' in unquote(d["url"])
    assert "filename*%3DUTF-8" in d["url"] or "filename*=UTF-8" in unquote(d["url"])


async def test_file_name_is_client_filename(client, api_headers, s3):
    hid = await mk_horse(client, api_headers)
    r = await upload(client, api_headers, hid, filename="정면_테스트.jpg")
    assert r.status_code == 201 and r.json()["fileName"] == "정면_테스트.jpg"
    r = await upload(client, api_headers, hid, filename=r"C:\Users\x/../photo.jpg")
    assert r.status_code == 201 and r.json()["fileName"] == "photo.jpg"
    r = await upload(client, api_headers, hid, filename="/")
    assert r.status_code in (201, 422)
    if r.status_code == 201:
        assert r.json()["fileName"].endswith(".jpg") and len(r.json()["fileName"]) == 40
    keys = [o["Key"] for o in s3.list_objects_v2(Bucket=settings.S3_BUCKET)["Contents"]]
    assert all("정면" not in k and k.startswith(f"horses/{hid}/front_full/") for k in keys)


async def test_delete_representative_promotes_newest(client, api_headers):
    hid = await mk_horse(client, api_headers)
    p1 = (await upload(client, api_headers, hid)).json()
    p2 = (await upload(client, api_headers, hid)).json()
    p3 = (await upload(client, api_headers, hid)).json()
    assert p1["isSelected"] and not p2["isSelected"] and not p3["isSelected"]
    assert (await client.delete(f"/api/v1/photos/{p1['id']}", headers=api_headers)).status_code == 204
    lst = (await client.get(f"/api/v1/horses/{hid}/photos", headers=api_headers)).json()
    assert [(p["id"], p["isSelected"]) for p in lst] == [(p3["id"], True), (p2["id"], False)]
    # deleting a non-representative leaves selection alone
    assert (await client.delete(f"/api/v1/photos/{p2['id']}", headers=api_headers)).status_code == 204
    lst = (await client.get(f"/api/v1/horses/{hid}/photos", headers=api_headers)).json()
    assert [(p["id"], p["isSelected"]) for p in lst] == [(p3["id"], True)]


async def test_horse_create_accepts_microchip_number(client, api_headers):
    r = await client.post("/api/v1/horses", json={"microchipNumber": "410000000000077"}, headers=api_headers)
    assert r.status_code == 201 and r.json()["microchipNo"] == "410000000000077"
    r = await client.patch(f"/api/v1/horses/{r.json()['id']}", json={"microchipNumber": "410000000000078"}, headers=api_headers)
    assert r.status_code == 200 and r.json()["microchipNo"] == "410000000000078"


def test_client_file_name_helper():
    from src.services.horse_photos import _client_file_name as f
    assert f("a\x00b\x1f.jpg") == "ab.jpg"
    assert f("..") == "" and f(None) == "" and f("") == "" and f("dir/") == ""
    assert len(f("x" * 400 + ".jpg")) == 255
