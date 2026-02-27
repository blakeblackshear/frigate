# this uses the base model because the color is an extra attribute
import logging
from typing import Optional, Union

import numpy as np
from pydantic import BaseModel, Field, PrivateAttr, field_validator, model_validator

from .objects import FilterConfig

__all__ = ["ZoneConfig"]

logger = logging.getLogger(__name__)


class ZoneConfig(BaseModel):
    friendly_name: Optional[str] = Field(
        None,
        title="Zone name",
        description="A user-friendly name for the zone, displayed in the Frigate UI. If not set, a formatted version of the zone name will be used.",
    )
    enabled: bool = Field(
        default=True,
        title="Enabled",
        description="Enable or disable this zone. Disabled zones are ignored at runtime.",
    )
    enabled_in_config: Optional[bool] = Field(
        default=None, title="Keep track of original state of zone."
    )
    filters: dict[str, FilterConfig] = Field(
        default_factory=dict,
        title="Zone filters",
        description="Filters to apply to objects within this zone. Used to reduce false positives or restrict which objects are considered present in the zone.",
    )
    coordinates: Union[str, list[str]] = Field(
        title="Coordinates",
        description="Polygon coordinates that define the zone area. Can be a comma-separated string or a list of coordinate strings. Coordinates should be relative (0-1) or absolute (legacy).",
    )
    distances: Optional[Union[str, list[str]]] = Field(
        default_factory=list,
        title="Real-world distances",
        description="Optional real-world distances for each side of the zone quadrilateral, used for speed or distance calculations. Must have exactly 4 values if set.",
    )
    inertia: int = Field(
        default=3,
        title="Inertia frames",
        gt=0,
        description="Number of consecutive frames an object must be detected in the zone before it is considered present. Helps filter out transient detections.",
    )
    loitering_time: int = Field(
        default=0,
        ge=0,
        title="Loitering seconds",
        description="Number of seconds an object must remain in the zone to be considered as loitering. Set to 0 to disable loitering detection.",
    )
    speed_threshold: Optional[float] = Field(
        default=None,
        ge=0.1,
        title="Minimum speed",
        description="Minimum speed (in real-world units if distances are set) required for an object to be considered present in the zone. Used for speed-based zone triggers.",
    )
    objects: Union[str, list[str]] = Field(
        default_factory=list,
        title="Trigger objects",
        description="List of object types (from labelmap) that can trigger this zone. Can be a string or a list of strings. If empty, all objects are considered.",
    )
    _color: Optional[tuple[int, int, int]] = PrivateAttr()
    _contour: np.ndarray = PrivateAttr()

    @property
    def color(self) -> tuple[int, int, int]:
        return self._color

    @property
    def contour(self) -> np.ndarray:
        return self._contour

    def get_formatted_name(self, zone_name: str) -> str:
        """Return the friendly name if set, otherwise return a formatted version of the zone name."""
        if self.friendly_name:
            return self.friendly_name
        return zone_name.replace("_", " ").title()

    @field_validator("objects", mode="before")
    @classmethod
    def validate_objects(cls, v):
        if isinstance(v, str) and "," not in v:
            return [v]

        return v

    @field_validator("distances", mode="before")
    @classmethod
    def validate_distances(cls, v):
        if v is None:
            return None

        if isinstance(v, str):
            distances = list(map(str, map(float, v.split(","))))
        elif isinstance(v, list):
            distances = [str(float(val)) for val in v]
        else:
            raise ValueError("Invalid type for distances")

        if len(distances) != 4:
            raise ValueError("distances must have exactly 4 values")

        return distances

    @model_validator(mode="after")
    def check_loitering_time_constraints(self):
        if self.loitering_time > 0 and (
            self.speed_threshold is not None or len(self.distances) > 0
        ):
            logger.warning(
                "loitering_time should not be set on a zone if speed_threshold or distances is set."
            )
        return self

    def __init__(self, **config):
        super().__init__(**config)

        self._color = config.get("color", (0, 0, 0))
        self._contour = config.get("contour", np.array([]))

    def generate_contour(self, frame_shape: tuple[int, int]):
        coordinates = self.coordinates

        # masks and zones are saved as relative coordinates
        # we know if any points are > 1 then it is using the
        # old native resolution coordinates
        if isinstance(coordinates, list):
            explicit = any(p.split(",")[0] > "1.0" for p in coordinates)
            try:
                self._contour = np.array(
                    [
                        (
                            [int(p.split(",")[0]), int(p.split(",")[1])]
                            if explicit
                            else [
                                int(float(p.split(",")[0]) * frame_shape[1]),
                                int(float(p.split(",")[1]) * frame_shape[0]),
                            ]
                        )
                        for p in coordinates
                    ]
                )
            except ValueError:
                raise ValueError(
                    f"Invalid coordinates found in configuration file. Coordinates must be relative (between 0-1): {coordinates}"
                )

            if explicit:
                self.coordinates = ",".join(
                    [
                        f"{round(int(p.split(',')[0]) / frame_shape[1], 3)},{round(int(p.split(',')[1]) / frame_shape[0], 3)}"
                        for p in coordinates
                    ]
                )
        elif isinstance(coordinates, str):
            points = coordinates.split(",")
            explicit = any(p > "1.0" for p in points)
            try:
                self._contour = np.array(
                    [
                        (
                            [int(points[i]), int(points[i + 1])]
                            if explicit
                            else [
                                int(float(points[i]) * frame_shape[1]),
                                int(float(points[i + 1]) * frame_shape[0]),
                            ]
                        )
                        for i in range(0, len(points), 2)
                    ]
                )
            except ValueError:
                raise ValueError(
                    f"Invalid coordinates found in configuration file. Coordinates must be relative (between 0-1): {coordinates}"
                )

            if explicit:
                self.coordinates = ",".join(
                    [
                        f"{round(int(points[i]) / frame_shape[1], 3)},{round(int(points[i + 1]) / frame_shape[0], 3)}"
                        for i in range(0, len(points), 2)
                    ]
                )
        else:
            self._contour = np.array([])
