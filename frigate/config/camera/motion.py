from typing import Any, Optional, Union

from pydantic import Field, field_serializer

from ..base import FrigateBaseModel

__all__ = ["MotionConfig"]


class MotionConfig(FrigateBaseModel):
    enabled: bool = Field(default=True, title="Enable motion on all cameras.")
    threshold: int = Field(
        default=30,
        title="Motion detection threshold (1-255).",
        ge=1,
        le=255,
    )
    lightning_threshold: float = Field(
        default=0.8, title="Lightning detection threshold (0.3-1.0).", ge=0.3, le=1.0
    )
    improve_contrast: bool = Field(default=True, title="Improve Contrast")
    contour_area: Optional[int] = Field(default=10, title="Contour Area")
    delta_alpha: float = Field(default=0.2, title="Delta Alpha")
    frame_alpha: float = Field(default=0.01, title="Frame Alpha")
    frame_height: Optional[int] = Field(default=100, title="Frame Height")
    mask: Union[str, list[str]] = Field(
        default="", title="Coordinates polygon for the motion mask."
    )
    mqtt_off_delay: int = Field(
        default=30,
        title="Delay for updating MQTT with no motion detected.",
    )
    enabled_in_config: Optional[bool] = Field(
        default=None, title="Keep track of original state of motion detection."
    )
    raw_mask: Union[str, list[str]] = ""

    @field_serializer("mask", when_used="json")
    def serialize_mask(self, value: Any, info):
        return self.raw_mask

    @field_serializer("raw_mask", when_used="json")
    def serialize_raw_mask(self, value: Any, info):
        return None
