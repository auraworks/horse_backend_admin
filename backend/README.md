# backend

FastAPI + SQLAlchemy 2 (async, asyncpg) + Alembic + Pydantic v2 + boto3. Python 3.11 호환.

- 구조: `src/main.py`(앱), `src/routers`, `src/schemas`, `src/models`, `src/services`, `src/admin.py`(SQLAdmin `/dashboard`), `alembic/`, `tests/`
- 환경변수: `.env.example` 참고 (전체 설명은 루트 [README](../README.md) 5장)
- 실행: `pip install -r requirements.txt && alembic upgrade head && uvicorn src.main:app --reload`
- 테스트: `pytest` (RDS의 `horse_admin_test` DB 사용, S3는 moto)
- 배포: `bash ../infra/deploy.sh`

API 목록, 인증, 스키마 매핑은 루트 [README.md](../README.md)를 참고하세요.
