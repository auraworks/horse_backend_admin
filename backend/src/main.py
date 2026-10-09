from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from src.config import settings
from src.routers import api_v1

app = FastAPI(
    title="Horse Photo Admin API",
    version="0.1.0",
    description="Horse photo admin backend. All /api/v1 routes require the X-API-Key header.",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health", summary="Health check", tags=["system"])
async def health() -> dict[str, str]:
    return {"status": "ok"}


app.include_router(api_v1)
