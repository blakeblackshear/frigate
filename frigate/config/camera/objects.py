from typing import Any, Optional, Union

from pydantic import Field, PrivateAttr, field_serializer

from ..base import FrigateBaseModel

__all__ = ["ObjectConfig", "FilterConfig"]


DEFAULT_TRACKED_OBJECTS = ["person"]


class FilterConfig(FrigateBaseModel):
    min_area: int = Field(
        default=0, title="Minimum area of bounding box for object to be counted."
    )
    max_area: int = Field(
        default=24000000, title="Maximum area of bounding box for object to be counted."
    )
    min_ratio: float = Field(
        default=0,
        title="Minimum ratio of bounding box's width/height for object to be counted.",
    )
    max_ratio: float = Field(
        default=24000000,
        title="Maximum ratio of bounding box's width/height for object to be counted.",
    )
    threshold: float = Field(
        default=0.7,
        title="Average detection confidence threshold for object to be counted.",
    )
    min_score: float = Field(
        default=0.5, title="Minimum detection confidence for object to be counted."
    )
    mask: Optional[Union[str, list[str]]] = Field(
        default=None,
        title="Detection area polygon mask for this filter configuration.",
    )
    raw_mask: Union[str, list[str]] = ""

    @field_serializer("mask", when_used="json")
    def serialize_mask(self, value: Any, info):
        return self.raw_mask

    @field_serializer("raw_mask", when_used="json")
    def serialize_raw_mask(self, value: Any, info):
        return None


class ObjectConfig(FrigateBaseModel):
    track: list[str] = Field(default=DEFAULT_TRACKED_OBJECTS, title="Objects to track.")
    filters: dict[str, FilterConfig] = Field(
        default_factory=dict, title="Object filters."
    )
    mask: Union[str, list[str]] = Field(default="", title="Object mask.")
    _all_objects: list[str] = PrivateAttr()

    @property
    def all_objects(self) -> list[str]:
        return self._all_objects

    def parse_all_objects(self, cameras):
        if "_all_objects" in self:
            return

        # get list of unique enabled labels for tracking
        enabled_labels = set(self.track)

        for camera in cameras.values():
            enabled_labels.update(camera.objects.track)

        self._all_objects = list(enabled_labels)
