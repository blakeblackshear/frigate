from pydantic import Field

from ..base import FrigateBaseModel

__all__ = ["DewarpConfig"]


class DewarpConfig(FrigateBaseModel):
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
    pan: float = Field(
        default=0.0,
        title="Pan",
        description="Rotation of the lens around the vertical axis in degrees, used to align the dewarped view.",
        ge=-180.0,
        le=180.0,
    )
    tilt: float = Field(
        default=0.0,
        title="Tilt",
        description="Angle of the lens away from pointing straight down in degrees (0 for a ceiling mount, 90 for a wall mount).",
        ge=-90.0,
        le=90.0,
    )
