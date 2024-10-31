from enum import Enum
from typing import Optional

from pydantic import Field

from frigate.const import MAX_PRE_CAPTURE

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


class RetainModeEnum(str, Enum):
    all = "all"
    motion = "motion"
    active_objects = "active_objects"


class RecordRetainConfig(FrigateBaseModel):
    days: float = Field(default=0, title="Default retention period.")
    mode: RetainModeEnum = Field(default=RetainModeEnum.all, title="Retain mode.")


class ReviewRetainConfig(FrigateBaseModel):
    days: float = Field(default=10, title="Default retention period.")
    mode: RetainModeEnum = Field(default=RetainModeEnum.motion, title="Retain mode.")


class EventsConfig(FrigateBaseModel):
    pre_capture: int = Field(
        default=5, title="Seconds to retain before event starts.", le=MAX_PRE_CAPTURE
    )
    post_capture: int = Field(default=5, title="Seconds to retain after event ends.")
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
    retain: RecordRetainConfig = Field(
        default_factory=RecordRetainConfig, title="Record retention settings."
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
