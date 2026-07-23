async def test_health(client):
    res = await client.get("/health")
    assert res.status_code == 200
    assert res.json() == {"status": "ok"}


async def test_db_is_isolated_test_db():
    from app.db.mongo import db
    assert db.name == "proctorai_test"
