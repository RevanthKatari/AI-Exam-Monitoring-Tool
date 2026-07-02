from datetime import datetime, timezone

from fastapi import APIRouter, Depends

from app.core.security import get_instructor
from app.db.mongo import db
from app.models.student import StudentResponse

router = APIRouter()

ICON_MAP = {
    "object_detected": "device-mobile",
    "multiple_persons": "users",
    "face_not_visible": "eye-off",
    "gaze_deviation": "eye-off",
    "tab_switch": "layout-2",
    "window_blur": "layout-2",
    "voice_detected": "volume",
    "audio_spike": "volume",
}


def _status(score: int) -> str:
    if score < 60:
        return "high-risk"
    if score < 80:
        return "flagged"
    return "clean"


def _icon(flag_type: str | None) -> str:
    return ICON_MAP.get(flag_type or "", "eye-off")


def _fmt_time(timestamp) -> str:
    if timestamp is None:
        return "—"
    if isinstance(timestamp, (int, float)):
        dt = datetime.fromtimestamp(timestamp / 1000, tz=timezone.utc)
    else:
        dt = timestamp
    return dt.strftime("%H:%M")


def _format_flag(f: dict) -> dict:
    return {
        "type": f.get("type"),
        "icon": _icon(f.get("flag_type")),
        "title": f.get("title"),
        "time": _fmt_time(f.get("timestamp")),
        "confidence": f.get("confidence"),
        "duration": f.get("duration"),
        "description": f.get("description"),
    }


def _build_timeline(flags: list[dict], duration_minutes: int = 90) -> list[dict]:
    if not flags:
        return [{"t": 0.0, "type": "ok"}]

    session_ms = duration_minutes * 60 * 1000
    timestamps = [f.get("timestamp", 0) for f in flags if f.get("timestamp")]
    if not timestamps:
        return [{"t": 0.5, "type": flags[0].get("type", "warning")}]

    start_ts = min(timestamps)
    events = [{"t": 0.0, "type": "ok"}]
    for f in flags:
        ts = f.get("timestamp", start_ts)
        t = min(1.0, max(0.0, (ts - start_ts) / session_ms))
        events.append({"t": round(t, 2), "type": f.get("type", "warning")})
    return events


@router.get("/sessions/{session_id}/students", response_model=list[StudentResponse])
async def get_session_students(session_id: str, _user=Depends(get_instructor)):
    exam = await db.exams.find_one({"session_id": session_id})
    duration = exam["duration_minutes"] if exam else 90

    students = await db.students.find({"session_id": session_id}).to_list(length=None)
    result = []

    for s in students:
        flags = await db.flags.find({
            "session_id": session_id,
            "student_id": s["student_id"],
        }).sort("timestamp", 1).to_list(length=None)

        score = s.get("integrity_score", 100)
        gaze_data = s.get("gazeData", [])
        audio_data = s.get("audioData", [])

        result.append({
            "id": s["student_id"],
            "name": s["name"],
            "email": s["email"],
            "score": score,
            "status": _status(score),
            "flags": [_format_flag(f) for f in flags],
            "timeline": _build_timeline(flags, duration),
            "gazeData": gaze_data if gaze_data else [90] * 26,
            "audioData": audio_data if audio_data else [10] * 26,
        })

    return result
