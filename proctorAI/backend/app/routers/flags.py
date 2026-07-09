from datetime import datetime, timezone

from fastapi import APIRouter, Depends

from app.ai.scorer import update_score
from app.core.security import get_instructor
from app.db.mongo import db
from app.models.flag import FlagCreate
from app.services.formatting import format_flag

router = APIRouter()


@router.post("/flags")
async def create_flag(body: FlagCreate, _user=Depends(get_instructor)):
    doc = body.model_dump()
    if doc.get("timestamp") is None:
        doc["timestamp"] = int(datetime.now(timezone.utc).timestamp() * 1000)
    # insert_one mutates doc in place, injecting a non-JSON-serializable ObjectId
    # under "_id" — strip it before echoing the doc back in the response.
    await db.flags.insert_one(doc)
    doc.pop("_id", None)
    # Manually-created flags (e.g. instructor "Escalate to supervisor") must affect
    # the integrity score the same way WebSocket-detected flags do — this was
    # previously only wired up in the WebSocket handler, so escalating a student
    # never actually moved their score.
    await update_score(doc["session_id"], doc["student_id"])
    return {"status": "created", "flag": doc}


@router.get("/flags")
async def list_flags(session_id: str, student_id: str | None = None, _user=Depends(get_instructor)):
    query: dict = {"session_id": session_id}
    if student_id:
        query["student_id"] = student_id

    flags = await db.flags.find(query).sort("timestamp", 1).to_list(length=None)
    return [
        {**format_flag(f), "student_id": f.get("student_id"), "flag_type": f.get("flag_type")}
        for f in flags
    ]
