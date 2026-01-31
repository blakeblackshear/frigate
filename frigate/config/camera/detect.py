from typing import Optional

from pydantic import Field

from ..base import FrigateBaseModel

__all__ = ["DetectConfig", "StationaryConfig", "StationaryMaxFramesConfig"]


class StationaryMaxFramesConfig(FrigateBaseModel):
    default: Optional[int] = Field(
        default=None,
        title="Default max frames",
        description="Default maximum frames to track a stationary object before stopping.",
        ge=1,
    )
    objects: dict[str, int] = Field(
        default_factory=dict,
        title="Object max frames",
        description="Per-object overrides for maximum frames to track stationary objects.",
    )


class StationaryConfig(FrigateBaseModel):
    interval: Optional[int] = Field(
        default=None,
        title="Stationary interval",
        description="How often (in frames) to run a detection check to confirm a stationary object.",
        gt=0,
    )
    threshold: Optional[int] = Field(
        default=None,
        title="Stationary threshold",
        description="Number of frames with no position change required to mark an object as stationary.",
        ge=1,
    )
    max_frames: StationaryMaxFramesConfig = Field(
        default_factory=StationaryMaxFramesConfig,
        title="Max frames",
        description="Limits how long stationary objects are tracked before being discarded.",
    )
    classifier: bool = Field(
        default=True,
        title="Enable visual classifier",
        description="Use a visual classifier to detect truly stationary objects even when bounding boxes jitter.",
    )


class DetectConfig(FrigateBaseModel):
    enabled: bool = Field(
        default=False,
        title="Detection enabled",
        description="Enable or disable object detection for all cameras; can be overridden per-camera. Detection must be enabled for object tracking to run.",
    )
    height: Optional[int] = Field(
        default=None,
        title="Detect height",
        description="Height (pixels) of frames used for the detect stream; leave empty to use the native stream resolution.",
    )
    width: Optional[int] = Field(
        default=None,
        title="Detect width",
        description="Width (pixels) of frames used for the detect stream; leave empty to use the native stream resolution.",
    )
    fps: int = Field(
        default=5,
        title="Detect FPS",
        description="Desired frames per second to run detection on; lower values reduce CPU usage (recommended value is 5, only set higher - at most 10 - if tracking extremely fast moving objects).",
    )
    min_initialized: Optional[int] = Field(
        default=None,
        title="Minimum initialization frames",
        description="Number of consecutive detection hits required before creating a tracked object. Increase to reduce false initializations. Default value is fps divided by 2.",
    )
    max_disappeared: Optional[int] = Field(
        default=None,
        title="Maximum disappeared frames",
        description="Number of frames without a detection before a tracked object is considered gone.",
    )
    stationary: StationaryConfig = Field(
        default_factory=StationaryConfig,
        title="Stationary objects config",
        description="Settings to detect and manage objects that remain stationary for a period of time.",
    )
    annotation_offset: int = Field(
        default=0,
        title="Annotation offset",
        description="Milliseconds to shift detect annotations to better align timeline bounding boxes with recordings; can be positive or negative.",
    )
