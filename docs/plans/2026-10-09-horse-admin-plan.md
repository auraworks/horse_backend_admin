# Horse Photo Admin — Implementation Plan

Spec: `구성플랜.md` (요구사항) + `스키마_메타데이터.xlsx` (촬영 메타데이터 스키마, 기준일 2026-10-08).
Repo root: `D:\000.FrontEnd\346.horse_admin` (folders `backend/`, `frontend/`, `infra/`, `docs/`).

## Global Constraints

- **DB = PostgreSQL on AWS RDS only.** No SQLite anywhere (not even tests). Smallest spec: `db.t4g.micro`, single-AZ, 20GB gp3. Dev, test and prod all use the RDS instance: DB `horse_admin` (app) and DB `horse_admin_test` (pytest). RDS is publicly accessible but its SG only allows 5432 from the EC2 SG and from the developer IP `14.52.96.42/32`.
- AWS region `ap-northeast-2`, account `896860228345`, default VPC `vpc-0fcaf565a2345d92c`. All resources tagged `Project=horse-admin`. Name prefix `horse-admin`.
- S3 bucket `horse-admin-photos-896860228345`: private (Block Public Access on), SSE-S3. Object key format: `horses/{horseId}/{partCode}/{uuid4}.{jpg|png}`. Images are only exposed through presigned URLs (TTL 3600s).
- Secrets never committed. Secret files live in `infra/secrets/` and `backend/.env` / `frontend/.env.local` (all git-ignored). Commit `.env.example` files with placeholders.
- **API auth (no login yet):** env `API_ACCESS_KEY` (fixed random string). Every route under `/api/v1` requires header `X-API-Key: <API_ACCESS_KEY>` → otherwise `401 {"detail": "Invalid or missing API key"}`. `/health`, `/docs`, `/redoc`, `/openapi.json` are open. Swagger must show an "Authorize" button for `X-API-Key` (FastAPI `APIKeyHeader` security scheme).
- **Swagger typing:** every endpoint declares `response_model`, `summary`, `tags`; every Pydantic field has `Field(description=..., examples=[...])`; enums are real `Enum` classes so Swagger lists allowed values. JSON payloads use camelCase aliases matching the app's actual keys (from the xlsx) with `populate_by_name=True`.
- **Photo part codes (enum `PartCode`, exact values, display order):**
  1. `front_full` — 정면전체
  2. `forehead_close` — 근접이마
  3. `left_full` — 좌측전체
  4. `right_full` — 우측전체
  5. `right_rear_oblique` — 우후측입체
  6. `left_rear_oblique` — 좌후측입체
  7. `microchip` — 마이크로칩 증빙 (separate evidence slot, not one of the 6 body shots)
- Enums: `ChipInputMethod` = `ocr | manual`; `FileFormat` = `jpeg | png` (content-type `image/jpeg | image/png` must match).
- Validation (from xlsx): `horse_id > 0`; `microchip_no` = exactly 15 digits `^\d{15}$`; sha256 fields = `^[0-9a-f]{64}$`; `file_size > 0`; `width,height > 0`; `check_codes` string array, `[]` allowed; `captured_at` UTC ISO 8601; `gps` object nullable, but if present `latitude∈[-90,90]`, `longitude∈[-180,180]`, `accuracyMeters ≥ 0` all required non-null; `iso>0`, `exposureTimeNs>0`, `fNumber>0`, `focalLengthMm>0`, `zoomRatio>0` nullable; `afState` nullable string; `ambientLux ≥ 0` nullable; `blurScore ≥ 0` required; `brightness ∈ [0,1]` required; `deviceModel` non-empty required; `metaSha256` required. Hashes are stored as sent, not recomputed.
- 마번·마명·생년월일·성별·모색 are NOT in the xlsx (they come from the KRA public-data API). The `horses` table gets nullable columns for them: `horse_no`(마번), `horse_name`(마명), `birth_date`, `sex`, `coat_color`(모색). KRA API integration itself is out of scope.
- Upload size limit 10MB per photo (API Gateway HTTP API payload limit) → `413` above it.
- Python 3.11-compatible code (EC2 runs Amazon Linux 2023 python3.11). FastAPI + SQLAlchemy 2.x (async, `asyncpg`) + Alembic + Pydantic v2 + boto3. Tests: pytest + httpx `AsyncClient` against `horse_admin_test` on RDS; S3 mocked with `moto`.
- Frontend: Next.js template `https://github.com/auraworks/nextjs_admin_master.git` (Next 16, React 19, Tailwind 4). Admin login `admin` / `123456789` (env `ADMIN_ID`, `ADMIN_PASSWORD`, defaults to those values). The browser never sees `API_ACCESS_KEY`: the Next server proxies backend calls and injects the header.
- UI language Korean.

