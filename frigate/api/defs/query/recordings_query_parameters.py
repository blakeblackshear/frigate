from typing import Optional, Union

from pydantic import BaseModel
from pydantic.json_schema import SkipJsonSchema


class MediaRecordingsSummaryQueryParams(BaseModel):
    timezone: str = "utc"
    cameras: Optional[str] = "all"


class MediaRecordingsAvailabilityQueryParams(BaseModel):
    cameras: str = "all"
    before: Union[float, SkipJsonSchema[None]] = None
    after: Union[float, SkipJsonSchema[None]] = None
    scale: int = 30


class RecordingsDeleteQueryParams(BaseModel):
    keep: Optional[str] = None
    cameras: Optional[str] = "all"
