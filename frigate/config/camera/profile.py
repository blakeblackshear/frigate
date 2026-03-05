"""Camera profile configuration for named config overrides."""

from typing import Optional

from ..base import FrigateBaseModel
from .audio import AudioConfig
from .birdseye import BirdseyeCameraConfig
from .detect import DetectConfig
from .live import CameraLiveConfig
from .motion import MotionConfig
from .notification import NotificationConfig
from .objects import ObjectConfig
from .record import RecordConfig
from .review import ReviewConfig
from .snapshots import SnapshotsConfig

__all__ = ["CameraProfileConfig"]


class CameraProfileConfig(FrigateBaseModel):
    """A named profile containing partial camera config overrides.

    Sections set to None inherit from the camera's base config.
    Sections that are defined get Pydantic-validated, then only
    explicitly-set fields are used as overrides via exclude_unset.
    """

    audio: Optional[AudioConfig] = None
    birdseye: Optional[BirdseyeCameraConfig] = None
    detect: Optional[DetectConfig] = None
    live: Optional[CameraLiveConfig] = None
    motion: Optional[MotionConfig] = None
    notifications: Optional[NotificationConfig] = None
    objects: Optional[ObjectConfig] = None
    record: Optional[RecordConfig] = None
    review: Optional[ReviewConfig] = None
    snapshots: Optional[SnapshotsConfig] = None
