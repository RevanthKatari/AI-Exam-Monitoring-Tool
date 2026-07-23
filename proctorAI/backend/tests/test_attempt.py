from tests.conftest import approve_identity


async def test_get_attempt_not_enrolled_404(client, exam, student_headers):
    headers, _ = student_headers
    res = await client.get(f"/api/exams/{exam['session_id']}/attempt", headers=headers, params={"student_id": "999999999"})
    assert res.status_code == 404


async def test_get_attempt_returns_exam_and_defaults(client, exam, student_headers):
    headers, student_id = student_headers
    res = await client.get(f"/api/exams/{exam['session_id']}/attempt", headers=headers, params={"student_id": student_id})
    assert res.status_code == 200
    body = res.json()
    assert body["exam"]["title"] == "Test Exam"
    assert len(body["exam"]["questions"]) == 2
    assert body["attempt_status"] == "not_started"
    assert body["id_capture_photo"] is None
    assert body["identity_status"] == "none"
    assert body["answers"] == {}


# --- identity-review gate ---

async def test_id_photo_submission_sets_pending_status(client, exam, student_headers):
    headers, student_id = student_headers
    res = await client.post(f"/api/exams/{exam['session_id']}/attempt/id-photo", headers=headers, json={
        "student_id": student_id, "photo": "data:image/jpeg;base64,ZmFrZQ==",
    })
    assert res.status_code == 200

    attempt = (await client.get(f"/api/exams/{exam['session_id']}/attempt", headers=headers, params={"student_id": student_id})).json()
    assert attempt["identity_status"] == "pending"
    assert attempt["id_capture_photo"] == "data:image/jpeg;base64,ZmFrZQ=="


async def test_id_photo_unenrolled_student_404(client, exam, student_headers):
    headers, _ = student_headers
    res = await client.post(f"/api/exams/{exam['session_id']}/attempt/id-photo", headers=headers, json={
        "student_id": "nope", "photo": "data:image/jpeg;base64,ZmFrZQ==",
    })
    assert res.status_code == 404


async def test_start_attempt_blocked_before_identity_approved(client, exam, student_headers):
    headers, student_id = student_headers
    res = await client.post(f"/api/exams/{exam['session_id']}/attempt/start", headers=headers, json={"student_id": student_id})
    assert res.status_code == 403


async def test_instructor_can_approve_identity(client, exam, instructor_headers, student_headers):
    headers, student_id = student_headers
    await client.post(f"/api/exams/{exam['session_id']}/attempt/id-photo", headers=headers, json={
        "student_id": student_id, "photo": "data:image/jpeg;base64,ZmFrZQ==",
    })
    res = await client.post(f"/api/exams/{exam['session_id']}/roster/{student_id}/identity", headers=instructor_headers, json={
        "status": "approved",
    })
    assert res.status_code == 200
    assert res.json()["identity_status"] == "approved"


async def test_instructor_can_deny_identity_with_reason(client, exam, instructor_headers, student_headers):
    headers, student_id = student_headers
    await client.post(f"/api/exams/{exam['session_id']}/attempt/id-photo", headers=headers, json={
        "student_id": student_id, "photo": "data:image/jpeg;base64,ZmFrZQ==",
    })
    res = await client.post(f"/api/exams/{exam['session_id']}/roster/{student_id}/identity", headers=instructor_headers, json={
        "status": "denied", "reason": "Photo doesn't match roster reference",
    })
    assert res.status_code == 200
    body = res.json()
    assert body["identity_status"] == "denied"
    assert body["identity_reason"] == "Photo doesn't match roster reference"


async def test_denial_reason_cleared_on_later_approval(client, exam, instructor_headers, student_headers):
    headers, student_id = student_headers
    await client.post(f"/api/exams/{exam['session_id']}/attempt/id-photo", headers=headers, json={
        "student_id": student_id, "photo": "data:image/jpeg;base64,ZmFrZQ==",
    })
    await client.post(f"/api/exams/{exam['session_id']}/roster/{student_id}/identity", headers=instructor_headers, json={
        "status": "denied", "reason": "blurry",
    })
    res = await client.post(f"/api/exams/{exam['session_id']}/roster/{student_id}/identity", headers=instructor_headers, json={
        "status": "approved",
    })
    assert res.json()["identity_reason"] is None


async def test_retake_after_denial_resets_to_pending(client, exam, instructor_headers, student_headers):
    headers, student_id = student_headers
    await client.post(f"/api/exams/{exam['session_id']}/attempt/id-photo", headers=headers, json={
        "student_id": student_id, "photo": "data:image/jpeg;base64,ZmFrZQ==",
    })
    await client.post(f"/api/exams/{exam['session_id']}/roster/{student_id}/identity", headers=instructor_headers, json={
        "status": "denied", "reason": "blurry",
    })
    # student retakes
    await client.post(f"/api/exams/{exam['session_id']}/attempt/id-photo", headers=headers, json={
        "student_id": student_id, "photo": "data:image/jpeg;base64, YW5vdGhlcg==",
    })
    attempt = (await client.get(f"/api/exams/{exam['session_id']}/attempt", headers=headers, params={"student_id": student_id})).json()
    assert attempt["identity_status"] == "pending"
    assert attempt["identity_reason"] is None


