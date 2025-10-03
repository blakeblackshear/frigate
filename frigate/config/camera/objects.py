from typing import Any, Optional, Union

from pydantic import Field, PrivateAttr, field_serializer, field_validator

from ..base import FrigateBaseModel

__all__ = ["ObjectConfig", "GenAIObjectConfig", "FilterConfig"]


DEFAULT_TRACKED_OBJECTS = ["person"]


class FilterConfig(FrigateBaseModel):
    min_area: Union[int, float] = Field(
        default=0,
        title="Minimum area of bounding box for object to be counted. Can be pixels (int) or percentage (float between 0.000001 and 0.99).",
    )
    max_area: Union[int, float] = Field(
        default=24000000,
        title="Maximum area of bounding box for object to be counted. Can be pixels (int) or percentage (float between 0.000001 and 0.99).",
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


class GenAIObjectTriggerConfig(FrigateBaseModel):
    tracked_object_end: bool = Field(
        default=True, title="Send once the object is no longer tracked."
    )
    after_significant_updates: Optional[int] = Field(
        default=None,
        title="Send an early request to generative AI when X frames accumulated.",
        ge=1,
    )


class GenAIObjectConfig(FrigateBaseModel):
    enabled: bool = Field(default=False, title="Enable GenAI for camera.")
    use_snapshot: bool = Field(
        default=False, title="Use snapshots for generating descriptions."
    )
    prompt: str = Field(
        default="Analyze the sequence of images containing the {label}. Focus on the likely intent or behavior of the {label} based on its actions and movement, rather than describing its appearance or the surroundings. Consider what the {label} is doing, why, and what it might do next.",
        title="Default caption prompt.",
    )
    object_prompts: dict[str, str] = Field(
        default_factory=dict, title="Object specific prompts."
    )

    objects: Union[str, list[str]] = Field(
        default_factory=list,
        title="List of objects to run generative AI for.",
    )
    required_zones: Union[str, list[str]] = Field(
        default_factory=list,
        title="List of required zones to be entered in order to run generative AI.",
    )
    debug_save_thumbnails: bool = Field(
        default=False,
        title="Save thumbnails sent to generative AI for debugging purposes.",
    )
    send_triggers: GenAIObjectTriggerConfig = Field(
        default_factory=GenAIObjectTriggerConfig,
        title="What triggers to use to send frames to generative AI for a tracked object.",
    )
    enabled_in_config: Optional[bool] = Field(
        default=None, title="Keep track of original state of generative AI."
    )

    @field_validator("required_zones", mode="before")
    @classmethod
    def validate_required_zones(cls, v):
        if isinstance(v, str) and "," not in v:
            return [v]

        return v


class ObjectConfig(FrigateBaseModel):
    track: list[str] = Field(default=DEFAULT_TRACKED_OBJECTS, title="Objects to track.")
    filters: dict[str, FilterConfig] = Field(
        default_factory=dict, title="Object filters."
    )
    mask: Union[str, list[str]] = Field(default="", title="Object mask.")
    genai: GenAIObjectConfig = Field(
        default_factory=GenAIObjectConfig,
        title="Config for using genai to analyze objects.",
    )
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
