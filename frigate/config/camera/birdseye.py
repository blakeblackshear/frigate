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
        default=2.0, title="Birdseye Scaling Factor", ge=1.0, le=5.0
    )
    max_cameras: Optional[int] = Field(default=None, title="Max cameras")


class BirdseyeConfig(FrigateBaseModel):
    enabled: bool = Field(default=True, title="Enable birdseye view.")
    mode: BirdseyeModeEnum = Field(
        default=BirdseyeModeEnum.objects, title="Tracking mode."
    )

    restream: bool = Field(default=False, title="Restream birdseye via RTSP.")
    width: int = Field(default=1280, title="Birdseye width.")
    height: int = Field(default=720, title="Birdseye height.")
    quality: int = Field(
        default=8,
        title="Encoding quality.",
        ge=1,
        le=31,
    )
    inactivity_threshold: int = Field(
        default=30, title="Birdseye Inactivity Threshold", gt=0
    )
    layout: BirdseyeLayoutConfig = Field(
        default_factory=BirdseyeLayoutConfig, title="Birdseye Layout Config"
    )
    idle_heartbeat_fps: float = Field(
        default=0.0,
        ge=0.0,
        le=10.0,
        title="Idle heartbeat FPS (0 disables, max 10)",
    )


# uses BaseModel because some global attributes are not available at the camera level
class BirdseyeCameraConfig(BaseModel):
    enabled: bool = Field(default=True, title="Enable birdseye view for camera.")
    mode: BirdseyeModeEnum = Field(
        default=BirdseyeModeEnum.objects, title="Tracking mode for camera."
    )

    order: int = Field(default=0, title="Position of the camera in the birdseye view.")
