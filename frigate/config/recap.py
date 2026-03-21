from pydantic import Field, field_validator

from .base import FrigateBaseModel

__all__ = ["RecapConfig"]


class RecapConfig(FrigateBaseModel):
    enabled: bool = Field(
        default=False,
        title="Enable recaps",
        description="Allow generation of time-stacked recap videos that composite detected objects onto a clean background.",
    )
    auto_generate: bool = Field(
        default=False,
        title="Auto-generate daily",
        description="Automatically generate a recap for the previous day at the scheduled time.",
    )
    schedule_time: str = Field(
        default="02:00",
        title="Schedule time",
        description="Time of day (HH:MM, 24h format) to auto-generate the previous day's recap. Only used when auto_generate is true.",
    )
    cameras: list[str] = Field(
        default=[],
        title="Cameras",
        description="List of camera names to generate recaps for. Empty list means all cameras.",
    )
    default_label: str = Field(
        default="person",
        title="Default object label",
        description="The object type to include in recaps.",
    )
    speed: int = Field(
        default=2,
        title="Playback speed",
        description="Speed multiplier for the output video.",
        ge=1,
        le=8,
    )
    max_per_group: int = Field(
        default=3,
        title="Max events per group",
        description="Maximum number of events to composite simultaneously. Higher values pack more into the video but can get crowded.",
        ge=1,
        le=10,
    )
    ghost_duration: float = Field(
        default=3.0,
        title="Ghost visibility duration",
        description="How long (in seconds of video time) each detection stays visible when path data is unavailable.",
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
        title="Minimum video duration",
        description="Minimum length in seconds for the output video. Actual length depends on event count and durations.",
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

    @field_validator("schedule_time")
    @classmethod
    def validate_schedule_time(cls, v: str) -> str:
        parts = v.split(":")
        if len(parts) != 2:
            raise ValueError("schedule_time must be HH:MM format")
        try:
            h, m = int(parts[0]), int(parts[1])
        except ValueError:
            raise ValueError("schedule_time must be HH:MM format")
        if not (0 <= h <= 23 and 0 <= m <= 59):
            raise ValueError("schedule_time hours must be 0-23 and minutes 0-59")
        return v
