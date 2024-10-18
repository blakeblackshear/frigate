from typing import Union

from pydantic import BaseModel
from pydantic.json_schema import SkipJsonSchema

from frigate.review.maintainer import SeverityEnum


class ReviewQueryParams(BaseModel):
    cameras: str = "all"
    labels: str = "all"
    zones: str = "all"
    reviewed: int = 0
    limit: Union[int, SkipJsonSchema[None]] = None
    severity: Union[SeverityEnum, SkipJsonSchema[None]] = None
    before: Union[float, SkipJsonSchema[None]] = None
    after: Union[float, SkipJsonSchema[None]] = None


class ReviewSummaryQueryParams(BaseModel):
    cameras: str = "all"
    labels: str = "all"
    zones: str = "all"
    timezone: str = "utc"


class ReviewActivityMotionQueryParams(BaseModel):
    cameras: str = "all"
    before: Union[float, SkipJsonSchema[None]] = None
    after: Union[float, SkipJsonSchema[None]] = None
    scale: int = 30