## Backend API contract (consumed by the frontend)

Prefix `/api/v1`, header `X-API-Key`. Generic CRUD responses follow the generate-crud-apis format: list → `{"data": [...], "count": n, "page": p, "limit": l}`; single → the object.

Generic CRUD (generate-crud-apis style: pagination `page`,`limit`; sorting `order=field.asc|desc`; filters `field=op.value` with ops eq,neq,gt,gte,lt,lte,like,ilike,in,is):
- `/api/v1/horses` — GET list, GET `/{id}`, POST, PATCH `/{id}`, DELETE `/{id}` (deleting a horse deletes its photos' S3 objects too).
- `/api/v1/photos` — GET list, GET `/{id}`, PATCH `/{id}`, DELETE `/{id}` (also deletes the S3 object). No generic POST (create only through upload).
- `/api/v1/photo-metadata` — GET list, GET `/{id}`.

Custom:
- `GET /api/v1/photo-parts` → `[{"code": "front_full", "label": "정면전체", "order": 1}, ...]` (7 items, order above).
- `GET /api/v1/horses/by-microchip/{microchipNo}` → `Horse` or 404.
- `GET /api/v1/horses/{horseId}/photos?partCode=` → `PhotoDetail[]` ordered by part order then `createdAt desc`.
- `POST /api/v1/horses/{horseId}/photos/{slot}` multipart: `photo` (file), `metadata` (JSON string, keys: fileFormat, fileSize, fileSha256, width, height, errorCodes, capturedAt, gps, iso, exposureTimeNs, fNumber, focalLengthMm, zoomRatio, afState, ambientLux, blurScore, brightness, deviceModel, metaSha256); when `slot=microchip` also form fields `recognizedMicrochipNumber` (15 digits) and `evidenceSource` (`ocr|manual`), and the horse's `chip_input_method` is updated to `evidenceSource`. → `201 PhotoDetail`. 404 unknown horse, 422 validation, 413 >10MB.
- `PUT /api/v1/horses/{horseId}/photos/{slot}/representative` body `{"photoId": 12}` → sets that photo `isSelected=true` and all other photos of the same horse+slot false → `PhotoDetail`.
- `GET /api/v1/photos/{photoId}/download-url` → `{"url": "...", "expiresIn": 3600, "fileName": "..."}` (presigned with `Content-Disposition: attachment`).

`PhotoDetail` (camelCase): `id, horseId, partCode, partLabel, isSelected, fileName, fileFormat, contentType, fileSize, fileSha256, width, height, checkCodes, recognizedMicrochipNo, evidenceSource, createdAt, viewUrl (presigned inline, 3600s), metadata: PhotoMetadata | null`.
`PhotoMetadata`: `capturedAt, gps {latitude, longitude, accuracyMeters} | null, iso, exposureTimeNs, fNumber, focalLengthMm, zoomRatio, afState, ambientLux, blurScore, brightness, deviceModel, metaSha256`.
`Horse`: `id, microchipNo, chipInputMethod, horseNo, horseName, birthDate, sex, coatColor, createdAt, updatedAt` (+ `photoCount` on list endpoint is NOT required).

---

### Task 1: Provision AWS infrastructure

Work in `infra/` only. Write `infra/provision.sh` (bash, AWS CLI v2, re-runnable: look up a resource by name/tag before creating it) and run it. Create, in order:
1. S3 bucket `horse-admin-photos-896860228345` (ap-northeast-2, block all public access, default SSE-S3 encryption).
2. Security groups in the default VPC: `horse-admin-ec2-sg` (inbound 22 from `14.52.96.42/32`, 8000 from `0.0.0.0/0`); `horse-admin-rds-sg` (inbound 5432 from `horse-admin-ec2-sg` and from `14.52.96.42/32`).
3. RDS PostgreSQL: identifier `horse-admin-db`, class `db.t4g.micro`, latest PostgreSQL major supported on that class, 20GB gp3, single-AZ, publicly accessible, backup retention 1 day, master user `horse_admin`, random 24-char alphanumeric password, initial DB `horse_admin`. Wait until available, then create DB `horse_admin_test` (use `psql` if available, else a short Python `psycopg`/`asyncpg` snippet from the developer machine).
4. IAM role `horse-admin-ec2-role` (trust ec2) with inline policy allowing `s3:PutObject,GetObject,DeleteObject,ListBucket` on the bucket only + managed `AmazonSSMManagedInstanceCore`; instance profile of the same name.
5. Key pair `horse-admin-key` → save private key to `infra/secrets/horse-admin-key.pem`.
6. EC2: `t4g.micro`, latest Amazon Linux 2023 arm64 AMI (SSM parameter `/aws/service/ami-amazon-linux-latest/al2023-ami-kernel-default-arm64`), 20GB gp3, `horse-admin-ec2-sg`, instance profile, Name tag `horse-admin-api`. Allocate+associate an Elastic IP.
7. API Gateway HTTP API `horse-admin-api`: HTTP_PROXY integration (method ANY) to `http://<EIP>:8000/{proxy}` for route `ANY /{proxy+}` and to `http://<EIP>:8000/` for `ANY /`; `$default` stage with auto-deploy. HTTPS endpoint = `https://<apiId>.execute-api.ap-northeast-2.amazonaws.com`.

Outputs: `infra/secrets/rds.env` (`DB_HOST, DB_PORT, DB_USER, DB_PASSWORD, DB_NAME, DATABASE_URL=postgresql+asyncpg://..., TEST_DATABASE_URL=...horse_admin_test`), `infra/secrets/api-key.env` (`API_ACCESS_KEY=` 40-char random, generated once), `infra/outputs.json` (non-secret ids: bucket, sg ids, rds endpoint, instance id, EIP, api id, api url). Also write `infra/teardown.sh` (deletes everything in reverse order) — do NOT run it. Verify: `aws rds describe-db-instances` status available, connection to both DBs works from this machine, EC2 running, `curl -s -o /dev/null -w "%{http_code}" <api url>/health` returns 503/502 (no backend yet — integration reachable). Commit `infra/*.sh`, `infra/outputs.json`, `infra/README.md` (short).

### Task 2: Backend scaffold (generate-backend-projects, FastAPI)

Create `backend/` following the generate-backend-projects FastAPI reference (`~/.claude/plugins/marketplaces/auraworks-marketplace/plugins/generate-backend-projects/skills/generate-backend-projects/references/fastapi.md`), adapted: async SQLAlchemy 2 + asyncpg, PostgreSQL only, NO JWT/OAuth/SMS/auth folders (login is out of scope). Contents:
- `src/main.py` (app title "Horse Photo Admin API", version, CORS from env `CORS_ORIGINS`, `/health` → `{"status":"ok"}`, OpenAPI security scheme for X-API-Key), `src/config.py` (pydantic-settings: `DATABASE_URL`, `API_ACCESS_KEY`, `AWS_REGION`, `S3_BUCKET`, `PRESIGN_TTL=3600`, `MAX_UPLOAD_BYTES=10485760`, `CORS_ORIGINS`, `ADMIN_DB_USER`, `ADMIN_DB_PASSWORD` for the DB dashboard), `src/database.py` (async engine/session, `Base`), `src/utils/deps.py` with `get_db` and `require_api_key` (constant-time compare via `secrets.compare_digest`), `api_v1 = APIRouter(prefix="/api/v1", dependencies=[Depends(require_api_key)])` included in main.
- `alembic/` configured for async + `src.database.Base.metadata`, URL from settings.
- `requirements.txt` (pinned), `pyproject.toml` (pytest asyncio mode auto), `.env.example`, `tests/conftest.py` (uses `TEST_DATABASE_URL`, creates/drops schema per session, `AsyncClient` with ASGITransport, `api_headers` fixture), `tests/test_auth.py`: `/health` 200 without key; a `/api/v1` probe route (e.g. `GET /api/v1/ping` → `{"pong": true}`) returns 401 without key, 401 with wrong key, 200 with correct key.
- `backend/.env` filled from `infra/secrets/rds.env` + `api-key.env` if those files exist; otherwise leave `.env.example` only and report it.
Use a venv at `backend/.venv` (python 3.12 locally is fine; keep code 3.11-compatible).

### Task 3: Database models and migration

In `backend/src/models/` create SQLAlchemy models + `src/models/enums.py` (`PartCode` with Korean labels and order, `ChipInputMethod`, `FileFormat`) exactly per Global Constraints:
- `horses`: `id` serial PK; `microchip_no varchar(15)` unique not null + CHECK `~ '^[0-9]{15}$'`; `chip_input_method` enum nullable; `horse_no varchar(20)`, `horse_name varchar(100)`, `birth_date date`, `sex varchar(10)`, `coat_color varchar(30)` nullable (comments: 마번/마명/생년월일/성별/모색, source KRA API); `created_at`, `updated_at` timestamptz default now.
- `photos`: `id` serial PK; `horse_id` FK→horses ON DELETE CASCADE, indexed; `part_code` enum not null; `is_selected bool not null default false`; `file_name varchar(255)`, `file_format` enum, `content_type varchar(50)`, `file_size bigint` CHECK >0, `file_sha256 char(64)` CHECK hex, `width int` CHECK >0, `height int` CHECK >0, `check_codes text[] not null default '{}'`, `recognized_microchip_no varchar(15)` nullable, `evidence_source` (ChipInputMethod) nullable, `s3_key varchar(512)` unique not null, `created_at`. Partial unique index `(horse_id, part_code) WHERE is_selected`.
- `photo_metadata`: `id` serial PK; `photo_id` FK→photos ON DELETE CASCADE unique; `captured_at timestamptz not null`; `gps_lat, gps_lng, gps_accuracy_m double` nullable with CHECK all-null-or-all-not-null + ranges; `iso int`, `exposure_time_ns bigint`, `f_number`, `focal_length_mm`, `zoom_ratio`, `ambient_lux double`, `af_state varchar(50)` nullable; `blur_score double not null` ≥0; `brightness double not null` 0..1; `device_model varchar(100) not null` CHECK `<> ''`; `meta_sha256 char(64) not null`; `created_at`.
Every column gets a SQL `comment` with its Korean meaning + xlsx key. Generate Alembic revision `0001_initial` (autogenerate then review; PG enums created properly) and apply it to `horse_admin` on RDS (`alembic upgrade head`). Tests: `tests/test_models.py` inserting valid rows and asserting the DB rejects: 14-digit microchip, uppercase sha, partial gps, brightness 1.5, two selected photos for the same horse+part.

### Task 4: CRUD APIs (generate-crud-apis)

Follow the generate-crud-apis skill (`~/.claude/plugins/marketplaces/auraworks-marketplace/plugins/generate-crud-apis/skills/generate-crud-apis/SKILL.md` and `references/fastapi-implementation.md`, `references/filter-operators.md`) for API shape (query params, filter operators, response format), but implement services with the async SQLAlchemy models from Task 3 (the reference's Prisma-python service code does not apply). Files: `src/schemas/{horse,photo,photo_metadata,common}.py`, `src/services/{crud_base,horse,photo,photo_metadata}.py`, `src/routers/{horses,photos,photo_metadata}.py`, mounted on the `/api/v1` router. Endpoints exactly as in "Generic CRUD" of the API contract. Schemas camelCase with `Field(description, examples)`; `HorseCreate` validates 15-digit microchip; duplicate microchip → 409. Photos DELETE / horse DELETE must call a `storage` interface to delete S3 objects — define `src/services/storage.py` with `delete_objects(keys)` (boto3) now; Task 5 extends it. Tests `tests/test_crud_*.py`: create/list/filter(`microchipNo=eq.`)/pagination/order/patch/delete for horses; 409 dup; 422 bad microchip; photos list/get/patch/delete (rows inserted directly via session; S3 mocked with moto).

### Task 5: Photo upload, S3, representative selection, DB dashboard

Extend `src/services/storage.py` (`upload_bytes`, `presign_view`, `presign_download` with `ResponseContentDisposition=attachment; filename*=UTF-8''...`, `delete_objects`) and add `src/routers/horse_photos.py`, `src/routers/photo_parts.py`, `src/schemas/upload.py` implementing all "Custom" endpoints of the API contract exactly, including all xlsx validations (multipart metadata parsed into a Pydantic model with camelCase aliases; content-type ↔ fileFormat consistency; 10MB → 413; on DB failure after S3 upload, delete the uploaded object). The upload endpoint must be documented in Swagger with the metadata JSON schema and an example (use `openapi_extra` or a description containing the full example JSON). Mount SQLAdmin at `/dashboard` with ModelViews for horses/photos/photo_metadata (read-mostly, search by microchip/horse_no), protected by `AuthenticationBackend` using `ADMIN_DB_USER`/`ADMIN_DB_PASSWORD` (defaults `admin`/`123456789`). Tests `tests/test_upload.py` (moto S3): happy path for a body slot and the microchip slot (horse chip_input_method updated), invalid sha → 422, gps partial → 422, wrong content-type → 422, >10MB → 413, unknown horse → 404, representative switch keeps exactly one selected, download-url contains `attachment`, photo-parts returns 7 ordered items, by-microchip 200/404.

### Task 6: Frontend scaffold and admin login

Copy the template into `frontend/` (`git clone --depth 1 https://github.com/auraworks/nextjs_admin_master.git` then remove its `.git`; keep its `.claude/skills`). `npm install`. Remove the sample modules (members, programs, master, dashboard sample charts) and their sidebar entries; sidebar becomes: 대시보드 `/admin/dashboard`, 말 촬영 관리 `/admin/horses`. Auth:
- `app/api/auth/login/route.ts` (POST id/password; compares to env `ADMIN_ID`/`ADMIN_PASSWORD`, defaults `admin`/`123456789`; sets httpOnly `admin_session` cookie = HMAC-SHA256 signed token with env `SESSION_SECRET`, 12h), `app/api/auth/logout/route.ts`.
- Wire the template's `LoginForm` to call it, toast on failure, redirect to `/admin/dashboard` on success; logout in header.
- `proxy.ts`: `/` → `/admin/login`; any `/admin/*` except `/admin/login` without a valid session → `/admin/login`.
- `app/api/backend/[...path]/route.ts`: session-checked proxy (GET/POST/PUT/PATCH/DELETE) to `${BACKEND_API_URL}/api/v1/...` adding `X-API-Key: ${API_ACCESS_KEY}`; passes query string and body through.
- `app/api/photos/[id]/file/route.ts`: session-checked; gets the backend `download-url`, fetches the bytes and streams them with `Content-Disposition: attachment` (used for ZIP + single download, avoids S3 CORS).
- `.env.example` (`BACKEND_API_URL`, `API_ACCESS_KEY`, `ADMIN_ID`, `ADMIN_PASSWORD`, `SESSION_SECRET`), `lib/api.ts` typed client with the `Horse`, `PhotoDetail`, `PhotoMetadata`, `PhotoPart` TS types from the API contract.
Dashboard page placeholder (cards filled in Task 7). Verify `npm run build` and `npm run lint` pass; manual check with `npm run dev`: wrong password rejected, correct login lands on dashboard, `/admin/horses` without cookie redirects.

### Task 7: Frontend — horse photo browsing, viewer, download

Pages using template components (Table, Pagination, Input, Button, Badge, Modal, Card):
- `/admin/dashboard`: cards — 등록 말 수, 총 사진 수, 6부위 촬영 완료 말 수 (horses having ≥1 photo in all 6 body parts), 최근 업로드 사진 10개 thumbnails linking to the horse.
- `/admin/horses`: list via `/api/backend/horses` with search (마이크로칩번호, 마번, 마명 → `ilike` filters), pagination, columns: ID, 마이크로칩번호, 마번, 마명, 모색, 성별, 생년월일, 칩 입력방식, 등록일; row click → detail.
- `/admin/horses/[id]`: horse info card; photo section ordered by the 7 parts (6 body parts + 마이크로칩 증빙) showing the representative photo large (badge "대표") and other shots as thumbnails, empty-state "미촬영" for missing parts; clicking opens a viewer modal (full image, zoom in/out/fit, prev/next across photos, metadata table: 촬영일시(KST 표시), GPS (with Google Maps link), ISO, 노출시간, F값, 초점거리, 줌, AF, 조도, 블러, 밝기, 기기, 파일명/형식/크기/해상도, SHA256, 체크코드); buttons: 다운로드 (single, via `/api/photos/{id}/file`), 대표로 지정 (PUT representative), 전체 다운로드 ZIP (jszip; files named `{microchipNo}_{partCode}_{photoId}.{ext}`), 부위별 ZIP not required.
Verify `npm run build` + `npm run lint`; manual check against the running backend (local uvicorn against RDS) with seeded data: login, list, detail, viewer, single download, ZIP download.

### Task 8: Deploy backend to EC2 behind API Gateway

`infra/deploy.sh`: package `backend/` (exclude .venv, tests caches, .env), scp to EC2 (`ec2-user@<EIP>`, key `infra/secrets/horse-admin-key.pem`), install `python3.11 python3.11-pip`, venv in `/opt/horse-admin/backend`, write `/etc/horse-admin.env` (DATABASE_URL, API_ACCESS_KEY, AWS_REGION, S3_BUCKET, CORS_ORIGINS, ADMIN_DB_USER/PASSWORD) — no AWS keys (instance role), run `alembic upgrade head`, install systemd unit `horse-admin-api` (`uvicorn src.main:app --host 0.0.0.0 --port 8000 --proxy-headers --forwarded-allow-ips '*' --workers 2`), enable+restart. Smoke test through the API Gateway URL: `/health` 200, `/docs` 200, `/api/v1/photo-parts` 401 without key and 200 with key, one real upload with a small generated JPEG to a test horse then download-url fetch 200, then delete the test horse. Write the API URL into `frontend/.env.local` `BACKEND_API_URL` (plus `API_ACCESS_KEY`, generated `SESSION_SECRET`). Commit `infra/deploy.sh` and the systemd unit template.

### Task 9: README

Root `README.md` (Korean): architecture diagram (text), folder layout, AWS resources table (from `infra/outputs.json`, no secrets), how to run backend/frontend locally, env vars, deploy, teardown, API auth (`X-API-Key`) + Swagger Authorize usage with the API Gateway `/docs` URL, full API list, upload request example (curl multipart with metadata JSON), photo part code table (7 rows), DB schema tables with column/type/nullable/제약/엑셀키 mapping, **스키마 크로스체크 결과** (마번 not in xlsx → `horses.horse_no` nullable for KRA API; 모색 not in xlsx → `horses.coat_color` nullable; 마명/생년월일/성별 likewise; no session table per xlsx), DB dashboard section (SQLAdmin at `<API URL>/dashboard`, credentials env; also mention DBeaver/pgAdmin connection to RDS), admin login (admin/123456789 — change in prod), known limits (10MB upload, hashes not recomputed, port 8000 open to the internet behind API GW, KRA API not integrated). Also `backend/README.md` and `frontend/README.md` short pointers.
