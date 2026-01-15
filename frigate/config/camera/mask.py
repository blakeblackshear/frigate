"""Mask configuration for motion and object masks."""

from typing import Any, Optional, Union

from pydantic import Field, field_serializer

from ..base import FrigateBaseModel

__all__ = ["MotionMaskConfig", "ObjectMaskConfig"]


class MotionMaskConfig(FrigateBaseModel):
    """Configuration for a single motion mask."""

    friendly_name: Optional[str] = Field(
        default=None,
        title="Motion mask friendly name used in the Frigate UI.",
    )
    enabled: bool = Field(
        default=True,
        title="Enable this motion mask.",
    )
    coordinates: Union[str, list[str]] = Field(
        default="",
        title="Coordinates polygon for the motion mask.",
    )
    raw_coordinates: Union[str, list[str]] = ""

    def get_formatted_name(self, mask_id: str) -> str:
        """Return the friendly name if set, otherwise return a formatted version of the mask ID."""
        if self.friendly_name:
            return self.friendly_name
        return mask_id.replace("_", " ").title()

    @field_serializer("coordinates", when_used="json")
    def serialize_coordinates(self, value: Any, info):
        return self.raw_coordinates

    @field_serializer("raw_coordinates", when_used="json")
    def serialize_raw_coordinates(self, value: Any, info):
        return None


class ObjectMaskConfig(FrigateBaseModel):
    """Configuration for a single object mask."""

    friendly_name: Optional[str] = Field(
        default=None,
        title="Object mask friendly name used in the Frigate UI.",
    )
    enabled: bool = Field(
        default=True,
        title="Enable this object mask.",
    )
    coordinates: Union[str, list[str]] = Field(
        default="",
        title="Coordinates polygon for the object mask.",
    )
    raw_coordinates: Union[str, list[str]] = ""

    def get_formatted_name(self, mask_id: str) -> str:
        """Return the friendly name if set, otherwise return a formatted version of the mask ID."""
        if self.friendly_name:
            return self.friendly_name
        return mask_id.replace("_", " ").title()

    @field_serializer("coordinates", when_used="json")
    def serialize_coordinates(self, value: Any, info):
        return self.raw_coordinates

    @field_serializer("raw_coordinates", when_used="json")
    def serialize_raw_coordinates(self, value: Any, info):
        return None
