from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict

BASE_DIR = Path(__file__).resolve().parent.parent


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=BASE_DIR / ".env", env_file_encoding="utf-8", extra="ignore"
    )

    DATABASE_URL: str
    API_ACCESS_KEY: str
    AWS_REGION: str = "ap-northeast-2"
    S3_BUCKET: str = "horse-admin-photos-896860228345"
    PRESIGN_TTL: int = 3600
    # Presigned S3 upload flow (client -> S3 directly; S3 enforces the size via content-length-range).
    MAX_UPLOAD_BYTES: int = 104857600  # 100MB
    UPLOAD_URL_TTL: int = 900  # seconds a presigned upload form stays valid
    # Legacy multipart upload through the API. API Gateway HTTP API rejects bodies over 10MB
    # (hard AWS limit), so this path cannot go higher; larger photos must use the presigned flow.
    MAX_DIRECT_UPLOAD_BYTES: int = 10485760  # 10MB
    CORS_ORIGINS: str = "http://localhost:3000"
    # DB dashboard (sqladmin) basic credentials
    ADMIN_DB_USER: str = "admin"
    ADMIN_DB_PASSWORD: str = "123456789"
    SESSION_HTTPS_ONLY: bool = False  # set True when served over HTTPS (dashboard session cookie Secure flag)
    SESSION_SECRET: str | None = None  # defaults to a key derived from API_ACCESS_KEY

    @property
    def cors_origins_list(self) -> list[str]:
        return [o.strip() for o in self.CORS_ORIGINS.split(",") if o.strip()]


settings = Settings()
