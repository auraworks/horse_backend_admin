async def test_health_open(client):
    r = await client.get("/health")
    assert r.status_code == 200
    assert r.json() == {"status": "ok"}


async def test_missing_key(client):
    r = await client.get("/api/v1/ping")
    assert r.status_code == 401
    assert r.json() == {"detail": "Invalid or missing API key"}


async def test_wrong_key(client):
    r = await client.get("/api/v1/ping", headers={"X-API-Key": "nope"})
    assert r.status_code == 401
    assert r.json() == {"detail": "Invalid or missing API key"}


async def test_correct_key(client, api_headers):
    r = await client.get("/api/v1/ping", headers=api_headers)
    assert r.status_code == 200
    assert r.json() == {"pong": True}


async def test_docs_open_and_security_scheme(client):
    assert (await client.get("/docs")).status_code == 200
    schema = (await client.get("/openapi.json")).json()
    assert "APIKeyHeader" in schema["components"]["securitySchemes"]
