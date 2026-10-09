# Horse Admin — 말 사진 관리 시스템

말(개체)의 촬영 사진과 촬영 메타데이터를 저장·조회하는 관리 시스템입니다.
FastAPI 백엔드(EC2, API Gateway HTTPS) + RDS PostgreSQL + S3 + Next.js 관리자 웹으로 구성됩니다.

- API Base URL: `https://rtt4o67y3m.execute-api.ap-northeast-2.amazonaws.com`
- Swagger: `<API URL>/docs` / ReDoc: `<API URL>/redoc` / OpenAPI: `<API URL>/openapi.json`
- DB 대시보드: `<API URL>/dashboard`

## 1. 아키텍처

```
 [Android/iOS 앱]            [Next.js 관리자 웹 (로컬 실행)]
        |                         |  브라우저 -> Next 서버(프록시, X-API-Key 주입)
        | HTTPS                   | HTTPS
        v                         v
   +-----------------------------------------+
   | API Gateway (HTTP API, SSL)             |
   +--------------------+--------------------+
                        | HTTP :8000
                        v
   +-----------------------------------------+
   | EC2 t4g.micro (Amazon Linux 2023, EIP)  |
   | FastAPI + uvicorn (systemd)             |
   | /api/v1/*  /docs  /dashboard(SQLAdmin)  |
   +----------+-------------------+----------+
              | 5432              | boto3 (IAM Role)
              v                   v
   +------------------+   +--------------------------+
   | RDS PostgreSQL   |   | S3 (private, SSE-S3)     |
   | db.t4g.micro     |   | 이미지는 presigned URL로만 |
   +------------------+   +--------------------------+
```

## 2. 폴더 구조

```
backend/    FastAPI 앱 (src/: routers, schemas, models, services), alembic/, tests/
frontend/   Next.js 관리자 (app/, components/, lib/, proxy.ts)
infra/      provision.sh, deploy.sh, teardown.sh, outputs.json, secrets/(git 제외)
docs/       보조 문서
구성플랜.md / 스키마_메타데이터.xlsx   원 요구사항과 스키마 기준 문서
```

## 3. AWS 리소스 (`infra/outputs.json`)

리전 `ap-northeast-2`, 계정 `896860228345`, 모든 리소스 태그 `Project=horse-admin`.

| 리소스 | 값 |
|---|---|
| S3 버킷 | `horse-admin-photos-896860228345` (비공개, Block Public Access, SSE-S3) |
| RDS | `horse-admin-db` (PostgreSQL, db.t4g.micro, 단일 AZ, 20GB gp3) |
| RDS 엔드포인트 | `horse-admin-db.cr0mswk0ucll.ap-northeast-2.rds.amazonaws.com` |
| RDS DB | `horse_admin`(앱), `horse_admin_test`(pytest) |
| EC2 | `i-0013eb0703719d968` (t4g.micro) |
| Elastic IP | `54.117.1.58` |
| EC2 보안그룹 | `sg-0f29a011687168fb4` |
| RDS 보안그룹 | `sg-0f5448e0c9cbaa0c2` (5432: EC2 SG와 개발자 IP `14.52.96.42/32`만 허용) |
| API Gateway | `rtt4o67y3m` (HTTP API) -> `https://rtt4o67y3m.execute-api.ap-northeast-2.amazonaws.com` |

비밀 파일(`infra/secrets/`, git 제외): `rds.env`(DB 접속), `api-key.env`(API_ACCESS_KEY), `dashboard.env`(대시보드 계정), `horse-admin-key.pem`(SSH 키), `session-secret.txt`.
**비밀 값은 이 문서에 적지 않습니다. 위 파일을 참조하세요.**

## 4. 로컬 실행

