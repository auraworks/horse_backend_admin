#!/usr/bin/env bash
# Build + create/update the on-the-fly image transform Lambda (Pillow, arm64, python3.12).
# Idempotent. Usage: bash infra/deploy-image-lambda.sh
# The backend (IMAGE_TRANSFORM_MODE=lambda) invokes it on a cache miss for GET /photos/{id}/image.
set -euo pipefail
export MSYS_NO_PATHCONV=1 AWS_PAGER=""
export AWS_DEFAULT_REGION=ap-northeast-2
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
ACCOUNT=896860228345; REGION=ap-northeast-2
BUCKET=horse-admin-photos-$ACCOUNT
FN=horse-admin-img-transform
ROLE=horse-admin-img-role
EC2_ROLE=horse-admin-ec2-role
PILLOW=pillow==12.3.0
PYBIN=$(command -v python || command -v python3)
log(){ echo "[image-lambda] $*"; }

# 1. Lambda execution role: read originals, write variants, logs.
if ! aws iam get-role --role-name $ROLE >/dev/null 2>&1; then
  log "create role $ROLE"
  aws iam create-role --role-name $ROLE --tags Key=Project,Value=horse-admin --assume-role-policy-document \
    '{"Version":"2012-10-17","Statement":[{"Effect":"Allow","Principal":{"Service":"lambda.amazonaws.com"},"Action":"sts:AssumeRole"}]}' >/dev/null
  aws iam attach-role-policy --role-name $ROLE --policy-arn arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole
  sleep 10  # IAM propagation before the role can be assumed by Lambda
fi
aws iam put-role-policy --role-name $ROLE --policy-name horse-admin-img-s3 --policy-document "{\"Version\":\"2012-10-17\",\"Statement\":[{\"Effect\":\"Allow\",\"Action\":\"s3:GetObject\",\"Resource\":\"arn:aws:s3:::$BUCKET/horses/*\"},{\"Effect\":\"Allow\",\"Action\":\"s3:PutObject\",\"Resource\":\"arn:aws:s3:::$BUCKET/derived/*\"}]}"

# 2. Let the EC2 API role invoke it.
aws iam put-role-policy --role-name $EC2_ROLE --policy-name horse-admin-img-invoke --policy-document \
  "{\"Version\":\"2012-10-17\",\"Statement\":[{\"Effect\":\"Allow\",\"Action\":\"lambda:InvokeFunction\",\"Resource\":\"arn:aws:lambda:$REGION:$ACCOUNT:function:$FN\"}]}"

# 3. Package: Pillow (linux arm64 wheel) + backend/src/imaging (boto3 ships with the runtime).
BUILD="$(mktemp -d)"; trap 'rm -rf "$BUILD"' EXIT
log "build package"
$PYBIN -m pip install --quiet --target "$(cygpath -m "$BUILD/pkg" 2>/dev/null || echo "$BUILD/pkg")" --platform manylinux_2_28_aarch64 --platform manylinux2014_aarch64 --implementation cp \
  --python-version 3.12 --only-binary=:all: "$PILLOW"
mkdir -p "$BUILD/pkg/src/imaging"
: > "$BUILD/pkg/src/__init__.py"
cp "$ROOT"/backend/src/imaging/*.py "$BUILD/pkg/src/imaging/"
ZIP="$BUILD/fn.zip"
PKG="$(cygpath -m "$BUILD/pkg" 2>/dev/null || echo "$BUILD/pkg")" ZIPF="$(cygpath -m "$ZIP" 2>/dev/null || echo "$ZIP")" $PYBIN - <<'PY'
import os, zipfile
root, out = os.environ["PKG"], os.environ["ZIPF"]
with zipfile.ZipFile(out, "w", zipfile.ZIP_DEFLATED) as z:
    for d, _, files in os.walk(root):
        for f in files:
            if "__pycache__" in d: continue
            p = os.path.join(d, f)
            z.write(p, os.path.relpath(p, root))
PY
ZIPARG="fileb://$(cygpath -m "$ZIP" 2>/dev/null || echo "$ZIP")"

# 4. Create or update the function.
ROLE_ARN=$(aws iam get-role --role-name $ROLE --query Role.Arn --output text)
CONF=(--runtime python3.12 --handler src.imaging.lambda_handler.handler --memory-size 2048 --timeout 25
      --ephemeral-storage Size=1024 --environment "Variables={BUCKET=$BUCKET}")
if aws lambda get-function --function-name $FN >/dev/null 2>&1; then
  log "update code"
  aws lambda update-function-code --function-name $FN --zip-file "$ZIPARG" --architectures arm64 >/dev/null
  aws lambda wait function-updated --function-name $FN
  aws lambda update-function-configuration --function-name $FN "${CONF[@]}" >/dev/null
else
  log "create function"
  for i in 1 2 3 4 5; do
    aws lambda create-function --function-name $FN --role "$ROLE_ARN" --architectures arm64 \
      --zip-file "$ZIPARG" --tags Project=horse-admin "${CONF[@]}" >/dev/null && break
    log "role not assumable yet, retry $i"; sleep 8
  done
fi
aws lambda wait function-updated --function-name $FN
log "done: $FN"
