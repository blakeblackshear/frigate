from pydantic import Field

from ..base import FrigateBaseModel

__all__ = ["CameraMqttConfig"]


class CameraMqttConfig(FrigateBaseModel):
    enabled: bool = Field(default=True, title="Send image over MQTT.")
    timestamp: bool = Field(default=True, title="Add timestamp to MQTT image.")
    bounding_box: bool = Field(default=True, title="Add bounding box to MQTT image.")
    crop: bool = Field(default=True, title="Crop MQTT image to detected object.")
    height: int = Field(default=270, title="MQTT image height.")
    required_zones: list[str] = Field(
        default_factory=list,
        title="List of required zones to be entered in order to send the image.",
    )
    quality: int = Field(
        default=70,
        title="Quality of the encoded jpeg (0-100).",
        ge=0,
        le=100,
    )
