from datetime import datetime, timedelta
from typing import Optional

from pydantic import BaseModel


class ReviewQueryParams(BaseModel):
    cameras: Optional[str] = "all"
    labels: Optional[str] = "all"
    zones: Optional[str] = "all"
    reviewed: Optional[int] = 0
    limit: Optional[int] = None
    severity: Optional[str] = None
    before: Optional[float] = datetime.now().timestamp()
    after: Optional[float] = (datetime.now() - timedelta(hours=24)).timestamp()


class ReviewSummaryQueryParams(BaseModel):
    cameras: Optional[str] = "all"
    labels: Optional[str] = "all"
    zones: Optional[str] = "all"
    timezone: Optional[str] = "utc"
    day_ago: Optional[int] = (datetime.now() - timedelta(hours=24)).timestamp()
    month_ago: Optional[int] = (datetime.now() - timedelta(days=30)).timestamp()


class ReviewActivityMotionQueryParams(BaseModel):
    cameras: Optional[str] = "all"
    before: Optional[float] = datetime.now().timestamp()
    after: Optional[float] = (datetime.now() - timedelta(hours=1)).timestamp()
    scale: Optional[int] = 30
