from fastapi import APIRouter, Depends, HTTPException

from app.core.security import create_access_token, get_instructor, hash_password, verify_password
from app.db.mongo import db
from app.models.user import PendingInstructor, TokenResponse, UserLogin, UserRegister

router = APIRouter()


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
    else:
        account_status = "approved"

    await db.users.insert_one({
        "name": body.name,
        "email": body.email,
        "password_hash": hash_password(body.password),
        "role": body.role,
        "status": account_status,
    })

    if account_status == "pending":
        return TokenResponse(
            status="pending",
            role=body.role,
            message="Registration submitted. An administrator must approve your account before you can sign in.",
        )

    token = create_access_token(body.email, body.role)
    return TokenResponse(status="approved", access_token=token, role=body.role, student_id=None)


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
