from typing import Union

from pydantic import Field, field_validator

from .base import FrigateBaseModel

__all__ = ["CameraGroupConfig"]


class CameraGroupConfig(FrigateBaseModel):
    cameras: Union[str, list[str]] = Field(
        default_factory=list,
        title="Camera list",
        description="Array of camera names included in this group.",
    )
    icon: str = Field(
        default="generic",
        title="Group icon",
        description="Icon used to represent the camera group in the UI.",
    )
    order: int = Field(
        default=0,
        title="Sort order",
        description="Numeric order used to sort camera groups in the UI; larger numbers appear later.",
    )

    @field_validator("cameras", mode="before")
    @classmethod
    def validate_cameras(cls, v):
        if isinstance(v, str) and "," not in v:
            return [v]

        return v
