from enum import Enum
from typing import Optional, Union

from pydantic import Field, field_validator

from frigate.const import MAX_PRE_CAPTURE
from frigate.review.types import SeverityEnum
from frigate.util.size import parse_size_to_mb

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


class RecordRetainConfig(FrigateBaseModel):
    days: float = Field(default=0, ge=0, title="Default retention period.")


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
    max_size: Union[float, str] = Field(
        default=0,
        title="Maximum size of recordings in MB or string format (e.g. 10GB).",
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

    @field_validator("max_size", mode="before")
    @classmethod
    def parse_max_size(cls, v: Union[float, str], info: object) -> float:
        if isinstance(v, str):
            try:
                return parse_size_to_mb(v)
            except ValueError:
                raise ValueError(f"Invalid size string: {v}")
        return v

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
