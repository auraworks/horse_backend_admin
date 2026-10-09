#!/usr/bin/env bash
# Deploy backend/ to the EC2 instance (Amazon Linux 2023) behind API Gateway.
# Usage: bash infra/deploy.sh
# Reads infra/outputs.json, infra/secrets/{rds.env,api-key.env,horse-admin-key.pem}.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
INFRA="$ROOT/infra"
SECRETS="$INFRA/secrets"
KEY="$SECRETS/horse-admin-key.pem"
EIP="$(sed -n 's/.*"elasticIp": *"\([^"]*\)".*/\1/p' "$INFRA/outputs.json")"
API_URL="$(sed -n 's/.*"apiUrl": *"\([^"]*\)".*/\1/p' "$INFRA/outputs.json")"
BUCKET="$(sed -n 's/.*"bucket": *"\([^"]*\)".*/\1/p' "$INFRA/outputs.json")"
REGION="$(sed -n 's/.*"region": *"\([^"]*\)".*/\1/p' "$INFRA/outputs.json")"
CORS_ORIGINS="${CORS_ORIGINS:-http://localhost:3000}"
SSH_OPTS=(-i "$KEY" -o StrictHostKeyChecking=accept-new -o IdentitiesOnly=yes)
REMOTE="ec2-user@$EIP"

# shellcheck disable=SC1091
set -a; source <(tr -d '\r' < "$SECRETS/rds.env"); source <(tr -d '\r' < "$SECRETS/api-key.env"); set +a
: "${DATABASE_URL:?}" "${API_ACCESS_KEY:?}"
SESSION_SECRET_VALUE="${SESSION_SECRET:-$(tr -d '\r' < "$SECRETS/session-secret.txt" 2>/dev/null || true)}"
if [ -z "$SESSION_SECRET_VALUE" ]; then
  SESSION_SECRET_VALUE="$(openssl rand -hex 32)"
  printf '%s' "$SESSION_SECRET_VALUE" > "$SECRETS/session-secret.txt"
fi

TMP="$(mktemp -d)"; trap 'rm -rf "$TMP"' EXIT
echo "==> packaging backend"
tar -C "$ROOT/backend" --exclude='.venv' --exclude='venv' --exclude='__pycache__' \
  --exclude='.pytest_cache' --exclude='tests' --exclude='.env' --exclude='.env.*' \
  -czf "$TMP/backend.tgz" .

# env file (LF, no AWS keys: instance role is used)
cat > "$TMP/horse-admin.env" <<ENVEOF
DATABASE_URL=$DATABASE_URL
API_ACCESS_KEY=$API_ACCESS_KEY
AWS_REGION=$REGION
S3_BUCKET=$BUCKET
CORS_ORIGINS=$CORS_ORIGINS
ADMIN_DB_USER=${ADMIN_DB_USER:-admin}
ADMIN_DB_PASSWORD=${ADMIN_DB_PASSWORD:-123456789}
SESSION_SECRET=$SESSION_SECRET_VALUE
ENVEOF

echo "==> uploading to $EIP"
scp "${SSH_OPTS[@]}" "$TMP/backend.tgz" "$TMP/horse-admin.env" "$INFRA/horse-admin-api.service" "$REMOTE:/tmp/"

echo "==> installing on server"
ssh "${SSH_OPTS[@]}" "$REMOTE" 'bash -s' <<'REMOTE_EOF'
set -euo pipefail
PY=python3.12
if ! sudo dnf list --available python3.12 >/dev/null 2>&1 && ! command -v python3.12 >/dev/null; then PY=python3.11; fi
if ! command -v $PY >/dev/null; then
  sudo dnf install -y $PY $PY-pip
fi
echo "using $PY"
sudo mkdir -p /opt/horse-admin/backend
sudo chown -R ec2-user:ec2-user /opt/horse-admin
cd /opt/horse-admin/backend
# refresh code but keep the venv
find . -mindepth 1 -maxdepth 1 ! -name .venv -exec rm -rf {} +
tar -xzf /tmp/backend.tgz -C /opt/horse-admin/backend
if [ -x .venv/bin/python ] && ! .venv/bin/python --version | grep -q "$(echo $PY | sed 's/python//')"; then rm -rf .venv; fi
[ -d .venv ] || $PY -m venv .venv
.venv/bin/pip install --quiet --upgrade pip
.venv/bin/pip install --quiet -r requirements.txt
sudo install -m 600 -o root -g root /tmp/horse-admin.env /etc/horse-admin.env
sudo install -m 644 /tmp/horse-admin-api.service /etc/systemd/system/horse-admin-api.service
rm -f /tmp/backend.tgz /tmp/horse-admin.env /tmp/horse-admin-api.service
# alembic reads env via pydantic settings (needs DATABASE_URL etc.)
sudo bash -c 'set -a; . /etc/horse-admin.env; set +a; cd /opt/horse-admin/backend && sudo -u ec2-user -E env "PATH=$PATH" .venv/bin/alembic upgrade head'
sudo systemctl daemon-reload
sudo systemctl enable horse-admin-api
sudo systemctl restart horse-admin-api
sleep 4
systemctl is-active horse-admin-api
curl -fsS http://localhost:8000/health
echo
REMOTE_EOF

echo "==> smoke: $API_URL"
curl -fsS "$API_URL/health"; echo
echo "deploy done: $API_URL"
