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
        title="Object specific max frames",
        description="Per-object overrides for maximum frames to track stationary objects.",
    )


class StationaryConfig(FrigateBaseModel):
    interval: Optional[int] = Field(
        default=None,
        title="Frame interval for checking stationary objects",
        description="How often (in frames) to run a detection check to confirm a stationary object.",
        gt=0,
    )
    threshold: Optional[int] = Field(
        default=None,
        title="Number of frames without a position change for an object to be considered stationary",
        description="Number of frames with no position change required to mark an object as stationary.",
        ge=1,
    )
    max_frames: StationaryMaxFramesConfig = Field(
        default_factory=StationaryMaxFramesConfig,
        title="Max frames for stationary objects",
        description="Limits how long stationary objects are tracked before being discarded.",
    )
    classifier: bool = Field(
        default=True,
        title="Enable visual classifier for determing if objects with jittery bounding boxes are stationary",
        description="Use a visual classifier to detect truly stationary objects even when bounding boxes jitter.",
    )


class DetectConfig(FrigateBaseModel):
    enabled: bool = Field(
        default=False,
        title="Detection Enabled",
        description="Enable or disable object detection for this camera. Detection must be enabled for object tracking to run.",
    )
    height: Optional[int] = Field(
        default=None,
        title="Height of the stream for the detect role",
        description="Height (pixels) of frames used for the detect stream; leave empty to use the native stream resolution.",
    )
    width: Optional[int] = Field(
        default=None,
        title="Width of the stream for the detect role",
        description="Width (pixels) of frames used for the detect stream; leave empty to use the native stream resolution.",
    )
    fps: int = Field(
        default=5,
        title="Number of frames per second to process through detection",
        description="Desired frames per second to run detection on; lower values reduce CPU usage (recommended value is 5, only set higher - at most 10 - if tracking extremely fast moving objects).",
    )
    min_initialized: Optional[int] = Field(
        default=None,
        title="Minimum number of consecutive hits for an object to be initialized by the tracker",
        description="Number of consecutive detection hits required before creating a tracked object. Increase to reduce false initializations. Default value is fps divided by 2.",
    )
    max_disappeared: Optional[int] = Field(
        default=None,
        title="Maximum number of frames the object can disappear before detection ends",
        description="Number of frames without a detection before a tracked object is considered gone.",
    )
    stationary: StationaryConfig = Field(
        default_factory=StationaryConfig,
        title="Stationary objects config",
        description="Settings to detect and manage objects that remain stationary for a period of time.",
    )
    annotation_offset: int = Field(
        default=0,
        title="Milliseconds to offset detect annotations by",
        description="Milliseconds to shift detect annotations to better align timeline bounding boxes with recordings; can be positive or negative.",
    )
