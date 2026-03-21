from pydantic import Field

from .base import FrigateBaseModel

__all__ = ["RecapConfig"]


class RecapConfig(FrigateBaseModel):
    enabled: bool = Field(
        default=False,
        title="Enable recaps",
        description="Allow generation of time-stacked recap videos that composite detected objects onto a clean background.",
    )
    default_label: str = Field(
        default="person",
        title="Default object label",
        description="The object type to include in recaps by default.",
    )
    ghost_duration: float = Field(
        default=3.0,
        title="Ghost visibility duration",
        description="How long (in seconds) each detected object stays visible on the recap video.",
        ge=0.5,
        le=30.0,
    )
    output_fps: int = Field(
        default=10,
        title="Output frame rate",
        description="Frame rate of the generated recap video.",
        ge=1,
        le=30,
    )
    video_duration: int = Field(
        default=30,
        title="Video duration",
        description="Target length in seconds for the output video. The full time range is compressed into this duration.",
        ge=5,
        le=300,
    )
    background_samples: int = Field(
        default=30,
        title="Background sample count",
        description="Number of frames sampled across the time range to build the clean background plate via median.",
        ge=5,
        le=100,
    )
