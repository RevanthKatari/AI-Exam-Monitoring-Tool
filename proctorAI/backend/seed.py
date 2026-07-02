"""Seed demo data into MongoDB for professor demo."""

import asyncio
from datetime import datetime, timezone

from motor.motor_asyncio import AsyncIOMotorClient

from app.core.config import settings
from app.core.security import hash_password

STUDENTS = [
    {"student_id": "110195067", "name": "Revanth Katari", "email": "katarir@uwindsor.ca"},
    {"student_id": "110195066", "name": "Kishore Katari", "email": "katarik@uwindsor.ca"},
    {"student_id": "110103039", "name": "Harshitha Venkata Konduru", "email": "konduruh@uwindsor.ca"},
    {"student_id": "110211374", "name": "Kavya Pagaria", "email": "pagaria@uwindsor.ca"},
]

SESSION_ID = "comp3430-a-2026"


async def seed():
    client = AsyncIOMotorClient(settings.MONGO_URI)
    db = client[settings.MONGO_DB_NAME]

    await db.users.delete_many({"email": {"$in": ["prof@test.com", "student@test.com"]}})
    await db.exams.delete_many({"session_id": SESSION_ID})
    await db.students.delete_many({"session_id": SESSION_ID})
    await db.flags.delete_many({"session_id": SESSION_ID})

    await db.users.insert_one({
        "name": "Prof Test",
        "email": "prof@test.com",
        "password_hash": hash_password("test123"),
        "role": "instructor",
        "status": "approved",
    })
    await db.users.insert_one({
        "name": "Revanth Katari",
        "email": "student@test.com",
        "password_hash": hash_password("test123"),
        "role": "student",
        "student_id": "110195067",
        "status": "approved",
    })

    await db.exams.insert_one({
        "session_id": SESSION_ID,
        "title": "COMP3430 — Data Structures Final",
        "section": "Section A",
        "instructor_id": "prof@test.com",
        "duration_minutes": 90,
        "started_at": datetime.now(timezone.utc),
        "enrolled_students": [s["student_id"] for s in STUDENTS],
    })

    for s in STUDENTS:
        await db.students.insert_one({
            **s,
            "session_id": SESSION_ID,
            "integrity_score": 100,
            "gazeData": [],
            "audioData": [],
            "joined_at": datetime.now(timezone.utc),
        })

    print(f"Seeded exam '{SESSION_ID}' with {len(STUDENTS)} students")
    print("Instructor: prof@test.com / test123")
    print("Student:    student@test.com / test123")
    client.close()


if __name__ == "__main__":
    asyncio.run(seed())
