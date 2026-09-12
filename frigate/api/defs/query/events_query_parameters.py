from pydantic import BaseModel, Field

DEFAULT_TIME_RANGE = "00:00,24:00"


class EventsQueryParams(BaseModel):
    camera: str | None = "all"
    cameras: str | None = "all"
    label: str | None = "all"
    labels: str | None = "all"
    sub_label: str | None = "all"
    sub_labels: str | None = "all"
    attributes: str | None = "all"
    zone: str | None = "all"
    zones: str | None = "all"
    limit: int | None = 100
    after: float | None = None
    before: float | None = None
    time_range: str | None = DEFAULT_TIME_RANGE
    has_clip: int | None = None
    has_snapshot: int | None = None
    in_progress: int | None = None
    include_thumbnails: int | None = Field(
        1,
        description=(
            "Deprecated. Thumbnail data is no longer included in the response. "
            "Use the /api/events/:event_id/thumbnail.:extension endpoint instead."
        ),
        deprecated=True,
    )
    favorites: int | None = None
    min_score: float | None = None
    max_score: float | None = None
    min_speed: float | None = None
    max_speed: float | None = None
    recognized_license_plate: str | None = "all"
    is_submitted: int | None = None
    min_length: float | None = None
    max_length: float | None = None
    event_id: str | None = None
    sort: str | None = None
    timezone: str | None = "utc"


class EventsSearchQueryParams(BaseModel):
    query: str | None = None
    event_id: str | None = None
    search_type: str | None = "thumbnail"
    include_thumbnails: int | None = Field(
        1,
        description=(
            "Deprecated. Thumbnail data is no longer included in the response. "
            "Use the /api/events/:event_id/thumbnail.:extension endpoint instead."
        ),
        deprecated=True,
    )
    limit: int | None = 50
    cameras: str | None = "all"
    labels: str | None = "all"
    sub_labels: str | None = "all"
    attributes: str | None = "all"
    zones: str | None = "all"
    after: float | None = None
    before: float | None = None
    time_range: str | None = DEFAULT_TIME_RANGE
    has_clip: bool | None = None
    has_snapshot: bool | None = None
    is_submitted: bool | None = None
    timezone: str | None = "utc"
    min_score: float | None = None
    max_score: float | None = None
    min_speed: float | None = None
    max_speed: float | None = None
    recognized_license_plate: str | None = "all"
    sort: str | None = None


class EventsSummaryQueryParams(BaseModel):
    timezone: str | None = "utc"
    has_clip: int | None = None
    has_snapshot: int | None = None
