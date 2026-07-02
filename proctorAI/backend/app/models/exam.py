from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class ExamCreate(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    session_id: str
    title: str
    section: str
    duration_minutes: int = 90
    enrolled_students: list[str] = Field(default_factory=list)


class ExamResponse(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    session_id: str
    title: str
    section: str
    instructor_id: str
    duration_minutes: int
    started_at: datetime
    enrolled_students: list[str]
