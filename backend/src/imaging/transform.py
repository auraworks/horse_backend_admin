import io
import math
from typing import BinaryIO

from PIL import Image, ImageOps

# Refuse decompression bombs early (an 8000x6000 photo is 48MP).
Image.MAX_IMAGE_PIXELS = 200_000_000

FORMATS = {
    # type -> (Pillow format, content type, extension)
    "webp": ("WEBP", "image/webp", "webp"),
    "avif": ("AVIF", "image/avif", "avif"),
    "jpeg": ("JPEG", "image/jpeg", "jpg"),
    "png": ("PNG", "image/png", "png"),
}


class TransformError(ValueError):
    """The source is not a decodable image (or exceeds the pixel limit)."""


def transform(src: BinaryIO, fmt: str, width: int, height: int, quality: int) -> tuple[bytes, int, int]:
    """Resize `src` to fit inside width x height (never upscaling), apply EXIF orientation,
    and encode as `fmt`. Returns (bytes, out_width, out_height)."""
    pil_fmt = FORMATS[fmt][0]
    try:
        img = Image.open(src)
        if img.format in ("JPEG", "MPO"):  # MPO = multi-picture JPEG (Samsung, etc.)
            # Let libjpeg decode at 1/2, 1/4 or 1/8 scale: huge memory/CPU saving for big photos.
            # Ask for the final output size (draft never goes below it); EXIF rotation swaps the box.
            rotated = img.getexif().get(0x0112, 1) in (5, 6, 7, 8)
            bw, bh = (height, width) if rotated else (width, height)
            r = min(bw / img.width, bh / img.height, 1.0)
            img.draft("RGB", (max(1, math.ceil(img.width * r)), max(1, math.ceil(img.height * r))))
        img = ImageOps.exif_transpose(img)
        img.thumbnail((width, height), Image.Resampling.LANCZOS)
    except (OSError, Image.DecompressionBombError, SyntaxError) as e:
        raise TransformError(f"cannot decode image: {e}") from e

    has_alpha = img.mode in ("RGBA", "LA") or (img.mode == "P" and "transparency" in img.info)
    if pil_fmt == "JPEG" or not has_alpha:
        img = img.convert("RGB")
    elif img.mode != "RGBA":
        img = img.convert("RGBA")

    out = io.BytesIO()
    if pil_fmt == "JPEG":
        img.save(out, "JPEG", quality=quality, optimize=True, progressive=True)
    elif pil_fmt == "WEBP":
        img.save(out, "WEBP", quality=quality, method=4)
    elif pil_fmt == "AVIF":
        img.save(out, "AVIF", quality=quality)
    else:
        img.save(out, "PNG", optimize=True)
    return out.getvalue(), img.width, img.height
