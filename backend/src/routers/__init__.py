from fastapi import APIRouter, Depends

from src.utils.deps import require_api_key

api_v1 = APIRouter(prefix="/api/v1", dependencies=[Depends(require_api_key)])


@api_v1.get("/ping", summary="Ping (auth probe)", tags=["system"])
async def ping() -> dict[str, bool]:
    return {"pong": True}
