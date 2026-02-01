from typing import Optional

from pydantic import BaseModel, Field

DEFAULT_TIME_RANGE = "00:00,24:00"


class EventsQueryParams(BaseModel):
    camera: Optional[str] = "all"
    cameras: Optional[str] = "all"
    label: Optional[str] = "all"
    labels: Optional[str] = "all"
    sub_label: Optional[str] = "all"
    sub_labels: Optional[str] = "all"
    attributes: Optional[str] = "all"
    zone: Optional[str] = "all"
    zones: Optional[str] = "all"
    limit: Optional[int] = 100
    after: Optional[float] = None
    before: Optional[float] = None
    time_range: Optional[str] = DEFAULT_TIME_RANGE
    has_clip: Optional[int] = None
    has_snapshot: Optional[int] = None
    in_progress: Optional[int] = None
    include_thumbnails: Optional[int] = Field(
        1,
        description=(
            "Deprecated. Thumbnail data is no longer included in the response. "
            "Use the /api/events/:event_id/thumbnail.:extension endpoint instead."
        ),
        deprecated=True,
    )
    favorites: Optional[int] = None
    min_score: Optional[float] = None
    max_score: Optional[float] = None
    min_speed: Optional[float] = None
    max_speed: Optional[float] = None
    recognized_license_plate: Optional[str] = "all"
    is_submitted: Optional[int] = None
    min_length: Optional[float] = None
    max_length: Optional[float] = None
    event_id: Optional[str] = None
    sort: Optional[str] = None
    timezone: Optional[str] = "utc"


class EventsSearchQueryParams(BaseModel):
    query: Optional[str] = None
    event_id: Optional[str] = None
    search_type: Optional[str] = "thumbnail"
    include_thumbnails: Optional[int] = Field(
        1,
        description=(
            "Deprecated. Thumbnail data is no longer included in the response. "
            "Use the /api/events/:event_id/thumbnail.:extension endpoint instead."
        ),
        deprecated=True,
    )
    limit: Optional[int] = 50
    cameras: Optional[str] = "all"
    labels: Optional[str] = "all"
    sub_labels: Optional[str] = "all"
    attributes: Optional[str] = "all"
    zones: Optional[str] = "all"
    after: Optional[float] = None
    before: Optional[float] = None
    time_range: Optional[str] = DEFAULT_TIME_RANGE
    has_clip: Optional[bool] = None
    has_snapshot: Optional[bool] = None
    is_submitted: Optional[bool] = None
    timezone: Optional[str] = "utc"
    min_score: Optional[float] = None
    max_score: Optional[float] = None
    min_speed: Optional[float] = None
    max_speed: Optional[float] = None
    recognized_license_plate: Optional[str] = "all"
    sort: Optional[str] = None


class EventsSummaryQueryParams(BaseModel):
    timezone: Optional[str] = "utc"
    has_clip: Optional[int] = None
    has_snapshot: Optional[int] = None
