from pydantic import Field

from ..base import FrigateBaseModel

__all__ = ["CameraUiConfig"]


class CameraUiConfig(FrigateBaseModel):
    order: int = Field(default=0, title="Order of camera in UI.")
    dashboard: bool = Field(
        default=True, title="Show this camera in Frigate dashboard UI."
    )
