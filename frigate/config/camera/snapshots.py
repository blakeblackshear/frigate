from typing import Optional

from pydantic import Field

from ..base import FrigateBaseModel
from .record import RetainModeEnum

__all__ = ["SnapshotsConfig", "RetainConfig"]


class RetainConfig(FrigateBaseModel):
    default: float = Field(
        default=10,
        title="Default retention",
        description="Default number of days to retain snapshots.",
    )
    mode: RetainModeEnum = Field(
        default=RetainModeEnum.motion,
        title="Retention mode",
        description="Mode for retention: all (save all segments), motion (save segments with motion), or active_objects (save segments with active objects).",
    )
    objects: dict[str, float] = Field(
        default_factory=dict,
        title="Object retention",
        description="Per-object overrides for snapshot retention days.",
    )


class SnapshotsConfig(FrigateBaseModel):
    enabled: bool = Field(
        default=False,
        title="Snapshots enabled",
        description="Enable or disable saving snapshots for all cameras; can be overridden per-camera.",
    )
    clean_copy: bool = Field(
        default=True,
        title="Save clean copy",
        description="Save an unannotated clean copy of snapshots in addition to annotated ones.",
    )
    timestamp: bool = Field(
        default=False,
        title="Timestamp overlay",
        description="Overlay a timestamp on saved snapshots.",
    )
    bounding_box: bool = Field(
        default=True,
        title="Bounding box overlay",
        description="Draw bounding boxes for tracked objects on saved snapshots.",
    )
    crop: bool = Field(
        default=False,
        title="Crop snapshot",
        description="Crop saved snapshots to the detected object's bounding box.",
    )
    required_zones: list[str] = Field(
        default_factory=list,
        title="Required zones",
        description="Zones an object must enter for a snapshot to be saved.",
    )
    height: Optional[int] = Field(
        default=None,
        title="Snapshot height",
        description="Height (pixels) to resize saved snapshots to; leave empty to preserve original size.",
    )
    retain: RetainConfig = Field(
        default_factory=RetainConfig,
        title="Snapshot retention",
        description="Retention settings for saved snapshots including default days and per-object overrides.",
    )
    quality: int = Field(
        default=70,
        title="JPEG quality",
        description="JPEG encode quality for saved snapshots (0-100).",
        ge=0,
        le=100,
    )
