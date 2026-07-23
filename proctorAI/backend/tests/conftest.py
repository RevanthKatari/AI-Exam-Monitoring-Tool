import os

# Must happen before any `app.*` import: app/db/mongo.py builds its Motor client
# and database handle at import time, bound to whatever MONGO_DB_NAME is set then.
# Pointing this at a separate database keeps tests from ever touching real/demo data.
os.environ.setdefault("MONGO_DB_NAME", "proctorai_test")

import pytest
from httpx import ASGITransport, AsyncClient

from app.db.mongo import db
from app.main import app

# Motor's client binds to whichever event loop is running the first time it's used.
# pytest-asyncio's default is a fresh loop per test function, which then collides
# with that binding ("Event loop is closed"). pytest.ini's asyncio_default_fixture_loop_scope
# / asyncio_default_test_loop_scope = session (requires pytest-asyncio >= 1.0) gives every
# fixture and test one shared loop for the whole run, avoiding that collision without
# needing to manually redefine the deprecated `event_loop` fixture.


@pytest.fixture(autouse=True)
async def clean_db():
    """Every test starts against a fully empty test database."""
    names = await db.list_collection_names()
    for name in names:
        await db[name].delete_many({})
    yield


@pytest.fixture
async def client():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac


@pytest.fixture
async def instructor_headers(client):
    """Registers (and, being the first instructor, auto-approves) an instructor."""
    res = await client.post("/auth/register", json={
        "name": "Test Instructor",
        "email": "instructor@example.com",
        "password": "test123",
        "role": "instructor",
    })
    assert res.status_code == 200, res.text
    token = res.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture
async def student_headers(client):
    """Registers a student with a known student_id and returns (headers, student_id).

    Must run before the `exam` fixture enrolls this same student_id: creating an exam
    roster entry auto-provisions a login (app/routers/exams.py::_ensure_student_login)
    if none exists yet, which would otherwise make this explicit registration fail
    with "already registered". `exam` depends on this fixture to guarantee that order.
    """
    res = await client.post("/auth/register", json={
        "name": "Test Student",
        "email": "student@example.com",
        "password": "test123",
        "role": "student",
        "student_id": "555000001",
    })
    assert res.status_code == 200, res.text
    data = res.json()
    return {"Authorization": f"Bearer {data['access_token']}"}, data["student_id"]


@pytest.fixture
async def exam(client, instructor_headers, student_headers):
    """Creates a two-question, individual-timer exam owned by instructor_headers,
    enrolling the student from student_headers (see that fixture's docstring for why
    the dependency order matters)."""
    _, student_id = student_headers
    res = await client.post("/api/exams", headers=instructor_headers, json={
        "session_id": "test-exam-2026",
        "title": "Test Exam",
        "section": "Section A",
        "duration_minutes": 60,
        "timer_mode": "individual",
        "questions": [
            {"id": "q1", "prompt": "Question one?"},
            {"id": "q2", "prompt": "Question two?"},
        ],
        "enrolled_students": [student_id],
    })
    assert res.status_code == 200, res.text
    return res.json()


async def approve_identity(client, instructor_headers, student_headers, exam):
    """Drives a student past the identity-review gate: submits a placeholder ID photo
    (which puts them into "pending") then has the instructor approve it. Needed before
    calling any of the gated attempt endpoints (start/answers/submit — see
    app/routers/exams.py::_require_identity_approved)."""
    headers, student_id = student_headers
    session_id = exam["session_id"]

    res = await client.post(f"/api/exams/{session_id}/attempt/id-photo", headers=headers, json={
        "student_id": student_id,
        "photo": "data:image/jpeg;base64,ZmFrZQ==",
    })
    assert res.status_code == 200, res.text

    res = await client.post(f"/api/exams/{session_id}/roster/{student_id}/identity", headers=instructor_headers, json={
        "status": "approved",
    })
    assert res.status_code == 200, res.text
