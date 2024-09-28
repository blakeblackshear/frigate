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
        title="Minimum detection confidence threshold for audio to be counted.",
    )


class AudioConfig(FrigateBaseModel):
    enabled: bool = Field(default=False, title="Enable audio events.")
    max_not_heard: int = Field(
        default=30, title="Seconds of not hearing the type of audio to end the event."
    )
    min_volume: int = Field(
        default=500, title="Min volume required to run audio detection."
    )
    listen: list[str] = Field(
        default=DEFAULT_LISTEN_AUDIO, title="Audio to listen for."
    )
    filters: Optional[dict[str, AudioFilterConfig]] = Field(
        None, title="Audio filters."
    )
    enabled_in_config: Optional[bool] = Field(
        None, title="Keep track of original state of audio detection."
    )
    num_threads: int = Field(default=2, title="Number of detection threads", ge=1)
