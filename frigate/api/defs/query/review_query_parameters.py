from typing import Union

from pydantic import BaseModel
from pydantic.json_schema import SkipJsonSchema

from frigate.review.types import SeverityEnum


class ReviewQueryParams(BaseModel):
    cameras: str = "all"
    labels: str = "all"
    zones: str = "all"
    reviewed: Union[int, SkipJsonSchema[None]] = None
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