async def test_non_owner_instructor_cannot_decide_identity(client, exam, instructor_headers, student_headers):
    headers, student_id = student_headers
    await client.post(f"/api/exams/{exam['session_id']}/attempt/id-photo", headers=headers, json={
        "student_id": student_id, "photo": "data:image/jpeg;base64,ZmFrZQ==",
    })

    await client.post("/auth/register", json={
        "name": "Other Prof", "email": "other@example.com", "password": "test123", "role": "instructor",
    })
    pending = (await client.get("/auth/pending", headers=instructor_headers)).json()
    await client.post(f"/auth/approve/{pending[0]['id']}", headers=instructor_headers)
    other_login = await client.post("/auth/login", json={"email": "other@example.com", "password": "test123"})
    other_headers = {"Authorization": f"Bearer {other_login.json()['access_token']}"}

    res = await client.post(f"/api/exams/{exam['session_id']}/roster/{student_id}/identity", headers=other_headers, json={
        "status": "approved",
    })
    assert res.status_code == 403


# --- gated attempt endpoints (require identity_status == "approved") ---

async def test_start_attempt_sets_started_at_and_status(client, exam, instructor_headers, student_headers):
    await approve_identity(client, instructor_headers, student_headers, exam)
    headers, student_id = student_headers

    res = await client.post(f"/api/exams/{exam['session_id']}/attempt/start", headers=headers, json={"student_id": student_id})
    assert res.status_code == 200
    assert res.json()["started_at"] is not None

    attempt = (await client.get(f"/api/exams/{exam['session_id']}/attempt", headers=headers, params={"student_id": student_id})).json()
    assert attempt["attempt_status"] == "in_progress"


async def test_start_attempt_idempotent_same_timestamp(client, exam, instructor_headers, student_headers):
    await approve_identity(client, instructor_headers, student_headers, exam)
    headers, student_id = student_headers

    r1 = await client.post(f"/api/exams/{exam['session_id']}/attempt/start", headers=headers, json={"student_id": student_id})
    r2 = await client.post(f"/api/exams/{exam['session_id']}/attempt/start", headers=headers, json={"student_id": student_id})
    assert r1.json()["started_at"] == r2.json()["started_at"]


async def test_start_attempt_unenrolled_student_404(client, exam, student_headers):
    headers, _ = student_headers
    res = await client.post(f"/api/exams/{exam['session_id']}/attempt/start", headers=headers, json={"student_id": "nope"})
    assert res.status_code == 404


async def test_save_and_persist_answers(client, exam, instructor_headers, student_headers):
    await approve_identity(client, instructor_headers, student_headers, exam)
    headers, student_id = student_headers

    await client.post(f"/api/exams/{exam['session_id']}/attempt/answers", headers=headers, json={
        "student_id": student_id, "question_id": "q1", "text": "answer one",
    })
    await client.post(f"/api/exams/{exam['session_id']}/attempt/answers", headers=headers, json={
        "student_id": student_id, "question_id": "q2", "text": "answer two",
    })
    attempt = (await client.get(f"/api/exams/{exam['session_id']}/attempt", headers=headers, params={"student_id": student_id})).json()
    assert attempt["answers"] == {"q1": "answer one", "q2": "answer two"}


async def test_overwriting_an_answer_replaces_it(client, exam, instructor_headers, student_headers):
    await approve_identity(client, instructor_headers, student_headers, exam)
    headers, student_id = student_headers

    await client.post(f"/api/exams/{exam['session_id']}/attempt/answers", headers=headers, json={
        "student_id": student_id, "question_id": "q1", "text": "draft",
    })
    await client.post(f"/api/exams/{exam['session_id']}/attempt/answers", headers=headers, json={
        "student_id": student_id, "question_id": "q1", "text": "final",
    })
    attempt = (await client.get(f"/api/exams/{exam['session_id']}/attempt", headers=headers, params={"student_id": student_id})).json()
    assert attempt["answers"]["q1"] == "final"


async def test_submit_attempt_sets_submitted_status(client, exam, instructor_headers, student_headers):
    await approve_identity(client, instructor_headers, student_headers, exam)
    headers, student_id = student_headers

    res = await client.post(f"/api/exams/{exam['session_id']}/attempt/submit", headers=headers, json={"student_id": student_id})
    assert res.status_code == 200
    assert res.json()["submitted_at"] is not None

    attempt = (await client.get(f"/api/exams/{exam['session_id']}/attempt", headers=headers, params={"student_id": student_id})).json()
    assert attempt["attempt_status"] == "submitted"


async def test_instructor_cannot_call_student_attempt_endpoints(client, exam, instructor_headers):
    res = await client.post(f"/api/exams/{exam['session_id']}/attempt/start", headers=instructor_headers, json={"student_id": "555000001"})
    assert res.status_code == 403
