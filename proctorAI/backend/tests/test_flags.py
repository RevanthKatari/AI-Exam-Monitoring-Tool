async def test_create_flag_no_500_and_no_id_leak(client, exam, instructor_headers):
    # Regression test: insert_one mutates the dict in place with a non-JSON-serializable
    # ObjectId under "_id" — the endpoint must strip it before responding.
    res = await client.post("/api/flags", headers=instructor_headers, json={
        "session_id": exam["session_id"], "student_id": "555000001", "type": "danger",
        "flag_type": "object_detected", "title": "Phone detected", "confidence": 90,
        "description": "test",
    })
    assert res.status_code == 200
    body = res.json()
    assert "_id" not in body["flag"]
    assert body["flag"]["title"] == "Phone detected"


async def test_create_flag_defaults_timestamp_when_omitted(client, exam, instructor_headers):
    res = await client.post("/api/flags", headers=instructor_headers, json={
        "session_id": exam["session_id"], "student_id": "555000001", "type": "warning",
        "flag_type": "gaze_deviation", "title": "Gaze away", "confidence": 70,
    })
    assert res.status_code == 200
    assert res.json()["flag"]["timestamp"] is not None


async def test_create_flag_updates_integrity_score(client, exam, instructor_headers):
    # Regression test: manually-created flags must affect score the same way
    # WebSocket-detected flags do (update_score was previously only wired into the WS handler).
    await client.post("/api/flags", headers=instructor_headers, json={
        "session_id": exam["session_id"], "student_id": "555000001", "type": "danger",
        "flag_type": "escalated", "title": "Escalated", "confidence": 100,
    })
    students = (await client.get(f"/api/sessions/{exam['session_id']}/students", headers=instructor_headers)).json()
    s = next(s for s in students if s["id"] == "555000001")
    assert s["score"] == 85  # 100 - 15 (danger penalty)


async def test_flags_query_filters_by_student(client, exam, instructor_headers):
    await client.post("/api/exams/{}/roster".format(exam["session_id"]), headers=instructor_headers, json={
        "student_id": "555000099", "name": "Other", "email": "other@example.com",
    })
    await client.post("/api/flags", headers=instructor_headers, json={
        "session_id": exam["session_id"], "student_id": "555000001", "type": "danger",
        "flag_type": "object_detected", "title": "For student 1", "confidence": 90,
    })
    await client.post("/api/flags", headers=instructor_headers, json={
        "session_id": exam["session_id"], "student_id": "555000099", "type": "warning",
        "flag_type": "gaze_deviation", "title": "For student 99", "confidence": 70,
    })

    res = await client.get("/api/flags", headers=instructor_headers, params={
        "session_id": exam["session_id"], "student_id": "555000001",
    })
    assert res.status_code == 200
    titles = [f["title"] for f in res.json()]
    assert titles == ["For student 1"]


async def test_flags_query_without_student_returns_all(client, exam, instructor_headers):
    await client.post("/api/flags", headers=instructor_headers, json={
        "session_id": exam["session_id"], "student_id": "555000001", "type": "danger",
        "flag_type": "object_detected", "title": "A", "confidence": 90,
    })
    res = await client.get("/api/flags", headers=instructor_headers, params={"session_id": exam["session_id"]})
    assert res.status_code == 200
    assert len(res.json()) == 1


async def test_student_cannot_create_flags(client, exam, student_headers):
    headers, student_id = student_headers
    res = await client.post("/api/flags", headers=headers, json={
        "session_id": exam["session_id"], "student_id": student_id, "type": "danger",
        "flag_type": "object_detected", "title": "A", "confidence": 90,
    })
    assert res.status_code == 403
