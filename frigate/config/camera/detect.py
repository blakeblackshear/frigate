from typing import Optional

from pydantic import Field

from ..base import FrigateBaseModel

__all__ = ["DetectConfig", "StationaryConfig", "StationaryMaxFramesConfig"]


class StationaryMaxFramesConfig(FrigateBaseModel):
    default: Optional[int] = Field(default=None, title="Default max frames.", ge=1)
    objects: dict[str, int] = Field(
        default_factory=dict, title="Object specific max frames."
    )


class StationaryConfig(FrigateBaseModel):
    interval: Optional[int] = Field(
        default=None,
        title="Frame interval for checking stationary objects.",
        gt=0,
    )
    threshold: Optional[int] = Field(
        default=None,
        title="Number of frames without a position change for an object to be considered stationary",
        ge=1,
    )
    max_frames: StationaryMaxFramesConfig = Field(
        default_factory=StationaryMaxFramesConfig,
        title="Max frames for stationary objects.",
    )
    classifier: bool = Field(
        default=True,
        title="Enable visual classifier for determing if objects with jittery bounding boxes are stationary.",
    )


class DetectConfig(FrigateBaseModel):
    enabled: bool = Field(default=False, title="Detection Enabled.")
    height: Optional[int] = Field(
        default=None, title="Height of the stream for the detect role."
    )
    width: Optional[int] = Field(
        default=None, title="Width of the stream for the detect role."
    )
    fps: int = Field(
        default=5, title="Number of frames per second to process through detection."
    )
    min_initialized: Optional[int] = Field(
        default=None,
        title="Minimum number of consecutive hits for an object to be initialized by the tracker.",
    )
    max_disappeared: Optional[int] = Field(
        default=None,
        title="Maximum number of frames the object can disappear before detection ends.",
    )
    stationary: StationaryConfig = Field(
        default_factory=StationaryConfig,
        title="Stationary objects config.",
    )
    annotation_offset: int = Field(
        default=0, title="Milliseconds to offset detect annotations by."
    )
