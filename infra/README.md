# infra

AWS (ap-northeast-2, account 896860228345) for horse-admin: S3 bucket, EC2 (t4g.micro, EIP), RDS PostgreSQL (db.t4g.micro), API Gateway HTTP API (HTTPS front for EC2:8000).

- `provision.sh` - idempotent create/lookup of everything; writes `outputs.json` and `secrets/` (git-ignored: `rds.env`, `api-key.env`, `horse-admin-key.pem`).
- `teardown.sh` - deletes everything (destructive, asks for confirmation).
- `outputs.json` - non-secret resource ids and the API URL.

SSH: `ssh -i infra/secrets/horse-admin-key.pem ec2-user@<elasticIp>` (port 22 limited to the developer IP).
