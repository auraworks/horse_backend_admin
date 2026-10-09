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
    MAX_UPLOAD_BYTES: int = 10485760
    CORS_ORIGINS: str = "http://localhost:3000"
    # DB dashboard (sqladmin) basic credentials
    ADMIN_DB_USER: str = "admin"
    ADMIN_DB_PASSWORD: str = "123456789"

    @property
    def cors_origins_list(self) -> list[str]:
        return [o.strip() for o in self.CORS_ORIGINS.split(",") if o.strip()]


settings = Settings()
