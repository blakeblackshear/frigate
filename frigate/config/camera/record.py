from enum import Enum
from typing import Optional, Union

from pydantic import Field

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


class RecordRetainConfig(FrigateBaseModel):
    days: float = Field(
        default=0,
        ge=0,
        title="Default retention period",
        description="Days to retain recordings.",
    )


class RetainModeEnum(str, Enum):
    all = "all"
    motion = "motion"
    active_objects = "active_objects"


class ReviewRetainConfig(FrigateBaseModel):
    days: float = Field(
        default=10,
        ge=0,
        title="Default retention period",
        description="Number of days to retain recordings of detection events.",
    )
    mode: RetainModeEnum = Field(
        default=RetainModeEnum.motion,
        title="Retain mode",
        description="Mode for retention: all (save all segments), motion (save segments with motion), or active_objects (save segments with active objects).",
    )


class EventsConfig(FrigateBaseModel):
    pre_capture: int = Field(
        default=5,
        title="Seconds to retain before event starts",
        description="Number of seconds before the detection event to include in the recording.",
        le=MAX_PRE_CAPTURE,
        ge=0,
    )
    post_capture: int = Field(
        default=5,
        ge=0,
        title="Seconds to retain after event ends",
        description="Number of seconds after the detection event to include in the recording.",
    )
    retain: ReviewRetainConfig = Field(
        default_factory=ReviewRetainConfig,
        title="Event retention settings",
        description="Retention settings for recordings of detection events.",
    )


class RecordQualityEnum(str, Enum):
    very_low = "very_low"
    low = "low"
    medium = "medium"
    high = "high"
    very_high = "very_high"


class RecordPreviewConfig(FrigateBaseModel):
    quality: RecordQualityEnum = Field(
        default=RecordQualityEnum.medium,
        title="Quality of recording preview",
        description="Preview quality level (very_low, low, medium, high, very_high).",
    )


class RecordExportConfig(FrigateBaseModel):
    hwaccel_args: Union[str, list[str]] = Field(
        default="auto",
        title="Export-specific FFmpeg hardware acceleration arguments",
        description="Hardware acceleration args to use for export/transcode operations.",
    )


class RecordConfig(FrigateBaseModel):
    enabled: bool = Field(
        default=False,
        title="Enable record on all cameras",
        description="Enable or disable recording globally; individual cameras can override this.",
    )
    expire_interval: int = Field(
        default=60,
        title="Number of minutes to wait between cleanup runs",
        description="Minutes between cleanup passes that remove expired recording segments.",
    )
    continuous: RecordRetainConfig = Field(
        default_factory=RecordRetainConfig,
        title="Continuous recording retention settings",
        description="Number of days to retain recordings regardless of tracked objects or motion. Set to 0 if you only want to retain recordings of alerts and detections.",
    )
    motion: RecordRetainConfig = Field(
        default_factory=RecordRetainConfig,
        title="Motion recording retention settings",
        description="Number of days to retain recordings triggered by motion regardless of tracked objects. Set to 0 if you only want to retain recordings of alerts and detections.",
    )
    detections: EventsConfig = Field(
        default_factory=EventsConfig,
        title="Detection specific retention settings",
        description="Recording retention settings for detection events including pre/post capture durations.",
    )
    alerts: EventsConfig = Field(
        default_factory=EventsConfig,
        title="Alert specific retention settings",
        description="Recording retention settings for alert events including pre/post capture durations.",
    )
    export: RecordExportConfig = Field(
        default_factory=RecordExportConfig,
        title="Recording Export Config",
        description="Settings used when exporting recordings such as timelapse and hardware acceleration.",
    )
    preview: RecordPreviewConfig = Field(
        default_factory=RecordPreviewConfig,
        title="Recording Preview Config",
        description="Settings controlling the quality of recording previews shown in the UI.",
    )
    enabled_in_config: Optional[bool] = Field(
        default=None,
        title="Keep track of original state of recording",
        description="Indicates whether recording was enabled in the original static configuration.",
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
