import asyncio
import base64
import json
import logging

import cv2
import numpy as np
from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from jose import JWTError, jwt

from app.ai.audio import check_audio
from app.ai.gaze import analyse_gaze, gaze_stability_score
from app.ai.objects import detect_objects
from app.ai.scorer import update_score
from app.core.config import settings
from app.db.mongo import db

router = APIRouter()
logger = logging.getLogger("uvicorn.error")

MAX_TELEMETRY_POINTS = 120


async def _append_telemetry(session_id: str, student_id: str, gaze: int | None, audio: int | None):
    update: dict = {}
    if gaze is not None:
        update["$push"] = {"gazeData": {"$each": [gaze], "$slice": -MAX_TELEMETRY_POINTS}}
    if audio is not None:
        key = "audioData"
        if "$push" in update:
            update["$push"][key] = {"$each": [audio], "$slice": -MAX_TELEMETRY_POINTS}
        else:
            update["$push"] = {key: {"$each": [audio], "$slice": -MAX_TELEMETRY_POINTS}}

    if update:
        await db.students.update_one(
            {"session_id": session_id, "student_id": student_id},
            update,
            upsert=True,
        )


async def _ensure_student(session_id: str, student_id: str):
    existing = await db.students.find_one({"session_id": session_id, "student_id": student_id})
    if existing:
        return

    user = await db.users.find_one({"email": {"$regex": student_id, "$options": "i"}})
    name = user["name"] if user else f"Student {student_id}"
    email = user["email"] if user else f"{student_id}@uwindsor.ca"

    await db.students.insert_one({
        "student_id": student_id,
        "session_id": session_id,
        "name": name,
        "email": email,
        "integrity_score": 100,
        "gazeData": [],
        "audioData": [],
        "attempt_status": "in_progress",
        "started_at": None,
        "submitted_at": None,
        "answers": {},
    })


@router.websocket("/ws/{session_id}/{student_id}")
async def websocket_endpoint(ws: WebSocket, session_id: str, student_id: str):
    token = ws.query_params.get("token")
    if not token:
        await ws.close(code=4401, reason="Missing auth token")
        return
    try:
        payload = jwt.decode(token, settings.JWT_SECRET_KEY, algorithms=[settings.JWT_ALGORITHM])
    except JWTError:
        await ws.close(code=4401, reason="Invalid or expired token")
        return
    if payload.get("role") != "student":
        await ws.close(code=4403, reason="Student access required")
        return

    await ws.accept()
    await _ensure_student(session_id, student_id)
    queue: asyncio.Queue = asyncio.Queue()

    async def receiver():
        try:
            while True:
                raw = await ws.receive_text()
                payload = json.loads(raw)
                await queue.put(payload)
        except WebSocketDisconnect:
            await queue.put(None)

    async def processor():
        while True:
            payload = await queue.get()
            if payload is None:
                break

            ptype = payload.get("type")

            if ptype == "frame":
                try:
                    img_data = base64.b64decode(payload["data"].split(",")[1])
                    nparr = np.frombuffer(img_data, np.uint8)
                    frame = cv2.imdecode(nparr, cv2.IMREAD_COLOR)

                    if frame is None:
                        continue

                    gaze_flag = await asyncio.to_thread(analyse_gaze, frame)
                    object_flags = await asyncio.to_thread(detect_objects, frame)
                    gaze_score = await asyncio.to_thread(gaze_stability_score, frame)
                    await _append_telemetry(session_id, student_id, gaze_score, None)

                    for flag in [gaze_flag] + object_flags:
                        if flag:
                            flag["session_id"] = session_id
                            flag["student_id"] = student_id
                            flag["timestamp"] = payload["timestamp"]
                            await db.flags.insert_one(flag)
                            await update_score(session_id, student_id)
                except Exception:
                    logger.exception(
                        "Frame processing error for session=%s student=%s", session_id, student_id
                    )

            elif ptype == "audio":
                db_level = payload.get("db", 0)
                await _append_telemetry(session_id, student_id, None, db_level)

                audio_flag = check_audio(db_level)
                if audio_flag:
                    audio_flag.update({
                        "session_id": session_id,
                        "student_id": student_id,
                        "timestamp": payload["timestamp"],
                    })
                    await db.flags.insert_one(audio_flag)
                    await update_score(session_id, student_id)

            elif ptype in ("tab_switch", "window_blur"):
                flag = {
                    "type": "warning",
                    "flag_type": ptype,
                    "title": (
                        "Tab switch detected" if ptype == "tab_switch"
                        else "Window blur detected"
                    ),
                    "confidence": 100,
                    "session_id": session_id,
                    "student_id": student_id,
                    "timestamp": payload["timestamp"],
                    "description": (
                        "Page Visibility API reported document hidden."
                        if ptype == "tab_switch"
                        else "Browser window lost focus."
                    ),
                }
                await db.flags.insert_one(flag)
                await update_score(session_id, student_id)

    await asyncio.gather(receiver(), processor())
