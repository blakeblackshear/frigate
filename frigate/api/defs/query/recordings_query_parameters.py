from pydantic import BaseModel, Field
from pydantic.json_schema import SkipJsonSchema


class MediaRecordingsSummaryQueryParams(BaseModel):
    timezone: str = "UTC"
    cameras: str | None = "all"


class MediaRecordingsAvailabilityQueryParams(BaseModel):
    cameras: str = "all"
    before: float | SkipJsonSchema[None] = Field(default=None, allow_inf_nan=False)
    after: float | SkipJsonSchema[None] = Field(default=None, allow_inf_nan=False)
    scale: int = Field(default=30, ge=1)


class RecordingsDeleteQueryParams(BaseModel):
    keep: str | None = None
    cameras: str | None = "all"
