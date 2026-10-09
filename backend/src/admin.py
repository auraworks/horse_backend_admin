import hashlib
import secrets

from fastapi import FastAPI
from sqladmin import Admin, ModelView
from sqladmin.authentication import AuthenticationBackend
from sqlalchemy.ext.asyncio import AsyncEngine
from starlette.requests import Request

from src.config import settings
from src.models import Horse, Photo, PhotoMetadata


class DbAuth(AuthenticationBackend):
    async def login(self, request: Request) -> bool:
        form = await request.form()
        user_ok = secrets.compare_digest(str(form.get("username", "")).encode(), settings.ADMIN_DB_USER.encode())
        pw_ok = secrets.compare_digest(str(form.get("password", "")).encode(), settings.ADMIN_DB_PASSWORD.encode())
        if user_ok and pw_ok:
            request.session.update({"db_admin": True})
            return True
        return False

    async def logout(self, request: Request) -> bool:
        request.session.clear()
        return True

    async def authenticate(self, request: Request) -> bool:
        return bool(request.session.get("db_admin"))


class HorseAdmin(ModelView, model=Horse):
    name, name_plural = "Horse", "Horses"
    column_list = [Horse.id, Horse.microchip_no, Horse.horse_no, Horse.horse_name, Horse.chip_input_method, Horse.created_at]
    column_searchable_list = [Horse.microchip_no, Horse.horse_no, Horse.horse_name]
    column_default_sort = [(Horse.id, True)]
    can_create = False
    can_delete = False  # deleting must also remove S3 objects: use the API


class PhotoAdmin(ModelView, model=Photo):
    name, name_plural = "Photo", "Photos"
    column_list = [Photo.id, Photo.horse_id, Photo.part_code, Photo.is_selected, Photo.file_name, Photo.created_at]
    column_searchable_list = [Photo.file_name, Photo.recognized_microchip_no]
    column_default_sort = [(Photo.id, True)]
    can_create = can_edit = can_delete = False


class PhotoMetadataAdmin(ModelView, model=PhotoMetadata):
    name, name_plural = "Photo metadata", "Photo metadata"
    column_list = [PhotoMetadata.id, PhotoMetadata.photo_id, PhotoMetadata.captured_at, PhotoMetadata.device_model]
    column_searchable_list = [PhotoMetadata.device_model]
    column_default_sort = [(PhotoMetadata.id, True)]
    can_create = can_edit = can_delete = False


def mount_admin(app: FastAPI, engine: AsyncEngine) -> Admin:
    secret = settings.SESSION_SECRET or hashlib.sha256(("dashboard:" + settings.API_ACCESS_KEY).encode()).hexdigest()
    admin = Admin(
        app, engine, base_url="/dashboard", title="Horse Admin DB", authentication_backend=DbAuth(secret_key=secret)
    )
    for view in (HorseAdmin, PhotoAdmin, PhotoMetadataAdmin):
        admin.add_view(view)
    return admin
