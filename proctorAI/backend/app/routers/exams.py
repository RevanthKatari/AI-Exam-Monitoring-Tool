import asyncio
import base64
import csv
import io
import logging
from datetime import datetime, timezone

import requests
from fastapi import APIRouter, Depends, File, HTTPException, UploadFile

from app.core.security import get_instructor, get_student, hash_password
from app.db.mongo import db
from app.models.exam import (
    ExamCreate,
    ExamResponse,
    ExamUpdate,
    IdentityDecision,
    PhotoUpload,
    RosterAdd,
    RosterEntry,
    RosterUpdate,
)
from app.models.student import AnswerSubmit, AttemptStudentRequest, IdPhotoSubmit

router = APIRouter()
logger = logging.getLogger("uvicorn.error")

MAX_PHOTO_URL_BYTES = 3 * 1024 * 1024
DEFAULT_STUDENT_PASSWORD = "test123"


def _mongo_precision_now() -> datetime:
    """datetime.now() carries microseconds, but MongoDB/BSON only stores millisecond
    precision. Round here so a timestamp we hand back in a response is identical to
    what a later read of the same persisted field returns."""
    now = datetime.now(timezone.utc)
    return now.replace(microsecond=(now.microsecond // 1000) * 1000)


def _fetch_photo_as_data_url(url: str) -> str | None:
    """Fetch an instructor-supplied image URL (e.g. from a CSV column) and convert it
    to a base64 data URL. Runs in a worker thread — never called on the event loop."""
    try:
        resp = requests.get(url, timeout=5, stream=True)
        resp.raise_for_status()
        content_type = resp.headers.get("content-type", "")
        if not content_type.startswith("image/"):
            return None
        chunks = []
        total = 0
        for chunk in resp.iter_content(8192):
            total += len(chunk)
            if total > MAX_PHOTO_URL_BYTES:
                return None
            chunks.append(chunk)
        encoded = base64.b64encode(b"".join(chunks)).decode()
        return f"data:{content_type};base64,{encoded}"
    except Exception:
        return None


async def _ensure_student_login(student_id: str, name: str, email: str):
    """Auto-provision a login account (password "test123") for a roster student so
    they can sign in immediately without self-registering first. Only creates one
    if neither this student_id nor this email already has an account — self-registration
    still works normally and will just find/use the account created here."""
    existing = await db.users.find_one({"student_id": student_id, "role": "student"})
    if existing:
        return
    email_taken = await db.users.find_one({"email": email})
    if email_taken:
        return
    await db.users.insert_one({
        "name": name,
        "email": email,
        "password_hash": hash_password(DEFAULT_STUDENT_PASSWORD),
        "role": "student",
        "status": "approved",
        "student_id": student_id,
    })


async def _upsert_roster_student(session_id: str, student_id: str, name: str | None, email: str | None):
    if not name or not email:
        student_user = await db.users.find_one({"student_id": student_id})
        if not student_user:
            student_user = await db.users.find_one({"email": {"$regex": student_id}})
        name = name or (student_user["name"] if student_user else f"Student {student_id}")
        email = email or (student_user["email"] if student_user else f"{student_id}@uwindsor.ca")

    await _ensure_student_login(student_id, name, email)

    await db.students.update_one(
        {"session_id": session_id, "student_id": student_id},
        {
            "$setOnInsert": {
                "name": name,
                "email": email,
                "integrity_score": 100,
                "gazeData": [],
                "audioData": [],
                "attempt_status": "not_started",
                "started_at": None,
                "submitted_at": None,
                "answers": {},
                "joined_at": datetime.now(timezone.utc),
                "identity_status": "none",
                "identity_reason": None,
            }
        },
        upsert=True,
    )


async def _get_owned_exam(session_id: str, user: dict) -> dict:
    exam = await db.exams.find_one({"session_id": session_id})
    if not exam:
        raise HTTPException(status_code=404, detail="Exam not found")
    if exam["instructor_id"] != user["sub"]:
        raise HTTPException(status_code=403, detail="You do not own this exam")
    return exam


async def _require_identity_approved(session_id: str, student_id: str):
    """Server-side backstop for the identity-review gate: even if a client bypasses
    the UI and calls the attempt endpoints directly, a student whose identity photo
    hasn't been approved by the instructor (still "none", "pending", or "denied")
    cannot start, answer, or submit an attempt."""
    student = await db.students.find_one({"session_id": session_id, "student_id": student_id})
    if not student or student.get("identity_status") != "approved":
        raise HTTPException(
            status_code=403,
            detail="Identity verification has not been approved by your instructor yet.",
        )


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
        "timer_mode": body.timer_mode,
        "questions": [q.model_dump() for q in body.questions],
        "created_at": datetime.now(timezone.utc),
        "started_at": None,
        "enrolled_students": body.enrolled_students,
    }
    await db.exams.insert_one(doc)

    for sid in body.enrolled_students:
        await _upsert_roster_student(body.session_id, sid, None, None)

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
    exams = await db.exams.find({"instructor_id": user["sub"]}).sort("created_at", -1).to_list(length=None)
    for e in exams:
        e.pop("_id", None)
    return exams


@router.put("/exams/{session_id}", response_model=ExamResponse)
async def update_exam(session_id: str, body: ExamUpdate, user=Depends(get_instructor)):
    exam = await _get_owned_exam(session_id, user)

    updates = {k: v for k, v in body.model_dump(exclude_unset=True).items() if v is not None}
    if "questions" in updates:
        updates["questions"] = [q if isinstance(q, dict) else q.model_dump() for q in updates["questions"]]
    if updates:
        await db.exams.update_one({"session_id": session_id}, {"$set": updates})
        exam.update(updates)

    exam.pop("_id", None)
    return ExamResponse(**exam)


@router.delete("/exams/{session_id}")
async def delete_exam(session_id: str, user=Depends(get_instructor)):
    await _get_owned_exam(session_id, user)

    await db.exams.delete_one({"session_id": session_id})
    await db.students.delete_many({"session_id": session_id})
    await db.flags.delete_many({"session_id": session_id})
    return {"status": "deleted"}


@router.post("/exams/{session_id}/start", response_model=ExamResponse)
async def start_exam(session_id: str, user=Depends(get_instructor)):
    exam = await _get_owned_exam(session_id, user)

    if not exam.get("started_at"):
        now = _mongo_precision_now()
        await db.exams.update_one({"session_id": session_id}, {"$set": {"started_at": now}})
        exam["started_at"] = now

    exam.pop("_id", None)
    return ExamResponse(**exam)


def _roster_entry(s: dict) -> RosterEntry:
    return RosterEntry(
        student_id=s["student_id"],
        name=s["name"],
        email=s["email"],
        attempt_status=s.get("attempt_status", "not_started"),
        score=s.get("integrity_score", 100),
        reference_photo=s.get("reference_photo"),
        id_capture_photo=s.get("id_capture_photo"),
        identity_status=s.get("identity_status", "none"),
        identity_reason=s.get("identity_reason"),
    )


@router.get("/exams/{session_id}/roster", response_model=list[RosterEntry])
async def get_roster(session_id: str, _user=Depends(get_instructor)):
    students = await db.students.find({"session_id": session_id}).to_list(length=None)
    return [_roster_entry(s) for s in students]


@router.post("/exams/{session_id}/roster", response_model=RosterEntry)
async def add_roster_student(session_id: str, body: RosterAdd, user=Depends(get_instructor)):
    exam = await _get_owned_exam(session_id, user)

    await _upsert_roster_student(session_id, body.student_id, body.name, body.email)
    if body.student_id not in exam.get("enrolled_students", []):
        await db.exams.update_one(
            {"session_id": session_id},
            {"$addToSet": {"enrolled_students": body.student_id}},
        )

    s = await db.students.find_one({"session_id": session_id, "student_id": body.student_id})
    return _roster_entry(s)


@router.put("/exams/{session_id}/roster/{student_id}", response_model=RosterEntry)
async def edit_roster_student(session_id: str, student_id: str, body: RosterUpdate, user=Depends(get_instructor)):
    await _get_owned_exam(session_id, user)

    updates = {k: v for k, v in body.model_dump(exclude_unset=True).items() if v is not None}
    if updates:
        result = await db.students.update_one(
            {"session_id": session_id, "student_id": student_id},
            {"$set": updates},
        )
        if result.matched_count == 0:
            raise HTTPException(status_code=404, detail="Student not found on this roster")

    s = await db.students.find_one({"session_id": session_id, "student_id": student_id})
    if not s:
        raise HTTPException(status_code=404, detail="Student not found on this roster")
    return _roster_entry(s)


@router.post("/exams/{session_id}/roster/csv")
async def import_roster_csv(session_id: str, user=Depends(get_instructor), file: UploadFile = File(...)):
    await _get_owned_exam(session_id, user)

    raw = (await file.read()).decode("utf-8-sig")
    reader = csv.DictReader(io.StringIO(raw))
    # Accept common header variants; fall back to first three columns positionally
    # if headers don't match, so a plain "id,name,email" file with no header works too.
    # A "photo_url" column is optional — if present, we fetch the image server-side
    # (bounded by size/timeout/content-type) and store it as the reference photo.
    fieldnames = [f.strip().lower() for f in (reader.fieldnames or [])]
    has_header = "student_id" in fieldnames or "id" in fieldnames

    added = []
    errors = []
    if has_header:
        rows = list(reader)
    else:
        rows = list(csv.reader(io.StringIO(raw)))

    for i, row in enumerate(rows, start=1):
        try:
            photo_url = None
            if has_header:
                student_id = (row.get("student_id") or row.get("id") or "").strip()
                name = (row.get("name") or "").strip() or None
                email = (row.get("email") or "").strip() or None
                photo_url = (row.get("photo_url") or row.get("photo") or "").strip() or None
            else:
                if not row or not row[0].strip():
                    continue
                student_id = row[0].strip()
                name = row[1].strip() if len(row) > 1 and row[1].strip() else None
                email = row[2].strip() if len(row) > 2 and row[2].strip() else None

            if not student_id:
                continue

            await _upsert_roster_student(session_id, student_id, name, email)

            if photo_url:
                data_url = await asyncio.to_thread(_fetch_photo_as_data_url, photo_url)
                if data_url:
                    await db.students.update_one(
                        {"session_id": session_id, "student_id": student_id},
                        {"$set": {"reference_photo": data_url}},
                    )
                else:
                    errors.append({"row": i, "error": f"Could not fetch photo_url for {student_id}"})

            added.append(student_id)
        except Exception as exc:  # noqa: BLE001 — surface per-row errors, don't abort the batch
            errors.append({"row": i, "error": str(exc)})

    if added:
        await db.exams.update_one(
            {"session_id": session_id},
            {"$addToSet": {"enrolled_students": {"$each": added}}},
        )

    return {"added": added, "count": len(added), "errors": errors}


@router.post("/exams/{session_id}/roster/{student_id}/photo", response_model=RosterEntry)
async def upload_reference_photo(session_id: str, student_id: str, body: PhotoUpload, user=Depends(get_instructor)):
    await _get_owned_exam(session_id, user)

    result = await db.students.update_one(
        {"session_id": session_id, "student_id": student_id},
        {"$set": {"reference_photo": body.photo}},
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Student not found on this roster")

    s = await db.students.find_one({"session_id": session_id, "student_id": student_id})
    return _roster_entry(s)


@router.post("/exams/{session_id}/roster/{student_id}/identity", response_model=RosterEntry)
async def decide_identity(session_id: str, student_id: str, body: IdentityDecision, user=Depends(get_instructor)):
    """Instructor decision on a student's captured identity photo. Reversible — an
    instructor can move a student between pending/approved/denied at any time, e.g.
    to correct a mistaken decision or to let a denied student retake their photo
    (set back to "pending" after clearing id_capture_photo isn't required; the
    student's next capture via /attempt/id-photo will reset status to "pending"
    on its own, but an instructor can also just re-approve directly)."""
    await _get_owned_exam(session_id, user)

    # A denial reason is only meaningful while denied — clear it on any other decision
    # so a stale reason from a past denial doesn't linger after the student is approved.
    reason = body.reason if body.status == "denied" else None

    result = await db.students.update_one(
        {"session_id": session_id, "student_id": student_id},
        {"$set": {"identity_status": body.status, "identity_reason": reason}},
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Student not found on this roster")

    s = await db.students.find_one({"session_id": session_id, "student_id": student_id})
    return _roster_entry(s)


@router.delete("/exams/{session_id}/roster/{student_id}")
async def remove_roster_student(session_id: str, student_id: str, user=Depends(get_instructor)):
    await _get_owned_exam(session_id, user)

    await db.students.delete_one({"session_id": session_id, "student_id": student_id})
    await db.flags.delete_many({"session_id": session_id, "student_id": student_id})
    await db.exams.update_one(
        {"session_id": session_id},
        {"$pull": {"enrolled_students": student_id}},
    )
    return {"status": "removed"}


@router.get("/exams/{session_id}/attempt")
async def get_attempt(session_id: str, student_id: str, _user=Depends(get_student)):
    exam = await db.exams.find_one({"session_id": session_id})
    if not exam:
        raise HTTPException(status_code=404, detail="Exam not found")

    student = await db.students.find_one({"session_id": session_id, "student_id": student_id})
    if not student:
        raise HTTPException(status_code=404, detail="You are not enrolled in this exam")

    return {
        "exam": {
            "title": exam["title"],
            "section": exam["section"],
            "duration_minutes": exam["duration_minutes"],
            "timer_mode": exam.get("timer_mode", "synchronized"),
            "questions": exam.get("questions", []),
            "started_at": exam.get("started_at"),
        },
        "attempt_status": student.get("attempt_status", "not_started"),
        "started_at": student.get("started_at"),
        "submitted_at": student.get("submitted_at"),
        "answers": student.get("answers", {}),
        "reference_photo": student.get("reference_photo"),
        "id_capture_photo": student.get("id_capture_photo"),
        "identity_status": student.get("identity_status", "none"),
        "identity_reason": student.get("identity_reason"),
    }


@router.post("/exams/{session_id}/attempt/start")
async def start_attempt(session_id: str, body: AttemptStudentRequest, _user=Depends(get_student)):
    student = await db.students.find_one({"session_id": session_id, "student_id": body.student_id})
    if not student:
        raise HTTPException(status_code=404, detail="Student not enrolled in this exam")
    await _require_identity_approved(session_id, body.student_id)

    if not student.get("started_at"):
        # MongoDB stores datetimes at millisecond precision, but datetime.now() carries
        # microseconds — round here so the timestamp we return on this call is byte-for-byte
        # identical to what a later read of the same field will return (idempotency check).
        now = _mongo_precision_now()
        await db.students.update_one(
            {"session_id": session_id, "student_id": body.student_id},
            {"$set": {"started_at": now, "attempt_status": "in_progress"}},
        )
        return {"started_at": now.isoformat()}

    return {"started_at": student["started_at"].isoformat() if student["started_at"] else None}


@router.post("/exams/{session_id}/attempt/id-photo")
async def submit_id_photo(session_id: str, body: IdPhotoSubmit, _user=Depends(get_student)):
    # Every fresh capture (first time, or a retake after a denial) re-enters the
    # instructor's review queue as "pending" and clears any earlier denial reason.
    result = await db.students.update_one(
        {"session_id": session_id, "student_id": body.student_id},
        {"$set": {"id_capture_photo": body.photo, "identity_status": "pending", "identity_reason": None}},
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Student not enrolled in this exam")
    return {"status": "saved"}


@router.post("/exams/{session_id}/attempt/answers")
async def save_answer(session_id: str, body: AnswerSubmit, _user=Depends(get_student)):
    await _require_identity_approved(session_id, body.student_id)
    await db.students.update_one(
        {"session_id": session_id, "student_id": body.student_id},
        {"$set": {f"answers.{body.question_id}": body.text}},
    )
    return {"status": "saved"}


@router.post("/exams/{session_id}/attempt/submit")
async def submit_attempt(session_id: str, body: AttemptStudentRequest, _user=Depends(get_student)):
    await _require_identity_approved(session_id, body.student_id)
    now = _mongo_precision_now()
    await db.students.update_one(
        {"session_id": session_id, "student_id": body.student_id},
        {"$set": {"submitted_at": now, "attempt_status": "submitted"}},
    )
    return {"submitted_at": now.isoformat()}
