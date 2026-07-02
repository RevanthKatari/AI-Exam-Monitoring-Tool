from datetime import datetime, timezone

from fastapi import APIRouter, Depends

from app.core.security import get_instructor
from app.db.mongo import db
from app.models.flag import FlagCreate

router = APIRouter()


@router.post("/flags")
async def create_flag(body: FlagCreate, _user=Depends(get_instructor)):
    doc = body.model_dump()
    if doc.get("timestamp") is None:
        doc["timestamp"] = int(datetime.now(timezone.utc).timestamp() * 1000)
    await db.flags.insert_one(doc)
    return {"status": "created", "flag": doc}
