from pydantic import BaseModel, Field
from pydantic.json_schema import SkipJsonSchema


class MediaRecordingsSummaryQueryParams(BaseModel):
    timezone: str = "UTC"
    cameras: str | None = "all"


class MediaRecordingsAvailabilityQueryParams(BaseModel):
    cameras: str = "all"
    before: float | SkipJsonSchema[None] = None
    after: float | SkipJsonSchema[None] = None
    scale: int = Field(default=30, ge=1)


class RecordingsDeleteQueryParams(BaseModel):
    keep: str | None = None
    cameras: str | None = "all"
