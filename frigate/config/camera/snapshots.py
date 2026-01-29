from typing import Optional

from pydantic import Field

from ..base import FrigateBaseModel
from .record import RetainModeEnum

__all__ = ["SnapshotsConfig", "RetainConfig"]


class RetainConfig(FrigateBaseModel):
    default: float = Field(
        default=10,
        title="Default retention period",
        description="Default number of days to retain snapshots.",
    )
    mode: RetainModeEnum = Field(
        default=RetainModeEnum.motion,
        title="Retain mode",
        description="Mode for retention: all (save all segments), motion (save segments with motion), or active_objects (save segments with active objects).",
    )
    objects: dict[str, float] = Field(
        default_factory=dict,
        title="Object retention period",
        description="Per-object overrides for snapshot retention days.",
    )


class SnapshotsConfig(FrigateBaseModel):
    enabled: bool = Field(
        default=False,
        title="Snapshots enabled",
        description="Enable or disable saving snapshots globally.",
    )
    clean_copy: bool = Field(
        default=True,
        title="Create a clean copy of the snapshot image",
        description="Save an unannotated clean copy of snapshots in addition to annotated ones.",
    )
    timestamp: bool = Field(
        default=False,
        title="Add a timestamp overlay on the snapshot",
        description="Overlay a timestamp on saved snapshots.",
    )
    bounding_box: bool = Field(
        default=True,
        title="Add a bounding box overlay on the snapshot",
        description="Draw bounding boxes for tracked objects on saved snapshots.",
    )
    crop: bool = Field(
        default=False,
        title="Crop the snapshot to the detected object",
        description="Crop saved snapshots to the detected object's bounding box.",
    )
    required_zones: list[str] = Field(
        default_factory=list,
        title="List of required zones to be entered in order to save a snapshot",
        description="Zones an object must enter for a snapshot to be saved.",
    )
    height: Optional[int] = Field(
        default=None,
        title="Snapshot image height",
        description="Height (pixels) to resize saved snapshots to; leave empty to preserve original size.",
    )
    retain: RetainConfig = Field(
        default_factory=RetainConfig,
        title="Snapshot retention",
        description="Retention settings for saved snapshots including default days and per-object overrides.",
    )
    quality: int = Field(
        default=70,
        title="Quality of the encoded jpeg (0-100)",
        description="JPEG encode quality for saved snapshots (0-100).",
        ge=0,
        le=100,
    )
