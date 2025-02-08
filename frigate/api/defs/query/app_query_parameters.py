from typing import Optional

from pydantic import BaseModel


class AppTimelineHourlyQueryParameters(BaseModel):
    cameras: Optional[str] = "all"
    labels: Optional[str] = "all"
    after: Optional[float] = None
    before: Optional[float] = None
    limit: Optional[int] = 200
    timezone: Optional[str] = "utc"
