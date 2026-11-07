import io
import json

import pytest
from PIL import Image

from src.config import settings
from src.imaging import lambda_handler
from src.imaging.transform import TransformError, transform
from tests.test_upload import mk_horse, upload

pytestmark = pytest.mark.usefixtures("clean_db", "s3")


def jpeg_bytes(w=3000, h=2000, orientation=None) -> bytes:
    img = Image.new("RGB", (w, h), (200, 30, 30))
    out = io.BytesIO()
    if orientation:
        exif = Image.Exif()
        exif[0x0112] = orientation
        img.save(out, "JPEG", quality=90, exif=exif)
    else:
        img.save(out, "JPEG", quality=90)
    return out.getvalue()


def keys(s3, prefix=""):
    return sorted(o["Key"] for o in s3.list_objects_v2(Bucket=settings.S3_BUCKET, Prefix=prefix).get("Contents", []))


# ---- pure transform ----


@pytest.mark.parametrize("fmt,pil", [("webp", "WEBP"), ("jpeg", "JPEG"), ("png", "PNG"), ("avif", "AVIF")])
def test_transform_formats_and_fit(fmt, pil):
    data, w, h = transform(io.BytesIO(jpeg_bytes()), fmt, 1024, 4096, 80)
    assert (w, h) == (1024, 683)
    img = Image.open(io.BytesIO(data))
    assert img.format == pil and img.size == (1024, 683)


def test_transform_no_upscale_and_exif_rotation():
    _, w, h = transform(io.BytesIO(jpeg_bytes(400, 300)), "webp", 1024, 1024, 80)
    assert (w, h) == (400, 300)
    # orientation 6 = rotate 90deg: landscape pixels displayed as portrait
    _, w, h = transform(io.BytesIO(jpeg_bytes(3000, 2000, orientation=6)), "webp", 1000, 1000, 80)
    assert (w, h) == (667, 1000)


def test_transform_png_alpha_kept_for_webp():
    src = io.BytesIO()
    Image.new("RGBA", (200, 100), (0, 0, 0, 0)).save(src, "PNG")
    src.seek(0)
    data, _, _ = transform(src, "webp", 100, 100, 80)
    assert Image.open(io.BytesIO(data)).mode == "RGBA"


def test_transform_garbage_raises():
    with pytest.raises(TransformError):
        transform(io.BytesIO(b"not an image"), "webp", 100, 100, 80)


# ---- endpoint (local mode) ----


async def photo_id(client, h, data=None, chip="410000000000001"):
    hid = await mk_horse(client, h, chip=chip)
    r = await upload(client, h, hid, data=data if data is not None else jpeg_bytes())
    assert r.status_code == 201, r.text
    return r.json()["id"]


async def test_image_variant_flow(client, api_headers, s3):
    pid = await photo_id(client, api_headers)
    url = f"/api/v1/photos/{pid}/image"
    r = await client.get(url, params={"type": "webp", "width": 1024, "redirect": "false"}, headers=api_headers)
    assert r.status_code == 200, r.text
    b = r.json()
    assert b["cached"] is False and b["contentType"] == "image/webp" and "X-Amz-Signature" in b["url"]
    derived = keys(s3, "derived/")
    assert len(derived) == 1 and derived[0].endswith("/w1024_h4096_q80.webp")
    obj = s3.get_object(Bucket=settings.S3_BUCKET, Key=derived[0])
    assert obj["ContentType"] == "image/webp"
    assert Image.open(io.BytesIO(obj["Body"].read())).size == (1024, 683)

    # second call reuses the stored variant
    r2 = await client.get(url, params={"type": "webp", "width": 1024, "redirect": "false"}, headers=api_headers)
    assert r2.json()["cached"] is True and len(keys(s3, "derived/")) == 1

    # default: 302 redirect to the presigned URL
    r3 = await client.get(url, params={"width": 1024}, headers=api_headers)
    assert r3.status_code == 302 and "derived/" in r3.headers["location"]
    assert r3.headers["location"].startswith("https://")  # S3 host kept (not made relative)
    assert "max-age" in r3.headers["cache-control"]

    # other combinations are separate cache entries; png ignores quality
    await client.get(url, params={"type": "png", "height": 100, "quality": 10}, headers=api_headers)
    await client.get(url, params={"type": "png", "height": 100, "quality": 90}, headers=api_headers)
    assert len(keys(s3, "derived/")) == 2

    # deleting the photo removes original + variants
    assert (await client.delete(f"/api/v1/photos/{pid}", headers=api_headers)).status_code == 204
    assert keys(s3) == []


async def test_image_variant_errors(client, api_headers, s3):
    pid = await photo_id(client, api_headers)
    url = f"/api/v1/photos/{pid}/image"
    for params in ({"type": "gif"}, {"width": 5000}, {"width": 0}, {"quality": 0}):
        assert (await client.get(url, params=params, headers=api_headers)).status_code == 422
    assert (await client.get("/api/v1/photos/999999/image", headers=api_headers)).status_code == 404
    # public: no API key needed for variants, but other photo APIs still require it
    pub = await client.get(url, params={"width": 64})
    assert pub.status_code == 302 and "public" in pub.headers["cache-control"]
    assert (await client.get(f"/api/v1/photos/{pid}")).status_code == 401
    assert (await client.get(f"/api/v1/photos/{pid}/download-url")).status_code == 401
    # undecodable original -> 422, nothing cached
    before = len(keys(s3, "derived/"))
    bad = await photo_id(client, api_headers, data=b"\x00garbage", chip="410000000000002")
    r = await client.get(f"/api/v1/photos/{bad}/image", params={"width": 100}, headers=api_headers)
    assert r.status_code == 422 and len(keys(s3, "derived/")) == before


async def test_horse_delete_removes_variants(client, api_headers, s3):
    pid = await photo_id(client, api_headers)
    horse_id = (await client.get(f"/api/v1/photos/{pid}", headers=api_headers)).json()["horseId"]
    await client.get(f"/api/v1/photos/{pid}/image", params={"width": 200}, headers=api_headers)
    assert keys(s3, "derived/")
    assert (await client.delete(f"/api/v1/horses/{horse_id}", headers=api_headers)).status_code == 204
    assert keys(s3) == []


# ---- lambda handler (same code path the AWS Lambda runs) ----


def test_lambda_handler(s3):
    s3.put_object(Bucket=settings.S3_BUCKET, Key="horses/1/front_full/a.jpg", Body=jpeg_bytes())
    lambda_handler._s3 = None
    ev = {"bucket": settings.S3_BUCKET, "srcKey": "horses/1/front_full/a.jpg",
          "dstKey": "derived/horses/1/front_full/a.jpg/w512_h4096_q75.webp",
          "type": "webp", "width": 512, "height": 4096, "quality": 75}
    out = lambda_handler.handler(json.loads(json.dumps(ev)))
    assert out["ok"] is True and (out["width"], out["height"]) == (512, 341)
    obj = s3.get_object(Bucket=settings.S3_BUCKET, Key=ev["dstKey"])
    assert obj["ContentType"] == "image/webp" and "immutable" in obj["CacheControl"]

    s3.put_object(Bucket=settings.S3_BUCKET, Key="horses/1/front_full/bad.jpg", Body=b"nope")
    bad = lambda_handler.handler({**ev, "srcKey": "horses/1/front_full/bad.jpg", "dstKey": "derived/x.webp"})
    assert bad["ok"] is False
    lambda_handler._s3 = None
