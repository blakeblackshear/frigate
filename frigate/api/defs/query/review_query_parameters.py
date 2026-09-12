from pydantic import BaseModel
from pydantic.json_schema import SkipJsonSchema

from frigate.review.types import SeverityEnum


class ReviewQueryParams(BaseModel):
    cameras: str = "all"
    labels: str = "all"
    zones: str = "all"
    reviewed: int | SkipJsonSchema[None] = None
    limit: int | SkipJsonSchema[None] = None
    severity: SeverityEnum | SkipJsonSchema[None] = None
    before: float | SkipJsonSchema[None] = None
    after: float | SkipJsonSchema[None] = None


class ReviewSummaryQueryParams(BaseModel):
    cameras: str = "all"
    labels: str = "all"
    zones: str = "all"
    timezone: str = "utc"


class ReviewActivityMotionQueryParams(BaseModel):
    cameras: str = "all"
    before: float | SkipJsonSchema[None] = None
    after: float | SkipJsonSchema[None] = None
    scale: int = 30