### 백엔드
```bash
cd backend
python -m venv .venv && source .venv/bin/activate   # Windows: .venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env          # DATABASE_URL, API_ACCESS_KEY 등을 infra/secrets 값으로 채움
alembic upgrade head
uvicorn src.main:app --reload --port 8000
pytest                        # TEST_DATABASE_URL(RDS의 horse_admin_test) 필요, S3는 moto로 모킹
```
SQLite는 사용하지 않으며 개발/테스트/운영 모두 RDS PostgreSQL을 사용합니다 (RDS는 개발자 IP에서만 접근 가능).

### 프론트엔드
```bash
cd frontend
npm install
cp .env.example .env.local    # BACKEND_API_URL, API_ACCESS_KEY, SESSION_SECRET 설정
npm run dev                   # http://localhost:3000/admin
```
프론트는 배포하지 않고 로컬에서 실행합니다. 브라우저는 Next 서버(`/api/backend/*`, `/api/photos/*`)만 호출하고, Next 서버가 `X-API-Key`를 붙여 백엔드로 프록시하므로 **API 키가 브라우저에 노출되지 않습니다.**

## 5. 환경변수

### backend (`backend/.env`, 서버는 `/etc/horse-admin.env`)
| 이름 | 기본값 | 설명 |
|---|---|---|
| `DATABASE_URL` | (필수) | `postgresql+asyncpg://...` 앱 DB |
| `TEST_DATABASE_URL` | - | pytest용 DB (`horse_admin_test`) |
| `API_ACCESS_KEY` | (필수) | `/api/v1` 접근용 고정 키 |
| `AWS_REGION` | `ap-northeast-2` | |
| `S3_BUCKET` | `horse-admin-photos-896860228345` | |
| `PRESIGN_TTL` | `3600` | presigned URL 유효 시간(초) |
| `MAX_UPLOAD_BYTES` | `10485760` | 업로드 최대 크기(10MB) |
| `CORS_ORIGINS` | `http://localhost:3000` | 쉼표 구분 허용 Origin |
| `ADMIN_DB_USER` / `ADMIN_DB_PASSWORD` | `admin` / 개발용 기본값 | DB 대시보드 계정. 배포 시 랜덤 비밀번호로 덮어씀 |
| `SESSION_SECRET` | API_ACCESS_KEY에서 파생 | 대시보드 세션 서명 |
| `SESSION_HTTPS_ONLY` | `false` | 대시보드 세션 쿠키 Secure 플래그 (HTTPS 서비스 시 `true`, deploy.sh가 설정) |

### frontend (`frontend/.env.local`)
| 이름 | 설명 |
|---|---|
| `BACKEND_API_URL` | 백엔드 주소 (API Gateway URL 또는 `http://localhost:8000`) |
| `API_ACCESS_KEY` | 백엔드의 `API_ACCESS_KEY`와 동일 (서버 전용) |
| `ADMIN_ID` / `ADMIN_PASSWORD` | 관리자 로그인 (기본 `admin` / `123456789`, **공개 배포 전 반드시 변경**) |
| `SESSION_SECRET` | `admin_session` 쿠키 서명용 랜덤 문자열 (**공개 배포 전 반드시 설정**) |

## 6. 배포 / 삭제

```bash
bash infra/provision.sh   # 재실행 가능. S3/SG/RDS/EC2/EIP/API Gateway 생성, outputs.json·secrets/ 작성
bash infra/deploy.sh      # backend를 EC2로 전송, venv 설치, alembic upgrade head, systemd 서비스 재시작
                          # CORS_ORIGINS 환경변수로 허용 Origin 지정 (기본 http://localhost:3000)
bash infra/teardown.sh    # 모든 리소스 삭제 (파괴적, DELETE 입력 확인)
```
- `deploy.sh`는 대시보드 비밀번호를 최초 1회 랜덤 생성해 `infra/secrets/dashboard.env`에 저장합니다.
- SSH: `ssh -i infra/secrets/horse-admin-key.pem ec2-user@54.117.1.58` (22번 포트는 개발자 IP만 허용)
- 서비스: systemd `horse-admin-api` (uvicorn, 포트 8000, workers 2, 사용자 `ec2-user`)
- 비용: 최소 사양(db.t4g.micro, t4g.micro EC2, EIP, HTTP API)이지만 켜 두면 과금됩니다. 사용하지 않을 때는 `teardown.sh`로 전부 삭제할 수 있습니다 (사진/DB 데이터도 함께 삭제되며 최종 스냅샷 없음).

