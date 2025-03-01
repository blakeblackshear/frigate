from typing import Dict

from pydantic import Field

from ..base import FrigateBaseModel

__all__ = ["CameraLiveConfig"]


class CameraLiveConfig(FrigateBaseModel):
    streams: Dict[str, str] = Field(
        default_factory=list,
        title="Friendly names and restream names to use for live view.",
    )
    height: int = Field(default=720, title="Live camera view height")
    quality: int = Field(default=8, ge=1, le=31, title="Live camera view quality")
