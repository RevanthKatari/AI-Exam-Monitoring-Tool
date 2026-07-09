from datetime import datetime, timezone

from fastapi import APIRouter, Depends

from app.core.security import get_instructor
from app.db.mongo import db
from app.models.student import StudentResponse
from app.services.formatting import build_timeline, format_flag, status_for_score

router = APIRouter()


async def _student_payload(session_id: str, s: dict, duration: int) -> dict:
    flags = await db.flags.find({
        "session_id": session_id,
        "student_id": s["student_id"],
    }).sort("timestamp", 1).to_list(length=None)

    score = s.get("integrity_score", 100)
    gaze_data = s.get("gazeData", [])
    audio_data = s.get("audioData", [])

    return {
        "id": s["student_id"],
        "name": s["name"],
        "email": s["email"],
        "score": score,
        "status": status_for_score(score),
        "attempt_status": s.get("attempt_status", "not_started"),
        "started_at": s.get("started_at"),
        "submitted_at": s.get("submitted_at"),
        "reference_photo": s.get("reference_photo"),
        "id_capture_photo": s.get("id_capture_photo"),
        "flags": [format_flag(f) for f in flags],
        "timeline": build_timeline(flags, duration),
        "gazeData": gaze_data if gaze_data else [90] * 26,
        "audioData": audio_data if audio_data else [10] * 26,
    }


@router.get("/sessions/{session_id}/students", response_model=list[StudentResponse])
async def get_session_students(session_id: str, _user=Depends(get_instructor)):
    exam = await db.exams.find_one({"session_id": session_id})
    duration = exam["duration_minutes"] if exam else 90

    students = await db.students.find({"session_id": session_id}).to_list(length=None)
    return [await _student_payload(session_id, s, duration) for s in students]


@router.get("/sessions/{session_id}/report")
async def get_session_report(session_id: str, _user=Depends(get_instructor)):
    exam = await db.exams.find_one({"session_id": session_id})
    if exam:
        exam.pop("_id", None)
    duration = exam["duration_minutes"] if exam else 90

    students = await db.students.find({"session_id": session_id}).to_list(length=None)
    students_payload = [await _student_payload(session_id, s, duration) for s in students]

    return {
        "exam": exam,
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "students": students_payload,
    }
