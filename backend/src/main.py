from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from src.admin import mount_admin
from src.config import settings
from src.database import engine
from src.routers import api_v1, public_v1

app = FastAPI(
    title="Horse Photo Admin API",
    version="0.1.0",
    description="Horse photo admin backend. All /api/v1 routes require the X-API-Key header.",
)

class RelativeRedirectMiddleware:
    """API Gateway forwards the integration host (EIP:8000), so absolute redirect
    Locations to this app (e.g. SQLAdmin login) would leave the gateway. Make those relative.
    Redirects to other hosts (e.g. presigned S3 URLs) are left untouched."""

    def __init__(self, app):
        self.app = app

    async def __call__(self, scope, receive, send):
        if scope["type"] != "http":
            return await self.app(scope, receive, send)
        own_host = dict(scope.get("headers") or []).get(b"host", b"").lower()

        async def send_wrapper(message):
            if message["type"] == "http.response.start" and 300 <= message["status"] < 400:
                headers = []
                for k, v in message["headers"]:
                    if k.lower() == b"location" and v.startswith((b"http://", b"https://")):
                        rest = v.split(b"://", 1)[1]
                        host, _, path = rest.partition(b"/")
                        if own_host and host.lower() == own_host:
                            v = b"/" + path
                    headers.append((k, v))
                message = {**message, "headers": headers}
            await send(message)

        await self.app(scope, receive, send_wrapper)


app.add_middleware(RelativeRedirectMiddleware)
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


app.include_router(public_v1)
app.include_router(api_v1)
mount_admin(app, engine)
