"""On-the-fly image variants (resize + format conversion).

`transform` is pure Pillow and shared by the backend (local mode, tests) and the AWS Lambda
(`lambda_handler`), which does the heavy decoding of large originals off the small EC2 box.
This package must not import anything from the rest of `src` so it can be zipped on its own.
"""
