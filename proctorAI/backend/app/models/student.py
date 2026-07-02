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
    flags: list[FlagResponse]
    timeline: list[TimelineEvent]
    gazeData: list[int] = Field(default_factory=list)
    audioData: list[int] = Field(default_factory=list)
