"""Camera profile configuration for named config overrides."""

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

    enabled: bool | None = None
    audio: AudioConfig | None = None
    birdseye: BirdseyeCameraConfig | None = None
    detect: DetectConfig | None = None
    face_recognition: CameraFaceRecognitionConfig | None = None
    lpr: CameraLicensePlateRecognitionConfig | None = None
    motion: MotionConfig | None = None
    notifications: NotificationConfig | None = None
    objects: ObjectConfig | None = None
    record: RecordConfig | None = None
    review: ReviewConfig | None = None
    snapshots: SnapshotsConfig | None = None
    zones: dict[str, ZoneConfig] | None = None