## 7. API 인증과 Swagger

`/api/v1/*` 모든 경로는 헤더 `X-API-Key: <API_ACCESS_KEY>`가 필요하며 없거나 틀리면 `401 {"detail": "Invalid or missing API key"}`입니다.
`/health`, `/docs`, `/redoc`, `/openapi.json`은 인증 없이 열립니다. 키 값은 `infra/secrets/api-key.env`에 있습니다.

Swagger 사용법: `https://rtt4o67y3m.execute-api.ap-northeast-2.amazonaws.com/docs` 접속 -> 우측 상단 **Authorize** -> `X-API-Key`에 키 입력 -> Authorize. 이후 Try it out이 인증 헤더를 포함합니다. 모든 엔드포인트에 summary/tags/response_model이 있고, 필드는 설명과 예시, Enum은 허용값이 표시됩니다. JSON 키는 camelCase입니다.

## 8. API 목록

기본 경로 `/api/v1`. 목록 응답은 `{"data": [...], "count": n, "page": p, "limit": l}`.
목록 공통 쿼리: `page`, `limit`, 정렬 `order=field.asc|desc`, 필터 `field=op.value` (op: eq, neq, gt, gte, lt, lte, like, ilike, in, is).

| Method | Path | 설명 |
|---|---|---|
| GET | `/health` | 헬스 체크 (인증 불필요) |
| GET | `/api/v1/ping` | 인증 확인용 |
| GET | `/api/v1/horses` | 말 목록 |
| POST | `/api/v1/horses` | 말 등록 (`microchipNo` 필수 15자리) |
| GET | `/api/v1/horses/{id}` | 말 조회 |
| PATCH | `/api/v1/horses/{id}` | 말 수정 |
| DELETE | `/api/v1/horses/{id}` | 말 삭제 (사진과 S3 객체도 삭제) |
| GET | `/api/v1/horses/by-microchip/{microchipNo}` | 칩번호로 조회 (없으면 404) |
| GET | `/api/v1/horses/{horseId}/photos?partCode=` | 말의 사진 상세 목록 (부위 순서, 최신순) |
| POST | `/api/v1/horses/{horseId}/photos/{slot}` | 사진 업로드 (multipart) -> 201 |
| PUT | `/api/v1/horses/{horseId}/photos/{slot}/representative` | 대표 사진 지정 `{"photoId": 12}` |
| GET | `/api/v1/photos` | 사진 목록 |
| GET | `/api/v1/photos/{id}` | 사진 조회 |
| PATCH | `/api/v1/photos/{id}` | 사진 수정 (checkCodes만) |
| DELETE | `/api/v1/photos/{id}` | 사진 삭제 (S3 객체 포함) |
| GET | `/api/v1/photos/{id}/download-url` | 다운로드용 presigned URL (`Content-Disposition: attachment`) |
| GET | `/api/v1/photo-metadata` | 촬영 메타데이터 목록 |
| GET | `/api/v1/photo-metadata/{id}` | 촬영 메타데이터 조회 |
| GET | `/api/v1/photo-parts` | 촬영 부위 코드 7개 |
| GET | `/api/v1/stats` | `{horseCount, photoCount, horsesWithAllSixParts}` |

사진 생성은 업로드 API로만 가능합니다 (generic POST 없음). 응답의 `viewUrl`/다운로드 URL은 presigned이며 유효시간 3600초입니다.

### 업로드 예시

