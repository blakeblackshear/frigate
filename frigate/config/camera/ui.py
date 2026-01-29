from pydantic import Field

from ..base import FrigateBaseModel

__all__ = ["CameraUiConfig"]


class CameraUiConfig(FrigateBaseModel):
    """Camera UI

    Display ordering and dashboard visibility for this camera in the UI.
    """

    order: int = Field(
        default=0,
        title="UI order",
        description="Numeric order used to sort the camera in the UI; larger numbers appear later.",
    )
    dashboard: bool = Field(
        default=True,
        title="Show in dashboard",
        description="Toggle whether this camera is visible in the main dashboard.",
    )
