from typing import Any, Optional

from pydantic import Field, field_serializer

from ..base import FrigateBaseModel
from .mask import MotionMaskConfig

__all__ = ["MotionConfig"]


class MotionConfig(FrigateBaseModel):
    enabled: bool = Field(
        default=True,
        title="Enable motion detection",
        description="Enable or disable motion detection for all cameras; can be overridden per-camera.",
    )
    threshold: int = Field(
        default=30,
        title="Motion threshold",
        description="Pixel difference threshold used by the motion detector; higher values reduce sensitivity (range 1-255).",
        ge=1,
        le=255,
    )
    lightning_threshold: float = Field(
        default=0.8,
        title="Lightning threshold",
        description="Threshold to detect and ignore brief lighting spikes (lower is more sensitive, values between 0.3 and 1.0).",
        ge=0.3,
        le=1.0,
    )
    improve_contrast: bool = Field(
        default=True,
        title="Improve contrast",
        description="Apply contrast improvement to frames before motion analysis to help detection.",
    )
    contour_area: Optional[int] = Field(
        default=10,
        title="Contour area",
        description="Minimum contour area in pixels required for a motion contour to be counted.",
    )
    delta_alpha: float = Field(
        default=0.2,
        title="Delta alpha",
        description="Alpha blending factor used in frame differencing for motion calculation.",
    )
    frame_alpha: float = Field(
        default=0.01,
        title="Frame alpha",
        description="Alpha value used when blending frames for motion preprocessing.",
    )
    frame_height: Optional[int] = Field(
        default=100,
        title="Frame height",
        description="Height in pixels to scale frames to when computing motion.",
    )
    mask: dict[str, Optional[MotionMaskConfig]] = Field(
        default_factory=dict,
        title="Mask coordinates",
        description="Ordered x,y coordinates defining the motion mask polygon used to include/exclude areas.",
    )
    mqtt_off_delay: int = Field(
        default=30,
        title="MQTT off delay",
        description="Seconds to wait after last motion before publishing an MQTT 'off' state.",
    )
    enabled_in_config: Optional[bool] = Field(
        default=None,
        title="Original motion state",
        description="Indicates whether motion detection was enabled in the original static configuration.",
    )
    raw_mask: dict[str, Optional[MotionMaskConfig]] = Field(
        default_factory=dict, exclude=True
    )

    @field_serializer("mask", when_used="json")
    def serialize_mask(self, value: Any, info):
        if self.raw_mask:
            return self.raw_mask
        return value

    @field_serializer("raw_mask", when_used="json")
    def serialize_raw_mask(self, value: Any, info):
        return None