```bash
curl -X POST "https://rtt4o67y3m.execute-api.ap-northeast-2.amazonaws.com/api/v1/horses/1/photos/front_full" \
  -H "X-API-Key: $API_ACCESS_KEY" \
  -F "photo=@front.jpg;type=image/jpeg" \
  -F 'metadata={
    "fileFormat": "jpeg",
    "fileSize": 2481920,
    "fileSha256": "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
    "width": 4032, "height": 3024,
    "errorCodes": [],
    "capturedAt": "2026-10-08T01:23:45Z",
    "gps": {"latitude": 37.5665, "longitude": 126.9780, "accuracyMeters": 8.5},
    "iso": 100, "exposureTimeNs": 8000000, "fNumber": 1.8, "focalLengthMm": 6.9, "zoomRatio": 1.0,
    "afState": "FOCUSED_LOCKED", "ambientLux": 320.5,
    "blurScore": 12.3, "brightness": 0.52,
    "deviceModel": "SM-S918N",
    "metaSha256": "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"
  }'
```
`slot=microchip`이면 추가 폼 필드 `-F recognizedMicrochipNumber=410123456789012 -F evidenceSource=ocr` (`ocr|manual`)가 필수이며, 말의 `chipInputMethod`가 `evidenceSource`로 갱신됩니다.
오류: 404(없는 말), 422(검증 실패), 413(10MB 초과), 401(키 오류).

동작 규칙:
- 슬롯에 처음 올린 사진은 자동으로 대표 사진(`isSelected=true`)이 됩니다. 변경은 `PUT .../representative`.
- `capturedAt`에 타임존이 없으면 UTC로 간주합니다.
- `fileSha256`/`metaSha256`은 앱이 보낸 값을 그대로 저장하며 서버에서 재계산·검증하지 않습니다.

## 9. 촬영 부위 코드

`microchip`은 6개 부위와 별개의 7번째 증빙 슬롯입니다. `horsesWithAllSixParts` 통계는 1~6번만 집계합니다.

| 순서 | code | 라벨 |
|---|---|---|
| 1 | `front_full` | 정면전체 |
| 2 | `forehead_close` | 근접이마 |
| 3 | `left_full` | 좌측전체 |
| 4 | `right_full` | 우측전체 |
| 5 | `right_rear_oblique` | 우후측입체 |
| 6 | `left_rear_oblique` | 좌후측입체 |
| 7 | `microchip` | 마이크로칩 증빙 |

S3 키: `horses/{horseId}/{partCode}/{uuid4}.{jpg|png}`

## 10. DB 스키마와 엑셀 매핑

공통 Enum: `part_code`(위 7개), `chip_input_method`(`ocr|manual`), `file_format`(`jpeg|png`).

### horses
| 컬럼 | 타입 | Null | 제약 | 엑셀/출처 |
|---|---|---|---|---|
| id | integer PK | N | | horse_id (`> 0`) |
| microchip_no | varchar(15) | N | UNIQUE, `^[0-9]{15}$` | microchip_no (API 키 `microchipNo`) |
| chip_input_method | enum | Y | ocr/manual | chip_input_method (evidenceSource) |
| horse_no | varchar(20) | Y | | 마번 (KRA API, 엑셀에 없음) |
| horse_name | varchar(100) | Y | | 마명 (KRA API) |
| birth_date | date | Y | | 생년월일 (KRA API) |
| sex | varchar(10) | Y | | 성별 (KRA API) |
| coat_color | varchar(30) | Y | | 모색 (KRA API) |
| created_at / updated_at | timestamptz | N | 기본 now() | |

