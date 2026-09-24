from pydantic import Field

from ..base import FrigateBaseModel

__all__ = ["CameraLiveConfig"]


class CameraLiveConfig(FrigateBaseModel):
    streams: dict[str, str] = Field(
        default_factory=list,
        title="Live stream names",
        description="Mapping of configured stream names to restream/go2rtc names used for live playback.",
    )
    show_last_frame_when_off: bool = Field(
        default=False,
        title="Show last frame when off",
        description="Keep the last available camera frame visible in the Web UI when the camera is intentionally disabled.",
    )
    height: int = Field(
        default=720,
        title="Live height",
        description="Height (pixels) to render the jsmpeg live stream in the Web UI; must be <= detect stream height.",
    )
    quality: int = Field(
        default=8,
        ge=1,
        le=31,
        title="Live quality",
        description="Encoding quality for the jsmpeg stream (1 highest, 31 lowest).",
    )
