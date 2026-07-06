from pydantic import BaseModel


class AppTimelineHourlyQueryParameters(BaseModel):
    cameras: str | None = "all"
    labels: str | None = "all"
    after: float | None = None
    before: float | None = None
    limit: int | None = 200
    timezone: str | None = "utc"
