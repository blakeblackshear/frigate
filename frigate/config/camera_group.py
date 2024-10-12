from typing import Union

from pydantic import Field, field_validator

from .base import FrigateBaseModel

__all__ = ["CameraGroupConfig"]


class CameraGroupConfig(FrigateBaseModel):
    """Represents a group of cameras."""

    cameras: Union[str, list[str]] = Field(
        default_factory=list, title="List of cameras in this group."
    )
    icon: str = Field(default="generic", title="Icon that represents camera group.")
    order: int = Field(default=0, title="Sort order for group.")

    @field_validator("cameras", mode="before")
    @classmethod
    def validate_cameras(cls, v):
        if isinstance(v, str) and "," not in v:
            return [v]

        return v
