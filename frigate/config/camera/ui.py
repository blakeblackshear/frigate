from pydantic import Field

from ..base import FrigateBaseModel

__all__ = ["CameraUiConfig"]


class CameraUiConfig(FrigateBaseModel):
    order: int = Field(
        default=0,
        title="UI order",
        description="Numeric order used to sort the camera in the UI (default dashboard and lists); larger numbers appear later.",
    )
    dashboard: bool = Field(
        default=True,
        title="Show on Live dashboard",
        description="Toggle whether this camera is visible on the default All Cameras live dashboard. The camera remains available everywhere else in the UI, including camera groups and settings.",
    )
    review: bool = Field(
        default=True,
        title="Show in review",
        description="Toggle whether this camera is visible in review (the review page and its camera filter, motion review, and the history view).",
    )
