async def test_register_first_instructor_auto_approved(client):
    res = await client.post("/auth/register", json={
        "name": "First Prof", "email": "first@example.com", "password": "test123", "role": "instructor",
    })
    assert res.status_code == 200
    body = res.json()
    assert body["status"] == "approved"
    assert body["access_token"]
    assert body["role"] == "instructor"


async def test_register_second_instructor_pending(client, instructor_headers):
    res = await client.post("/auth/register", json={
        "name": "Second Prof", "email": "second@example.com", "password": "test123", "role": "instructor",
    })
    assert res.status_code == 200
    body = res.json()
    assert body["status"] == "pending"
    assert body["access_token"] is None


async def test_pending_instructor_login_blocked(client, instructor_headers):
    await client.post("/auth/register", json={
        "name": "Second Prof", "email": "second@example.com", "password": "test123", "role": "instructor",
    })
    res = await client.post("/auth/login", json={"email": "second@example.com", "password": "test123"})
    assert res.status_code == 403


async def test_approve_pending_instructor_unblocks_login(client, instructor_headers):
    await client.post("/auth/register", json={
        "name": "Second Prof", "email": "second@example.com", "password": "test123", "role": "instructor",
    })
    pending = (await client.get("/auth/pending", headers=instructor_headers)).json()
    assert len(pending) == 1
    user_id = pending[0]["id"]

    res = await client.post(f"/auth/approve/{user_id}", headers=instructor_headers)
    assert res.status_code == 200

    login = await client.post("/auth/login", json={"email": "second@example.com", "password": "test123"})
    assert login.status_code == 200
    assert login.json()["status"] == "approved"


async def test_reject_pending_instructor_removes_account(client, instructor_headers):
    await client.post("/auth/register", json={
        "name": "Second Prof", "email": "second@example.com", "password": "test123", "role": "instructor",
    })
    pending = (await client.get("/auth/pending", headers=instructor_headers)).json()
    user_id = pending[0]["id"]

    res = await client.post(f"/auth/reject/{user_id}", headers=instructor_headers)
    assert res.status_code == 200

    login = await client.post("/auth/login", json={"email": "second@example.com", "password": "test123"})
    assert login.status_code == 401


async def test_student_registration_always_approved(client):
    res = await client.post("/auth/register", json={
        "name": "A Student", "email": "astudent@example.com", "password": "test123", "role": "student",
    })
    assert res.status_code == 200
    assert res.json()["status"] == "approved"
    assert res.json()["student_id"] is not None


async def test_student_registration_generates_unique_id_when_omitted(client):
    r1 = await client.post("/auth/register", json={
        "name": "S1", "email": "s1@example.com", "password": "test123", "role": "student",
    })
    r2 = await client.post("/auth/register", json={
        "name": "S2", "email": "s2@example.com", "password": "test123", "role": "student",
    })
    assert r1.json()["student_id"] != r2.json()["student_id"]


async def test_student_can_claim_a_specific_id(client):
    res = await client.post("/auth/register", json={
        "name": "S1", "email": "s1@example.com", "password": "test123", "role": "student",
        "student_id": "110195067",
    })
    assert res.status_code == 200
    assert res.json()["student_id"] == "110195067"


async def test_student_cannot_claim_an_id_already_taken(client):
    await client.post("/auth/register", json={
        "name": "S1", "email": "s1@example.com", "password": "test123", "role": "student",
        "student_id": "110195067",
    })
    res = await client.post("/auth/register", json={
        "name": "Impersonator", "email": "imposter@example.com", "password": "test123", "role": "student",
        "student_id": "110195067",
    })
    assert res.status_code == 400
    assert "already registered" in res.json()["detail"]


async def test_duplicate_email_rejected(client):
    await client.post("/auth/register", json={
        "name": "S1", "email": "dup@example.com", "password": "test123", "role": "student",
    })
    res = await client.post("/auth/register", json={
        "name": "S1 again", "email": "dup@example.com", "password": "test123", "role": "student",
    })
    assert res.status_code == 400


async def test_login_wrong_password_rejected(client, student_headers):
    res = await client.post("/auth/login", json={"email": "student@example.com", "password": "wrongpass"})
    assert res.status_code == 401


async def test_invalid_role_rejected(client):
    res = await client.post("/auth/register", json={
        "name": "X", "email": "x@example.com", "password": "test123", "role": "admin",
    })
    assert res.status_code == 400


async def test_protected_endpoint_requires_token(client):
    res = await client.get("/auth/pending")
    assert res.status_code in (401, 403)


async def test_student_cannot_access_instructor_endpoint(client, student_headers):
    headers, _ = student_headers
    res = await client.get("/auth/pending", headers=headers)
    assert res.status_code == 403
