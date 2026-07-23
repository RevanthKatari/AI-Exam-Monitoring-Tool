async def test_create_exam(client, instructor_headers):
    res = await client.post("/api/exams", headers=instructor_headers, json={
        "session_id": "s1", "title": "T", "section": "A", "duration_minutes": 90,
        "timer_mode": "synchronized", "questions": [], "enrolled_students": [],
    })
    assert res.status_code == 200
    body = res.json()
    assert body["session_id"] == "s1"
    assert body["timer_mode"] == "synchronized"
    assert body["started_at"] is None


async def test_create_exam_duplicate_session_id_rejected(client, instructor_headers):
    payload = {
        "session_id": "dup", "title": "T", "section": "A", "duration_minutes": 90,
        "questions": [], "enrolled_students": [],
    }
    await client.post("/api/exams", headers=instructor_headers, json=payload)
    res = await client.post("/api/exams", headers=instructor_headers, json=payload)
    assert res.status_code == 400


async def test_get_exam(client, exam, instructor_headers):
    res = await client.get(f"/api/exams/{exam['session_id']}", headers=instructor_headers)
    assert res.status_code == 200
    assert res.json()["title"] == "Test Exam"


async def test_get_nonexistent_exam_404(client, instructor_headers):
    res = await client.get("/api/exams/does-not-exist", headers=instructor_headers)
    assert res.status_code == 404


async def test_list_exams_scoped_to_owner(client, instructor_headers, exam):
    res = await client.get("/api/exams", headers=instructor_headers)
    assert res.status_code == 200
    ids = [e["session_id"] for e in res.json()]
    assert exam["session_id"] in ids


async def test_another_instructor_cannot_see_exam_in_their_list(client, instructor_headers, exam):
    other = await client.post("/auth/register", json={
        "name": "Other Prof", "email": "other@example.com", "password": "test123", "role": "instructor",
    })
    # second instructor is pending (first-instructor bootstrap already used), so
    # approve them via the first instructor before checking their exam list
    pending = (await client.get("/auth/pending", headers=instructor_headers)).json()
    user_id = pending[0]["id"]
    await client.post(f"/auth/approve/{user_id}", headers=instructor_headers)
    other_login = await client.post("/auth/login", json={"email": "other@example.com", "password": "test123"})
    other_headers = {"Authorization": f"Bearer {other_login.json()['access_token']}"}

    res = await client.get("/api/exams", headers=other_headers)
    ids = [e["session_id"] for e in res.json()]
    assert exam["session_id"] not in ids


async def test_non_owner_cannot_edit_exam(client, instructor_headers, exam):
    other = await client.post("/auth/register", json={
        "name": "Other Prof", "email": "other@example.com", "password": "test123", "role": "instructor",
    })
    pending = (await client.get("/auth/pending", headers=instructor_headers)).json()
    await client.post(f"/auth/approve/{pending[0]['id']}", headers=instructor_headers)
    other_login = await client.post("/auth/login", json={"email": "other@example.com", "password": "test123"})
    other_headers = {"Authorization": f"Bearer {other_login.json()['access_token']}"}

    res = await client.put(f"/api/exams/{exam['session_id']}", headers=other_headers, json={"title": "Hijacked"})
    assert res.status_code == 403


async def test_update_exam_partial_fields(client, exam, instructor_headers):
    res = await client.put(f"/api/exams/{exam['session_id']}", headers=instructor_headers, json={
        "title": "Renamed Exam",
    })
    assert res.status_code == 200
    body = res.json()
    assert body["title"] == "Renamed Exam"
    assert body["section"] == "Section A"  # untouched fields survive


async def test_start_exam_sets_started_at(client, exam, instructor_headers):
    res = await client.post(f"/api/exams/{exam['session_id']}/start", headers=instructor_headers)
    assert res.status_code == 200
    assert res.json()["started_at"] is not None


async def test_start_exam_idempotent(client, exam, instructor_headers):
    r1 = await client.post(f"/api/exams/{exam['session_id']}/start", headers=instructor_headers)
    r2 = await client.post(f"/api/exams/{exam['session_id']}/start", headers=instructor_headers)
    assert r1.json()["started_at"] == r2.json()["started_at"]


