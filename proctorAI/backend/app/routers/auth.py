from fastapi import APIRouter, Depends, HTTPException
from pymongo import ReturnDocument

from app.core.security import create_access_token, get_instructor, hash_password, verify_password
from app.db.mongo import db
from app.models.user import PendingInstructor, TokenResponse, UserLogin, UserRegister

router = APIRouter()

# Self-registered students previously got no student_id at all, and the frontend
# silently fell back to a hardcoded demo student's ID — meaning every new student
# who registered was actually logged in AS that other (seeded) student. Generate a
# real, unique student_id atomically so each registrant gets their own identity.
STUDENT_ID_RANGE_START = 900000000


async def _next_student_id() -> str:
    counter = await db.counters.find_one_and_update(
        {"_id": "student_id"},
        {"$inc": {"seq": 1}},
        upsert=True,
        return_document=ReturnDocument.AFTER,
    )
    return str(STUDENT_ID_RANGE_START + counter["seq"])


@router.post("/register", response_model=TokenResponse)
async def register(body: UserRegister):
    if body.role not in ("student", "instructor"):
        raise HTTPException(status_code=400, detail="Role must be student or instructor")

    existing = await db.users.find_one({"email": body.email})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")

    if body.role == "instructor":
        approved_instructors = await db.users.count_documents(
            {"role": "instructor", "status": "approved"}
        )
        account_status = "approved" if approved_instructors == 0 else "pending"
        student_id = None
    else:
        account_status = "approved"
        provided_id = (body.student_id or "").strip()
        if provided_id:
            id_taken = await db.users.find_one({"student_id": provided_id, "role": "student"})
            if id_taken:
                raise HTTPException(
                    status_code=400,
                    detail=f"Student ID {provided_id} is already registered to another account",
                )
            student_id = provided_id
        else:
            student_id = await _next_student_id()

    await db.users.insert_one({
        "name": body.name,
        "email": body.email,
        "password_hash": hash_password(body.password),
        "role": body.role,
        "status": account_status,
        "student_id": student_id,
    })

    if body.role == "student":
        # If an instructor already put this student_id on a roster (with a
        # placeholder name/email), sync in the real identity now that they've
        # registered, so the dashboard doesn't keep showing a placeholder.
        await db.students.update_many(
            {"student_id": student_id},
            {"$set": {"name": body.name, "email": body.email}},
        )

    if account_status == "pending":
        return TokenResponse(
            status="pending",
            role=body.role,
            message="Registration submitted. An administrator must approve your account before you can sign in.",
        )

    token = create_access_token(body.email, body.role)
    return TokenResponse(status="approved", access_token=token, role=body.role, student_id=student_id)


@router.post("/login", response_model=TokenResponse)
async def login(body: UserLogin):
    user = await db.users.find_one({"email": body.email})
    if not user or not verify_password(body.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid credentials")

    if user["role"] == "instructor" and user.get("status", "approved") != "approved":
        raise HTTPException(
            status_code=403,
            detail="Your account is pending approval from an administrator.",
        )

    token = create_access_token(user["email"], user["role"])
    return TokenResponse(
        status="approved",
        access_token=token,
        role=user["role"],
        student_id=user.get("student_id"),
    )


@router.get("/pending", response_model=list[PendingInstructor])
async def list_pending_instructors(_user=Depends(get_instructor)):
    users = await db.users.find({"role": "instructor", "status": "pending"}).to_list(length=None)
    return [PendingInstructor(id=str(u["_id"]), name=u["name"], email=u["email"]) for u in users]


@router.post("/approve/{user_id}")
async def approve_instructor(user_id: str, _user=Depends(get_instructor)):
    from bson import ObjectId

    result = await db.users.update_one(
        {"_id": ObjectId(user_id), "role": "instructor"},
        {"$set": {"status": "approved"}},
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Pending instructor not found")
    return {"status": "approved"}


@router.post("/reject/{user_id}")
async def reject_instructor(user_id: str, _user=Depends(get_instructor)):
    from bson import ObjectId

    result = await db.users.delete_one(
        {"_id": ObjectId(user_id), "role": "instructor", "status": "pending"}
    )
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Pending instructor not found")
    return {"status": "rejected"}
