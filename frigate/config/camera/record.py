import re
from enum import Enum
from typing import Optional

from pydantic import Field, field_validator

from frigate.const import MAX_PRE_CAPTURE
from frigate.review.types import SeverityEnum

from ..base import FrigateBaseModel

__all__ = [
    "RecordConfig",
    "RecordExportConfig",
    "RecordPreviewConfig",
    "RecordQualityEnum",
    "EventsConfig",
    "ReviewRetainConfig",
    "RecordRetainConfig",
    "RetainModeEnum",
]

DEFAULT_TIME_LAPSE_FFMPEG_ARGS = "-vf setpts=0.04*PTS -r 30"

WEEKDAY_MAP = {
    "mon": 0,
    "monday": 0,
    "tue": 1,
    "tuesday": 1,
    "wed": 2,
    "wednesday": 2,
    "thu": 3,
    "thursday": 3,
    "fri": 4,
    "friday": 4,
    "sat": 5,
    "saturday": 5,
    "sun": 6,
    "sunday": 6,
}

TIME_WINDOW_PATTERN = re.compile(
    r"^(?:([a-z]+)(?:-([a-z]+))?\s+)?(\d{2}):(\d{2})-(\d{2}):(\d{2})$", re.IGNORECASE
)


def _parse_time_window(entry: str) -> dict:
    """Parse time window string into components."""
    match = TIME_WINDOW_PATTERN.match(entry.strip())
    if not match:
        raise ValueError(
            f"Invalid time window format: '{entry}'. "
            "Use 'HH:MM-HH:MM' or 'mon-fri HH:MM-HH:MM'"
        )

    day_start, day_end, start_h, start_m, end_h, end_m = match.groups()

    weekdays = None
    if day_start:
        start_day = day_start.lower()
        if start_day not in WEEKDAY_MAP:
            raise ValueError(f"Invalid weekday: '{day_start}'")
        start_num = WEEKDAY_MAP[start_day]

        if day_end:
            end_day = day_end.lower()
            if end_day not in WEEKDAY_MAP:
                raise ValueError(f"Invalid weekday: '{day_end}'")
            end_num = WEEKDAY_MAP[end_day]
            if start_num <= end_num:
                weekdays = list(range(start_num, end_num + 1))
            else:
                weekdays = list(range(start_num, 7)) + list(range(0, end_num + 1))
        else:
            weekdays = [start_num]

    return {
        "weekdays": weekdays,
        "start": int(start_h) * 60 + int(start_m),
        "end": int(end_h) * 60 + int(end_m),
    }


def _matches_time_window(
    windows: list[dict], weekday: int, hour: int, minute: int
) -> bool:
    """Check if given time falls within any time window."""
    time_val = hour * 60 + minute
    for window in windows:
        if window["weekdays"] is not None and weekday not in window["weekdays"]:
            continue
        start, end = window["start"], window["end"]
        if start <= end:
            if start <= time_val <= end:
                return True
        else:
            # overnight range like 22:00-06:00
            if time_val >= start or time_val <= end:
                return True
    return False


class RecordRetainConfig(FrigateBaseModel):
    days: Optional[float] = Field(
        default=None,
        ge=0,
        title="Maximum retention period in days. None for unlimited, 0 for no retention.",
    )
    hours: Optional[list[str]] = Field(
        default=None,
        title="Time windows to retain recordings. Outside these windows, recordings are deleted after always_retain period.",
    )
    always_retain: float = Field(
        default=24,
        ge=0,
        title="Hours to keep all recordings before applying time window filter.",
    )

    @field_validator("hours", mode="before")
    @classmethod
    def validate_hours(cls, v):
        if v is None:
            return None
        if not isinstance(v, list):
            raise ValueError("hours must be a list")
        for entry in v:
            _parse_time_window(entry)
        return v

    def is_in_retention_window(self, weekday: int, hour: int, minute: int = 0) -> bool:
        """Check if recordings at this time should be retained."""
        if not self.hours:
            return True
        windows = [_parse_time_window(s) for s in self.hours]
        return _matches_time_window(windows, weekday, hour, minute)


class RetainModeEnum(str, Enum):
    all = "all"
    motion = "motion"
    active_objects = "active_objects"


class ReviewRetainConfig(FrigateBaseModel):
    days: float = Field(default=10, ge=0, title="Default retention period.")
    mode: RetainModeEnum = Field(default=RetainModeEnum.motion, title="Retain mode.")


class EventsConfig(FrigateBaseModel):
    pre_capture: int = Field(
        default=5,
        title="Seconds to retain before event starts.",
        le=MAX_PRE_CAPTURE,
        ge=0,
    )
    post_capture: int = Field(
        default=5, ge=0, title="Seconds to retain after event ends."
    )
    retain: ReviewRetainConfig = Field(
        default_factory=ReviewRetainConfig, title="Event retention settings."
    )


class RecordQualityEnum(str, Enum):
    very_low = "very_low"
    low = "low"
    medium = "medium"
    high = "high"
    very_high = "very_high"


class RecordPreviewConfig(FrigateBaseModel):
    quality: RecordQualityEnum = Field(
        default=RecordQualityEnum.medium, title="Quality of recording preview."
    )


class RecordExportConfig(FrigateBaseModel):
    timelapse_args: str = Field(
        default=DEFAULT_TIME_LAPSE_FFMPEG_ARGS, title="Timelapse Args"
    )


class RecordConfig(FrigateBaseModel):
    enabled: bool = Field(default=False, title="Enable record on all cameras.")
    sync_recordings: bool = Field(
        default=False, title="Sync recordings with disk on startup and once a day."
    )
    expire_interval: int = Field(
        default=60,
        title="Number of minutes to wait between cleanup runs.",
    )
    continuous: RecordRetainConfig = Field(
        default_factory=RecordRetainConfig,
        title="Continuous recording retention settings.",
    )
    motion: RecordRetainConfig = Field(
        default_factory=RecordRetainConfig, title="Motion recording retention settings."
    )
    detections: EventsConfig = Field(
        default_factory=EventsConfig, title="Detection specific retention settings."
    )
    alerts: EventsConfig = Field(
        default_factory=EventsConfig, title="Alert specific retention settings."
    )
    export: RecordExportConfig = Field(
        default_factory=RecordExportConfig, title="Recording Export Config"
    )
    preview: RecordPreviewConfig = Field(
        default_factory=RecordPreviewConfig, title="Recording Preview Config"
    )
    enabled_in_config: Optional[bool] = Field(
        default=None, title="Keep track of original state of recording."
    )

    @property
    def event_pre_capture(self) -> int:
        return max(
            self.alerts.pre_capture,
            self.detections.pre_capture,
        )

    def get_review_pre_capture(self, severity: SeverityEnum) -> int:
        if severity == SeverityEnum.alert:
            return self.alerts.pre_capture
        else:
            return self.detections.pre_capture

    def get_review_post_capture(self, severity: SeverityEnum) -> int:
        if severity == SeverityEnum.alert:
            return self.alerts.post_capture
        else:
            return self.detections.post_capture
