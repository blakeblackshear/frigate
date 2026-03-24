from typing import Optional

from pydantic import Field

from frigate.const import AUDIO_MIN_CONFIDENCE

from ..base import FrigateBaseModel

__all__ = ["AudioConfig", "AudioFilterConfig"]


DEFAULT_LISTEN_AUDIO = ["bark", "fire_alarm", "scream", "speech", "yell"]


class AudioFilterConfig(FrigateBaseModel):
    threshold: float = Field(
        default=0.8,
        ge=AUDIO_MIN_CONFIDENCE,
        lt=1.0,
        title="Minimum audio confidence",
        description="Minimum confidence threshold for the audio event to be counted.",
    )


class AudioConfig(FrigateBaseModel):
    enabled: bool = Field(
        default=False,
        title="Enable audio detection",
        description="Enable or disable audio event detection for all cameras; can be overridden per-camera.",
    )
    max_not_heard: int = Field(
        default=30,
        title="End timeout",
        description="Amount of seconds without the configured audio type before the audio event is ended.",
    )
    min_volume: int = Field(
        default=500,
        title="Minimum volume",
        description="Minimum RMS volume threshold required to run audio detection; lower values increase sensitivity (e.g., 200 high, 500 medium, 1000 low).",
    )
    listen: list[str] = Field(
        default=DEFAULT_LISTEN_AUDIO,
        title="Listen types",
        description="List of audio event types to detect (for example: bark, fire_alarm, scream, speech, yell).",
    )
    filters: Optional[dict[str, AudioFilterConfig]] = Field(
        None,
        title="Audio filters",
        description="Per-audio-type filter settings such as confidence thresholds used to reduce false positives.",
    )
    enabled_in_config: Optional[bool] = Field(
        None,
        title="Original audio state",
        description="Indicates whether audio detection was originally enabled in the static config file.",
    )
    num_threads: int = Field(
        default=2,
        title="Detection threads",
        description="Number of threads to use for audio detection processing.",
        ge=1,
    )
