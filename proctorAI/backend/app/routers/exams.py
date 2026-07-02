from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException

from app.core.security import get_instructor
from app.db.mongo import db
from app.models.exam import ExamCreate, ExamResponse

router = APIRouter()


@router.post("/exams", response_model=ExamResponse)
async def create_exam(body: ExamCreate, user=Depends(get_instructor)):
    existing = await db.exams.find_one({"session_id": body.session_id})
    if existing:
        raise HTTPException(status_code=400, detail="Session ID already exists")

    doc = {
        "session_id": body.session_id,
        "title": body.title,
        "section": body.section,
        "instructor_id": user["sub"],
        "duration_minutes": body.duration_minutes,
        "started_at": datetime.now(timezone.utc),
        "enrolled_students": body.enrolled_students,
    }
    await db.exams.insert_one(doc)

    for sid in body.enrolled_students:
        student_user = await db.users.find_one({"student_id": sid})
        if not student_user:
            student_user = await db.users.find_one({"email": {"$regex": sid}})
        name = student_user["name"] if student_user else f"Student {sid}"
        email = student_user["email"] if student_user else f"{sid}@uwindsor.ca"
        await db.students.update_one(
            {"session_id": body.session_id, "student_id": sid},
            {
                "$setOnInsert": {
                    "name": name,
                    "email": email,
                    "integrity_score": 100,
                    "gazeData": [],
                    "audioData": [],
                    "joined_at": datetime.now(timezone.utc),
                }
            },
            upsert=True,
        )

    return ExamResponse(**doc)


@router.get("/exams/{session_id}", response_model=ExamResponse)
async def get_exam(session_id: str, _user=Depends(get_instructor)):
    exam = await db.exams.find_one({"session_id": session_id})
    if not exam:
        raise HTTPException(status_code=404, detail="Exam not found")
    exam.pop("_id", None)
    return ExamResponse(**exam)


@router.get("/exams")
async def list_exams(user=Depends(get_instructor)):
    exams = await db.exams.find({"instructor_id": user["sub"]}).to_list(length=None)
    for e in exams:
        e.pop("_id", None)
    return exams
