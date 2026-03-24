"""Mask configuration for motion and object masks."""

from typing import Any, Optional, Union

from pydantic import Field, field_serializer

from ..base import FrigateBaseModel

__all__ = ["MotionMaskConfig", "ObjectMaskConfig"]


class MotionMaskConfig(FrigateBaseModel):
    """Configuration for a single motion mask."""

    friendly_name: Optional[str] = Field(
        default=None,
        title="Friendly name",
        description="A friendly name for this motion mask used in the Frigate UI",
    )
    enabled: bool = Field(
        default=True,
        title="Enabled",
        description="Enable or disable this motion mask",
    )
    coordinates: Union[str, list[str]] = Field(
        default="",
        title="Coordinates",
        description="Ordered x,y coordinates defining the motion mask polygon used to include/exclude areas.",
    )
    raw_coordinates: Union[str, list[str]] = ""
    enabled_in_config: Optional[bool] = Field(
        default=None, title="Keep track of original state of motion mask."
    )

    def get_formatted_name(self, mask_id: str) -> str:
        """Return the friendly name if set, otherwise return a formatted version of the mask ID."""
        if self.friendly_name:
            return self.friendly_name
        return mask_id.replace("_", " ").title()

    @field_serializer("coordinates", when_used="json")
    def serialize_coordinates(self, value: Any, info):
        return self.raw_coordinates if self.raw_coordinates else value

    @field_serializer("raw_coordinates", when_used="json")
    def serialize_raw_coordinates(self, value: Any, info):
        return None


class ObjectMaskConfig(FrigateBaseModel):
    """Configuration for a single object mask."""

    friendly_name: Optional[str] = Field(
        default=None,
        title="Friendly name",
        description="A friendly name for this object mask used in the Frigate UI",
    )
    enabled: bool = Field(
        default=True,
        title="Enabled",
        description="Enable or disable this object mask",
    )
    coordinates: Union[str, list[str]] = Field(
        default="",
        title="Coordinates",
        description="Ordered x,y coordinates defining the object mask polygon used to include/exclude areas.",
    )
    raw_coordinates: Union[str, list[str]] = ""
    enabled_in_config: Optional[bool] = Field(
        default=None, title="Keep track of original state of object mask."
    )

    @field_serializer("coordinates", when_used="json")
    def serialize_coordinates(self, value: Any, info):
        return self.raw_coordinates if self.raw_coordinates else value

    @field_serializer("raw_coordinates", when_used="json")
    def serialize_raw_coordinates(self, value: Any, info):
        return None

    def get_formatted_name(self, mask_id: str) -> str:
        """Return the friendly name if set, otherwise return a formatted version of the mask ID."""
        if self.friendly_name:
            return self.friendly_name
        return mask_id.replace("_", " ").title()
