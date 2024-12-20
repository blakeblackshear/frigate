from typing import Optional

from pydantic import Field

from ..base import FrigateBaseModel
from .record import RetainModeEnum

__all__ = ["SnapshotsConfig", "RetainConfig"]


class RetainConfig(FrigateBaseModel):
    default: float = Field(default=10, title="Default retention period.")
    mode: RetainModeEnum = Field(default=RetainModeEnum.motion, title="Retain mode.")
    objects: dict[str, float] = Field(
        default_factory=dict, title="Object retention period."
    )


class SnapshotsConfig(FrigateBaseModel):
    enabled: bool = Field(default=False, title="Snapshots enabled.")
    clean_copy: bool = Field(
        default=True, title="Create a clean copy of the snapshot image."
    )
    timestamp: bool = Field(
        default=False, title="Add a timestamp overlay on the snapshot."
    )
    bounding_box: bool = Field(
        default=True, title="Add a bounding box overlay on the snapshot."
    )
    crop: bool = Field(default=False, title="Crop the snapshot to the detected object.")
    required_zones: list[str] = Field(
        default_factory=list,
        title="List of required zones to be entered in order to save a snapshot.",
    )
    height: Optional[int] = Field(default=None, title="Snapshot image height.")
    retain: RetainConfig = Field(
        default_factory=RetainConfig, title="Snapshot retention."
    )
    quality: int = Field(
        default=70,
        title="Quality of the encoded jpeg (0-100).",
        ge=0,
        le=100,
    )
