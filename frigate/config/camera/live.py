from pydantic import Field

from ..base import FrigateBaseModel

__all__ = ["CameraLiveConfig"]


class CameraLiveConfig(FrigateBaseModel):
    stream_name: str = Field(default="", title="Name of restream to use as live view.")
    height: int = Field(default=720, title="Live camera view height")
    quality: int = Field(default=8, ge=1, le=31, title="Live camera view quality")
