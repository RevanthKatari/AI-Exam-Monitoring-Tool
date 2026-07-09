from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field

TimerMode = Literal["synchronized", "individual"]


class Question(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    id: str
    prompt: str


class ExamCreate(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    session_id: str
    title: str
    section: str
    duration_minutes: int = 90
    timer_mode: TimerMode = "synchronized"
    questions: list[Question] = Field(default_factory=list)
    enrolled_students: list[str] = Field(default_factory=list)


class ExamUpdate(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    title: str | None = None
    section: str | None = None
    duration_minutes: int | None = None
    timer_mode: TimerMode | None = None
    questions: list[Question] | None = None


class ExamResponse(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    session_id: str
    title: str
    section: str
    instructor_id: str
    duration_minutes: int
    timer_mode: TimerMode = "synchronized"
    questions: list[Question] = Field(default_factory=list)
    created_at: datetime
    started_at: datetime | None = None
    enrolled_students: list[str]


class RosterAdd(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    student_id: str
    name: str | None = None
    email: str | None = None


class RosterUpdate(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    name: str | None = None
    email: str | None = None
    reference_photo: str | None = None  # base64 data URL; omit to leave unchanged


class RosterEntry(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    student_id: str
    name: str
    email: str
    attempt_status: str = "not_started"
    score: int = 100
    reference_photo: str | None = None
    id_capture_photo: str | None = None
    identity_status: str = "none"  # "none" | "pending" | "approved" | "denied"
    identity_reason: str | None = None


class PhotoUpload(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    photo: str  # base64 data URL (e.g. "data:image/jpeg;base64,...")


class IdentityDecision(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    status: Literal["pending", "approved", "denied"]
    reason: str | None = None  # optional, shown to the student when status is "denied"
