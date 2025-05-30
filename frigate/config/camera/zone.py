# this uses the base model because the color is an extra attribute
import logging
from typing import Optional, Union

import numpy as np
from pydantic import BaseModel, Field, PrivateAttr, field_validator, model_validator

from .objects import FilterConfig

__all__ = ["ZoneConfig"]

logger = logging.getLogger(__name__)


class ZoneConfig(BaseModel):
    filters: dict[str, FilterConfig] = Field(
        default_factory=dict, title="Zone filters."
    )
    coordinates: Union[str, list[str]] = Field(
        title="Coordinates polygon for the defined zone."
    )
    distances: Optional[Union[str, list[str]]] = Field(
        default_factory=list,
        title="Real-world distances for the sides of quadrilateral for the defined zone.",
    )
    inertia: int = Field(
        default=3,
        title="Number of consecutive frames required for object to be considered present in the zone.",
        gt=0,
    )
    loitering_time: int = Field(
        default=0,
        ge=0,
        title="Number of seconds that an object must loiter to be considered in the zone.",
    )
    speed_threshold: Optional[float] = Field(
        default=None,
        ge=0.1,
        title="Minimum speed value for an object to be considered in the zone.",
    )
    objects: Union[str, list[str]] = Field(
        default_factory=list,
        title="List of objects that can trigger the zone.",
    )
    _color: Optional[tuple[int, int, int]] = PrivateAttr()
    _contour: np.ndarray = PrivateAttr()

    @property
    def color(self) -> tuple[int, int, int]:
        return self._color

    @property
    def contour(self) -> np.ndarray:
        return self._contour

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
