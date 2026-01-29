from pydantic import Field

from ..base import FrigateBaseModel

__all__ = ["CameraMqttConfig"]


class CameraMqttConfig(FrigateBaseModel):
    enabled: bool = Field(
        default=True,
        title="Send image over MQTT",
        description="Enable publishing image snapshots for objects to MQTT topics for this camera.",
    )
    timestamp: bool = Field(
        default=True,
        title="Add timestamp to MQTT image",
        description="Overlay a timestamp on images published to MQTT.",
    )
    bounding_box: bool = Field(
        default=True,
        title="Add bounding box to MQTT image",
        description="Draw bounding boxes on images published over MQTT.",
    )
    crop: bool = Field(
        default=True,
        title="Crop MQTT image to detected object",
        description="Crop images published to MQTT to the detected object's bounding box.",
    )
    height: int = Field(
        default=270,
        title="MQTT image height",
        description="Height (pixels) to resize images published over MQTT.",
    )
    required_zones: list[str] = Field(
        default_factory=list,
        title="List of required zones to be entered in order to send the image",
        description="Zones that an object must enter for an MQTT image to be published.",
    )
    quality: int = Field(
        default=70,
        title="Quality of the encoded jpeg (0-100)",
        description="JPEG quality for images published to MQTT (0-100).",
        ge=0,
        le=100,
    )
