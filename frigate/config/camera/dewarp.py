from enum import Enum

from pydantic import Field

from ..base import FrigateBaseModel

__all__ = ["DewarpConfig", "DewarpMountEnum"]


class DewarpMountEnum(str, Enum):
    ceiling = "ceiling"
    desktop = "desktop"
    wall = "wall"


class DewarpConfig(FrigateBaseModel):
    mount: DewarpMountEnum = Field(
        default=DewarpMountEnum.ceiling,
        title="Mount",
        description="How the camera is mounted: 'ceiling' looks straight down, 'desktop' looks straight up, and 'wall' looks horizontally.",
    )
    center_x: float = Field(
        default=0.5,
        title="Center X",
        description="Horizontal center of the fisheye circle as a fraction of the image width (0.0 is the left edge, 1.0 is the right edge).",
        ge=0.0,
        le=1.0,
    )
    center_y: float = Field(
        default=0.5,
        title="Center Y",
        description="Vertical center of the fisheye circle as a fraction of the image height (0.0 is the top edge, 1.0 is the bottom edge).",
        ge=0.0,
        le=1.0,
    )
    radius: float = Field(
        default=0.5,
        title="Radius",
        description="Radius of the fisheye circle as a fraction of the image height.",
        gt=0.0,
        le=1.0,
    )
    fov: float = Field(
        default=180.0,
        title="Lens field of view",
        description="Field of view covered by the fisheye circle in degrees.",
        gt=0.0,
        le=360.0,
    )
