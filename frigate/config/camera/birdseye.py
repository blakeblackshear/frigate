from enum import Enum
from typing import Any, Self

from pydantic import BaseModel, Field, model_validator

from ..base import FrigateBaseModel

__all__ = [
    "BirdseyeCameraConfig",
    "BirdseyeConfig",
    "BirdseyeLayoutConfig",
    "BirdseyeModeConfig",
    "BirdseyeModeEnum",
]


class BirdseyeModeEnum(str, Enum):
    objects = "objects"
    motion = "motion"
    stationary_objects = "stationary_objects"
    continuous = "continuous"

    @classmethod
    def get_index(cls, type):
        return list(cls).index(type)

    @classmethod
    def get(cls, index):
        return list(cls)[index]


class BirdseyeModeConfig(FrigateBaseModel):
    continuous: bool = Field(
        default=False,
        title="Continuous",
        description="Always include the camera in Birdseye.",
    )
    motion: bool = Field(
        default=False,
        title="Motion",
        description="Include the camera in Birdseye when motion is detected.",
    )
    objects: bool = Field(
        default=False,
        title="Active objects",
        description="Include the camera in Birdseye while an active object is tracked.",
    )
    stationary_objects: bool = Field(
        default=False,
        title="Stationary objects",
        description="Include the camera in Birdseye while a stationary object is tracked.",
    )

    @model_validator(mode="before")
    @classmethod
    def migrate_legacy_mode(cls, value: Any) -> Any:
        """Convert the legacy single mode value to boolean mode options."""
        if isinstance(value, (str, BirdseyeModeEnum)):
            try:
                mode = BirdseyeModeEnum(value)
            except ValueError:
                return value

            return {
                candidate.value: candidate == mode for candidate in BirdseyeModeEnum
            }

        return value

    @model_validator(mode="after")
    def ensure_activity_type_enabled(self) -> Self:
        """Require at least one activity type for a usable mode."""
        if not any(getattr(self, mode.value) for mode in BirdseyeModeEnum):
            raise ValueError("At least one Birdseye activity type must be enabled")

        return self

    @classmethod
    def from_mqtt_payload(cls, payload: str) -> "BirdseyeModeConfig | None":
        """Create mode options from an uppercase MQTT payload."""
        raw_modes = payload.split(",")
        if not raw_modes or any(not mode for mode in raw_modes):
            return None

        modes_by_payload = {mode.value.upper(): mode for mode in BirdseyeModeEnum}
        try:
            modes = [modes_by_payload[raw_mode] for raw_mode in raw_modes]
        except KeyError:
            return None

        if len(modes) != len(set(modes)):
            return None

        return cls(**{mode.value: True for mode in modes})

    def to_mqtt_payload(self) -> str:
        """Serialize enabled mode options for MQTT state topics."""
        return ",".join(
            mode.value.upper() for mode in BirdseyeModeEnum if getattr(self, mode.value)
        )


def default_birdseye_mode() -> BirdseyeModeConfig:
    """Return the default Birdseye mode configuration."""
    return BirdseyeModeConfig(objects=True)


class BirdseyeLayoutConfig(FrigateBaseModel):
    scaling_factor: float = Field(
        default=2.0,
        title="Scaling factor",
        description="Scaling factor used by the layout calculator (range 1.0 to 5.0).",
        ge=1.0,
        le=5.0,
    )
    max_cameras: int | None = Field(
        default=None,
        title="Max cameras",
        description="Maximum number of cameras to display at once in Birdseye; shows the most recent cameras.",
    )


class BirdseyeConfig(FrigateBaseModel):
    enabled: bool = Field(
        default=True,
        title="Enable Birdseye",
        description="Enable or disable the Birdseye view feature.",
    )
    mode: BirdseyeModeConfig = Field(
        default_factory=default_birdseye_mode,
        title="Activity types",
        description="Activity types that include cameras in Birdseye.",
    )

    restream: bool = Field(
        default=False,
        title="Restream RTSP",
        description="Re-stream the Birdseye output as an RTSP feed; enabling this will keep Birdseye running continuously.",
    )
    width: int = Field(
        default=1280,
        title="Width",
        description="Output width (pixels) of the composed Birdseye frame.",
    )
    height: int = Field(
        default=720,
        title="Height",
        description="Output height (pixels) of the composed Birdseye frame.",
    )
    quality: int = Field(
        default=8,
        title="Encoding quality",
        description="Encoding quality for the Birdseye mpeg1 feed (1 highest quality, 31 lowest).",
        ge=1,
        le=31,
    )
    inactivity_threshold: int = Field(
        default=30,
        title="Inactivity threshold",
        description="Seconds of inactivity after which a camera will stop being shown in Birdseye.",
        gt=0,
    )
    layout: BirdseyeLayoutConfig = Field(
        default_factory=BirdseyeLayoutConfig,
        title="Layout",
        description="Layout options for the Birdseye composition.",
    )
    idle_heartbeat_fps: float = Field(
        default=0.0,
        ge=0.0,
        le=10.0,
        title="Idle heartbeat FPS",
        description="Frames-per-second to resend the last composed Birdseye frame when idle; set to 0 to disable.",
    )


# uses BaseModel because some global attributes are not available at the camera level
class BirdseyeCameraConfig(BaseModel):
    enabled: bool = Field(
        default=True,
        title="Enable Birdseye",
        description="Enable or disable the Birdseye view feature.",
    )
    mode: BirdseyeModeConfig = Field(
        default_factory=default_birdseye_mode,
        title="Activity types",
        description="Activity types that include cameras in Birdseye.",
    )

    order: int = Field(
        default=0,
        title="Position",
        description="Numeric position controlling the camera's ordering in the Birdseye layout.",
    )