### photos
| 컬럼 | 타입 | Null | 제약 | 엑셀 키 |
|---|---|---|---|---|
| id | integer PK | N | | |
| horse_id | integer FK horses(id) | N | ON DELETE CASCADE | horse_id (URL `{horseId}`) |
| part_code | enum part_code | N | | part_code (URL `{slot}`) |
| is_selected | boolean | N | 기본 false, (horse_id, part_code)당 true 1개(부분 UNIQUE) | is_selected (대표 선택 photoId) |
| file_name | varchar(255) | N | | file_name (photo 파트 filename) |
| file_format | enum | N | jpeg/png | file_format (metadata.fileFormat) |
| content_type | varchar(50) | N | image/jpeg, image/png | Content-Type |
| file_size | bigint | N | `> 0` | file_size (metadata.fileSize) |
| file_sha256 | char(64) | N | `^[0-9a-f]{64}$` | file_sha256 (fileSha256) |
| width, height | integer | N | 각각 `> 0` | width, height |
| check_codes | text[] | N | 기본 `{}` (빈 배열 허용) | check_codes (errorCodes) |
| recognized_microchip_no | varchar(15) | Y | | microchip_no (recognizedMicrochipNumber, microchip 슬롯) |
| evidence_source | enum | Y | ocr/manual | chip_input_method (evidenceSource) |
| s3_key | varchar(512) | N | UNIQUE | (서버 생성) |
| created_at | timestamptz | N | 기본 now() | |

### photo_metadata (photos와 1:1)
| 컬럼 | 타입 | Null | 제약 | 엑셀 키 |
|---|---|---|---|---|
| id | integer PK | N | | |
| photo_id | integer FK photos(id) | N | UNIQUE, ON DELETE CASCADE | |
| captured_at | timestamptz | N | UTC | capturedAt |
| gps_lat | double | Y | -90~90 | gps.latitude |
| gps_lng | double | Y | -180~180 | gps.longitude |
| gps_accuracy_m | double | Y | `>= 0` | gps.accuracyMeters |
| iso | integer | Y | `> 0` | iso |
| exposure_time_ns | bigint | Y | `> 0` | exposureTimeNs |
| f_number | double | Y | `> 0` | fNumber |
| focal_length_mm | double | Y | `> 0` | focalLengthMm |
| zoom_ratio | double | Y | `> 0` | zoomRatio |
| af_state | varchar(50) | Y | | afState |
| ambient_lux | double | Y | `>= 0` | ambientLux |
| blur_score | double | N | `>= 0` | blurScore |
| brightness | double | N | 0~1 | brightness |
| device_model | varchar(100) | N | 빈 문자열 불가 | deviceModel |
| meta_sha256 | char(64) | N | `^[0-9a-f]{64}$` | metaSha256 |
| created_at | timestamptz | N | 기본 now() | |

`gps`는 객체 전체가 null이거나 세 필드가 모두 있어야 합니다 (CHECK `gps_all_or_none`; API에서는 `"gps": null` 또는 `{latitude, longitude, accuracyMeters}`). 엑셀 `file_sha256`은 사진별 정보와 촬영 메타데이터 양쪽에 등장하며 photos에만 저장합니다.

## 11. 스키마 크로스체크 결과

`스키마_메타데이터.xlsx`(기준일 2026-10-08) 대조 결과:

- **마번**: 엑셀에 없음. 앱이 보내는 값이 아니라 한국마사회(KRA) 공공데이터 API 조회로 확보하는 값이라고 명시되어 있어, `horses.horse_no`를 nullable로 두었습니다.
- **모색(말 색깔)**: 엑셀에 없음 -> `horses.coat_color` nullable 컬럼으로 준비했습니다.
- **마명 / 생년월일 / 성별**: 마찬가지로 엑셀 제외 항목 -> `horse_name`, `birth_date`, `sex` nullable. 말 등록/수정 API로 직접 입력할 수 있습니다.
- **세션 테이블 없음**: 엑셀에 "현재 별도 촬영 세션 API·테이블은 없다"고 되어 있어 세션 테이블을 만들지 않았고, 세션 해당 정보(`chip_input_method`, `microchip_no`)는 개체/사진 요청으로 전달됩니다.
- KRA 공공데이터 API 연동 자체는 이번 범위에 포함되지 않았습니다.
- 엑셀 유의사항: 센서/권한에 따라 노출·초점·조도·위치값은 null로 올 수 있고(Android 칩 증빙 사진은 해당 값 대부분 null), 해시는 서버에서 재검증하지 않습니다. 스키마는 이를 허용하도록 nullable로 구성되어 있습니다.

