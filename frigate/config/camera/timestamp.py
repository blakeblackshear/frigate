from enum import Enum
from typing import Optional

from pydantic import Field

from ..base import FrigateBaseModel

__all__ = [
    "TimestampStyleConfig",
    "TimestampEffectEnum",
    "ColorConfig",
    "TimestampPositionEnum",
]


# TODO: Identify what the default format to display timestamps is
DEFAULT_TIME_FORMAT = "%m/%d/%Y %H:%M:%S"
# German Style:
# DEFAULT_TIME_FORMAT = "%d.%m.%Y %H:%M:%S"


class TimestampPositionEnum(str, Enum):
    tl = "tl"
    tr = "tr"
    bl = "bl"
    br = "br"


class ColorConfig(FrigateBaseModel):
    red: int = Field(
        default=255,
        ge=0,
        le=255,
        title="Red",
        description="Red component (0-255) for timestamp color.",
    )
    green: int = Field(
        default=255,
        ge=0,
        le=255,
        title="Green",
        description="Green component (0-255) for timestamp color.",
    )
    blue: int = Field(
        default=255,
        ge=0,
        le=255,
        title="Blue",
        description="Blue component (0-255) for timestamp color.",
    )


class TimestampEffectEnum(str, Enum):
    solid = "solid"
    shadow = "shadow"


class TimestampStyleConfig(FrigateBaseModel):
    position: TimestampPositionEnum = Field(
        default=TimestampPositionEnum.tl,
        title="Timestamp position",
        description="Position of the timestamp on the image (tl/tr/bl/br).",
    )
    format: str = Field(
        default=DEFAULT_TIME_FORMAT,
        title="Timestamp format",
        description="Datetime format string used for timestamps (Python datetime format codes).",
    )
    color: ColorConfig = Field(
        default_factory=ColorConfig,
        title="Timestamp color",
        description="RGB color values for the timestamp text (all values 0-255).",
    )
    thickness: int = Field(
        default=2,
        title="Timestamp thickness",
        description="Line thickness of the timestamp text.",
    )
    effect: Optional[TimestampEffectEnum] = Field(
        default=None,
        title="Timestamp effect",
        description="Visual effect for the timestamp text (none, solid, shadow).",
    )
