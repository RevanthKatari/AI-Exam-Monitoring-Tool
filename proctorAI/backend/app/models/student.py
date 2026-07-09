from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class FlagResponse(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    type: str
    icon: str
    title: str
    time: str
    confidence: int | None = None
    duration: str | None = None
    description: str | None = None


class TimelineEvent(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    t: float
    type: str


class StudentResponse(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    id: str
    name: str
    email: str
    score: int
    status: str
    attempt_status: str = "not_started"
    started_at: datetime | None = None
    submitted_at: datetime | None = None
    reference_photo: str | None = None
    id_capture_photo: str | None = None
    flags: list[FlagResponse]
    timeline: list[TimelineEvent]
    gazeData: list[int] = Field(default_factory=list)
    audioData: list[int] = Field(default_factory=list)


class AnswerSubmit(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    student_id: str
    question_id: str
    text: str


class AttemptStudentRequest(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    student_id: str


class IdPhotoSubmit(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    student_id: str
    photo: str  # base64 data URL
