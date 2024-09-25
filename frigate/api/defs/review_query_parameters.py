from typing import Optional

from pydantic import BaseModel


class ReviewQueryParams(BaseModel):
    cameras: Optional[str] = "all"
    labels: Optional[str] = "all"
    zones: Optional[str] = "all"
    reviewed: Optional[int] = 0
    limit: Optional[int] = None
    severity: Optional[str] = None
    before: Optional[float] = None
    after: Optional[float] = None


class ReviewSummaryQueryParams(BaseModel):
    cameras: Optional[str] = "all"
    labels: Optional[str] = "all"
    zones: Optional[str] = "all"
    timezone: Optional[str] = "utc"


class ReviewActivityMotionQueryParams(BaseModel):
    cameras: Optional[str] = "all"
    before: Optional[float] = None
    after: Optional[float] = None
    scale: Optional[int] = 30
