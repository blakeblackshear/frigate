from typing import Dict

from pydantic import Field

from ..base import FrigateBaseModel

__all__ = ["CameraLiveConfig"]


class CameraLiveConfig(FrigateBaseModel):
    streams: Dict[str, str] = Field(
        default_factory=list,
        title="Friendly names and restream names to use for live view",
        description="Mapping of configured stream names to restream/go2rtc names used for live playback.",
    )
    height: int = Field(
        default=720,
        title="Live camera view height",
        description="Height (pixels) to render the live stream in the Web UI; must be <= detect stream height.",
    )
    quality: int = Field(
        default=8,
        ge=1,
        le=31,
        title="Live camera view quality",
        description="Encoding quality for the live jsmpeg stream (1 highest, 31 lowest).",
    )