async def test_delete_exam_cascades_students_and_flags(client, exam, instructor_headers):
    # create a flag tied to the exam's session
    await client.post("/api/flags", headers=instructor_headers, json={
        "session_id": exam["session_id"], "student_id": "555000001", "type": "danger",
        "flag_type": "object_detected", "title": "t", "confidence": 90,
    })
    res = await client.delete(f"/api/exams/{exam['session_id']}", headers=instructor_headers)
    assert res.status_code == 200

    get_res = await client.get(f"/api/exams/{exam['session_id']}", headers=instructor_headers)
    assert get_res.status_code == 404

    roster = await client.get(f"/api/exams/{exam['session_id']}/roster", headers=instructor_headers)
    assert roster.status_code == 404 or roster.json() == []


# --- roster ---

async def test_roster_reflects_enrolled_students(client, exam, instructor_headers):
    res = await client.get(f"/api/exams/{exam['session_id']}/roster", headers=instructor_headers)
    assert res.status_code == 200
    ids = [s["student_id"] for s in res.json()]
    assert "555000001" in ids


async def test_add_roster_student(client, exam, instructor_headers):
    res = await client.post(f"/api/exams/{exam['session_id']}/roster", headers=instructor_headers, json={
        "student_id": "555000002", "name": "New Kid", "email": "nk@example.com",
    })
    assert res.status_code == 200
    assert res.json()["name"] == "New Kid"


async def test_edit_roster_student_name_email(client, exam, instructor_headers):
    res = await client.put(f"/api/exams/{exam['session_id']}/roster/555000001", headers=instructor_headers, json={
        "name": "Renamed Student", "email": "renamed@example.com",
    })
    assert res.status_code == 200
    assert res.json()["name"] == "Renamed Student"
    assert res.json()["email"] == "renamed@example.com"


async def test_edit_nonexistent_roster_student_404(client, exam, instructor_headers):
    res = await client.put(f"/api/exams/{exam['session_id']}/roster/nope", headers=instructor_headers, json={
        "name": "X",
    })
    assert res.status_code == 404


async def test_remove_roster_student(client, exam, instructor_headers):
    res = await client.delete(f"/api/exams/{exam['session_id']}/roster/555000001", headers=instructor_headers)
    assert res.status_code == 200
    roster = (await client.get(f"/api/exams/{exam['session_id']}/roster", headers=instructor_headers)).json()
    assert all(s["student_id"] != "555000001" for s in roster)


async def test_csv_import_with_header(client, exam, instructor_headers):
    csv_content = "student_id,name,email\n700001,Alice,alice@example.com\n700002,Bob,bob@example.com\n"
    files = {"file": ("roster.csv", csv_content, "text/csv")}
    res = await client.post(f"/api/exams/{exam['session_id']}/roster/csv", headers=instructor_headers, files=files)
    assert res.status_code == 200
    assert res.json()["count"] == 2

    roster = (await client.get(f"/api/exams/{exam['session_id']}/roster", headers=instructor_headers)).json()
    ids = [s["student_id"] for s in roster]
    assert "700001" in ids and "700002" in ids


async def test_csv_import_without_header(client, exam, instructor_headers):
    csv_content = "700003,Carol,carol@example.com\n700004,Dave,dave@example.com\n"
    files = {"file": ("roster.csv", csv_content, "text/csv")}
    res = await client.post(f"/api/exams/{exam['session_id']}/roster/csv", headers=instructor_headers, files=files)
    assert res.status_code == 200
    assert res.json()["count"] == 2


async def test_csv_import_skips_blank_rows(client, exam, instructor_headers):
    csv_content = "student_id,name,email\n700005,Eve,eve@example.com\n\n700006,Frank,frank@example.com\n"
    files = {"file": ("roster.csv", csv_content, "text/csv")}
    res = await client.post(f"/api/exams/{exam['session_id']}/roster/csv", headers=instructor_headers, files=files)
    assert res.status_code == 200
    assert res.json()["count"] == 2
