"""AWS Lambda entry point: build one image variant from S3 and store it back in S3.

Event: {"bucket", "srcKey", "dstKey", "type", "width", "height", "quality"}
Returns {"ok": true, "size", "width", "height"} or {"ok": false, "error"} for undecodable sources.
"""
import os
import tempfile

import boto3

from src.imaging.transform import FORMATS, TransformError, transform

_s3 = None


def _client():
    global _s3
    if _s3 is None:
        _s3 = boto3.client("s3", region_name=os.environ.get("AWS_REGION", "ap-northeast-2"))
    return _s3


def handler(event, context=None):
    s3 = _client()
    fmt = event["type"]
    with tempfile.TemporaryFile() as f:  # /tmp, not RAM: originals can be 100MB
        s3.download_fileobj(event["bucket"], event["srcKey"], f)
        f.seek(0)
        try:
            data, w, h = transform(f, fmt, int(event["width"]), int(event["height"]), int(event["quality"]))
        except TransformError as e:
            return {"ok": False, "error": str(e)}
    s3.put_object(
        Bucket=event["bucket"],
        Key=event["dstKey"],
        Body=data,
        ContentType=FORMATS[fmt][1],
        CacheControl="private, max-age=31536000, immutable",
    )
    return {"ok": True, "size": len(data), "width": w, "height": h}
