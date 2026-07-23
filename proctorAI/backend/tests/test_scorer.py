from app.ai.scorer import update_score
from app.db.mongo import db


async def _insert_flag(session_id, student_id, flag_type):
    await db.flags.insert_one({"session_id": session_id, "student_id": student_id, "type": flag_type})


async def test_no_flags_gives_full_score():
    await update_score("s1", "st1")
    doc = await db.students.find_one({"session_id": "s1", "student_id": "st1"})
    assert doc["integrity_score"] == 100


async def test_danger_flag_deducts_fifteen():
    await _insert_flag("s1", "st1", "danger")
    await update_score("s1", "st1")
    doc = await db.students.find_one({"session_id": "s1", "student_id": "st1"})
    assert doc["integrity_score"] == 85


async def test_warning_flag_deducts_five():
    await _insert_flag("s1", "st1", "warning")
    await update_score("s1", "st1")
    doc = await db.students.find_one({"session_id": "s1", "student_id": "st1"})
    assert doc["integrity_score"] == 95


async def test_info_flag_deducts_one():
    await _insert_flag("s1", "st1", "info")
    await update_score("s1", "st1")
    doc = await db.students.find_one({"session_id": "s1", "student_id": "st1"})
    assert doc["integrity_score"] == 99


async def test_score_floors_at_zero_not_negative():
    for _ in range(10):
        await _insert_flag("s1", "st1", "danger")  # 10 * 15 = 150 deduction
    await update_score("s1", "st1")
    doc = await db.students.find_one({"session_id": "s1", "student_id": "st1"})
    assert doc["integrity_score"] == 0


async def test_scoring_is_scoped_to_session_and_student():
    await _insert_flag("s1", "st1", "danger")
    await _insert_flag("s2", "st1", "danger")  # different session, should not count
    await _insert_flag("s1", "st2", "danger")  # different student, should not count
    await update_score("s1", "st1")
    doc = await db.students.find_one({"session_id": "s1", "student_id": "st1"})
    assert doc["integrity_score"] == 85


async def test_unknown_flag_type_treated_as_info():
    await _insert_flag("s1", "st1", "something_unexpected")
    await update_score("s1", "st1")
    doc = await db.students.find_one({"session_id": "s1", "student_id": "st1"})
    assert doc["integrity_score"] == 99
