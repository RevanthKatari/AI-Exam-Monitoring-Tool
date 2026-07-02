from pydantic import BaseModel, ConfigDict, EmailStr


class UserRegister(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    name: str
    email: EmailStr
    password: str
    role: str  # "student" | "instructor"


class UserLogin(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    email: EmailStr
    password: str


class TokenResponse(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    status: str = "approved"  # "approved" | "pending"
    access_token: str | None = None
    token_type: str = "bearer"
    role: str
    student_id: str | None = None
    message: str | None = None


class PendingInstructor(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    id: str
    name: str
    email: str
