from pydantic import BaseModel, ConfigDict


class FlagCreate(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    session_id: str
    student_id: str
    type: str
    flag_type: str
    title: str
    confidence: int
    description: str | None = None
    duration: str | None = None
    timestamp: int | None = None
