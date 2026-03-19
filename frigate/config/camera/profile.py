"""Camera profile configuration for named config overrides."""

from typing import Optional

from ..base import FrigateBaseModel
from ..classification import (
    CameraFaceRecognitionConfig,
    CameraLicensePlateRecognitionConfig,
)
from .audio import AudioConfig
from .birdseye import BirdseyeCameraConfig
from .detect import DetectConfig
from .motion import MotionConfig
from .notification import NotificationConfig
from .objects import ObjectConfig
from .record import RecordConfig
from .review import ReviewConfig
from .snapshots import SnapshotsConfig
from .zone import ZoneConfig

__all__ = ["CameraProfileConfig"]


class CameraProfileConfig(FrigateBaseModel):
    """A named profile containing partial camera config overrides.

    Sections set to None inherit from the camera's base config.
    Sections that are defined get Pydantic-validated, then only
    explicitly-set fields are used as overrides via exclude_unset.
    """

    enabled: Optional[bool] = None
    audio: Optional[AudioConfig] = None
    birdseye: Optional[BirdseyeCameraConfig] = None
    detect: Optional[DetectConfig] = None
    face_recognition: Optional[CameraFaceRecognitionConfig] = None
    lpr: Optional[CameraLicensePlateRecognitionConfig] = None
    motion: Optional[MotionConfig] = None
    notifications: Optional[NotificationConfig] = None
    objects: Optional[ObjectConfig] = None
    record: Optional[RecordConfig] = None
    review: Optional[ReviewConfig] = None
    snapshots: Optional[SnapshotsConfig] = None
    zones: Optional[dict[str, ZoneConfig]] = None
