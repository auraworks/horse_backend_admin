from fastapi import APIRouter, Depends

from src.routers import horses, photo_metadata, photos
from src.utils.deps import require_api_key

api_v1 = APIRouter(prefix="/api/v1", dependencies=[Depends(require_api_key)])


@api_v1.get("/ping", summary="Ping (auth probe)", tags=["system"])
async def ping() -> dict[str, bool]:
    return {"pong": True}


api_v1.include_router(horses.router)
api_v1.include_router(photos.router)
api_v1.include_router(photo_metadata.router)