## 12. DB 대시보드 (Supabase 같은 테이블 뷰어)

SQLAdmin을 백엔드에 내장했습니다: `https://rtt4o67y3m.execute-api.ap-northeast-2.amazonaws.com/dashboard`

- 로그인: 사용자 `admin`, 비밀번호는 배포 시 랜덤 생성되어 `infra/secrets/dashboard.env`에 있습니다 (`123456789`가 아님).
- Horses: 조회/검색/수정 가능 (생성·삭제 불가. 삭제는 S3 정리를 위해 API 사용). Photos, Photo metadata: 읽기 전용.
- **DBeaver / pgAdmin**으로 RDS에 직접 접속할 수도 있습니다: 호스트 `horse-admin-db.cr0mswk0ucll.ap-northeast-2.rds.amazonaws.com`, 포트 5432, DB `horse_admin`, 계정/비밀번호는 `infra/secrets/rds.env`. RDS 보안그룹이 `14.52.96.42/32`(개발자 IP)에서만 허용하므로 다른 IP에서는 SG 규칙을 추가해야 합니다.

## 13. 관리자 웹 로그인

- 주소 `http://localhost:3000/admin`, **ID `admin` / PW `123456789`** (환경변수 `ADMIN_ID`, `ADMIN_PASSWORD`로 변경). **운영 사용 전 반드시 변경하세요.**
- 기능: 대시보드(통계), 말 목록/상세, 부위별 사진 보기(뷰어), 촬영 메타데이터 확인, 사진 다운로드.
- 이 비밀번호는 Next 관리자 웹용이며, DB 대시보드(12장)와 별개입니다.
- **경고 (공개 배포 시 필수)**: 기본 계정 `admin` / `123456789`는 스펙상 기본값일 뿐입니다. Amplify 등 공개 호스팅에 배포하기 전에 호스팅 환경변수에 `ADMIN_PASSWORD`(및 필요 시 `ADMIN_ID`)와 `SESSION_SECRET`(긴 랜덤 문자열)을 **반드시** 설정하세요. 설정하지 않으면 누구나 기본 비밀번호로 로그인할 수 있습니다.
- 로그인 시도 제한: IP(`x-forwarded-for`)당 10분에 5회 실패하면 429로 잠깁니다 (서버 인스턴스 메모리 기준의 단순 제한이므로 강한 비밀번호를 대체하지 않습니다).

## 14. 알려진 제한 사항

- 업로드 사진은 10MB 이하 (API Gateway HTTP API 페이로드 한도). 초과 시 413.
- 해시(`fileSha256`, `metaSha256`)는 보낸 값 그대로 저장, 서버 재계산 없음.
- EC2 보안그룹의 8000 포트가 인터넷에 열려 있습니다 (API Gateway가 HTTP 통합으로 접근하기 위함). API 키 없이 `/api/v1`은 거부되지만 직접 접근은 평문 HTTP입니다.
- RDS는 public이며 보안그룹으로만 제한됩니다.
- KRA 공공데이터 API 미연동 (마번/마명/생년월일/성별/모색은 nullable 컬럼으로만 존재).
- 서비스가 `ec2-user` 권한으로 실행됩니다.
- 서버 `CORS_ORIGINS`는 현재 `http://localhost:3000`입니다. 프론트 주소가 바뀌면 `CORS_ORIGINS=... bash infra/deploy.sh`로 재배포하세요 (Next 서버 프록시를 쓰면 브라우저 CORS와 무관).
- 로그인/사용자 계정 체계는 없고 고정 API 키 하나로 인증합니다.
- **Next 관리자 웹의 기본 비밀번호(`admin`/`123456789`)와 `SESSION_SECRET`은 공개 사용 전에 반드시 Amplify/호스팅 환경변수로 교체해야 합니다** (13장 참고). 로그인 제한은 인스턴스 메모리 기반의 단순 구현입니다.
