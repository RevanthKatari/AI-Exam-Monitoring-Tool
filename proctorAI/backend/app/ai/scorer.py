from app.db.mongo import db

PENALTIES = {
    "danger": 15,
    "warning": 5,
    "info": 1,
}


async def update_score(session_id: str, student_id: str):
    """Recomputes integrity score from all flags and updates student document."""
    flags = await db.flags.find({
        "session_id": session_id,
        "student_id": student_id,
    }).to_list(length=None)

    deductions = sum(PENALTIES.get(f.get("type", "info"), 1) for f in flags)
    score = max(0, 100 - deductions)

    await db.students.update_one(
        {"session_id": session_id, "student_id": student_id},
        {"$set": {"integrity_score": score}},
        upsert=True,
    )
