from enum import Enum
from typing import Optional

from pydantic import BaseModel, Field

from ..base import FrigateBaseModel

__all__ = [
    "BirdseyeCameraConfig",
    "BirdseyeConfig",
    "BirdseyeLayoutConfig",
    "BirdseyeModeEnum",
]


class BirdseyeModeEnum(str, Enum):
    objects = "objects"
    motion = "motion"
    continuous = "continuous"

    @classmethod
    def get_index(cls, type):
        return list(cls).index(type)

    @classmethod
    def get(cls, index):
        return list(cls)[index]


class BirdseyeLayoutConfig(FrigateBaseModel):
    scaling_factor: float = Field(
        default=2.0,
        title="Birdseye scaling factor",
        description="Scaling factor used by the layout calculator (range 1.0 to 5.0).",
        ge=1.0,
        le=5.0,
    )
    max_cameras: Optional[int] = Field(
        default=None,
        title="Max cameras",
        description="Maximum number of cameras to display at once in Birdseye; shows the most recent cameras.",
    )


class BirdseyeConfig(FrigateBaseModel):
    enabled: bool = Field(
        default=True,
        title="Enable birdseye view",
        description="Enable or disable the Birdseye view feature.",
    )
    mode: BirdseyeModeEnum = Field(
        default=BirdseyeModeEnum.objects,
        title="Tracking mode",
        description="Mode for including cameras in Birdseye: 'objects', 'motion', or 'continuous'.",
    )

    restream: bool = Field(
        default=False,
        title="Restream birdseye via RTSP",
        description="Re-stream the Birdseye output as an RTSP feed; enabling this will keep Birdseye running continuously.",
    )
    width: int = Field(
        default=1280,
        title="Birdseye width",
        description="Output width (pixels) of the composed Birdseye frame.",
    )
    height: int = Field(
        default=720,
        title="Birdseye height",
        description="Output height (pixels) of the composed Birdseye frame.",
    )
    quality: int = Field(
        default=8,
        title="Encoding quality",
        description="Encoding quality for the Birdseye mpeg1 feed (1 highest quality, 31 lowest).",
        ge=1,
        le=31,
    )
    inactivity_threshold: int = Field(
        default=30,
        title="Birdseye Inactivity Threshold",
        description="Seconds of inactivity after which a camera will stop being shown in Birdseye.",
        gt=0,
    )
    layout: BirdseyeLayoutConfig = Field(
        default_factory=BirdseyeLayoutConfig,
        title="Birdseye Layout",
        description="Layout options for the Birdseye composition.",
    )
    idle_heartbeat_fps: float = Field(
        default=0.0,
        ge=0.0,
        le=10.0,
        title="Idle heartbeat FPS (0 disables, max 10)",
        description="Frames-per-second to resend the last composed Birdseye frame when idle; set to 0 to disable.",
    )


# uses BaseModel because some global attributes are not available at the camera level
class BirdseyeCameraConfig(BaseModel):
    enabled: bool = Field(
        default=True,
        title="Enable birdseye view",
        description="Enable or disable the Birdseye view feature.",
    )
    mode: BirdseyeModeEnum = Field(
        default=BirdseyeModeEnum.objects,
        title="Tracking mode",
        description="Mode for including cameras in Birdseye: 'objects', 'motion', or 'continuous'.",
    )

    order: int = Field(
        default=0,
        title="Position of the camera in the birdseye view",
        description="Numeric position controlling the camera's ordering in the Birdseye layout.",
    )
