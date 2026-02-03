from typing import Any, Optional, Union

from pydantic import Field, PrivateAttr, field_serializer, field_validator

from ..base import FrigateBaseModel

__all__ = ["ObjectConfig", "GenAIObjectConfig", "FilterConfig"]


DEFAULT_TRACKED_OBJECTS = ["person"]


class FilterConfig(FrigateBaseModel):
    min_area: Union[int, float] = Field(
        default=0,
        title="Minimum object area",
        description="Minimum bounding box area (pixels or percentage) required for this object type. Can be pixels (int) or percentage (float between 0.000001 and 0.99).",
    )
    max_area: Union[int, float] = Field(
        default=24000000,
        title="Maximum object area",
        description="Maximum bounding box area (pixels or percentage) allowed for this object type. Can be pixels (int) or percentage (float between 0.000001 and 0.99).",
    )
    min_ratio: float = Field(
        default=0,
        title="Minimum aspect ratio",
        description="Minimum width/height ratio required for the bounding box to qualify.",
    )
    max_ratio: float = Field(
        default=24000000,
        title="Maximum aspect ratio",
        description="Maximum width/height ratio allowed for the bounding box to qualify.",
    )
    threshold: float = Field(
        default=0.7,
        title="Confidence threshold",
        description="Average detection confidence threshold required for the object to be considered a true positive.",
    )
    min_score: float = Field(
        default=0.5,
        title="Minimum confidence",
        description="Minimum single-frame detection confidence required for the object to be counted.",
    )
    mask: Optional[Union[str, list[str]]] = Field(
        default=None,
        title="Filter mask",
        description="Polygon coordinates defining where this filter applies within the frame.",
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
        default=True,
        title="Send on end",
        description="Send a request to GenAI when the tracked object ends.",
    )
    after_significant_updates: Optional[int] = Field(
        default=None,
        title="Early GenAI trigger",
        description="Send a request to GenAI after a specified number of significant updates for the tracked object.",
        ge=1,
    )


class GenAIObjectConfig(FrigateBaseModel):
    enabled: bool = Field(
        default=False,
        title="Enable GenAI",
        description="Enable GenAI generation of descriptions for tracked objects by default.",
    )
    use_snapshot: bool = Field(
        default=False,
        title="Use snapshots",
        description="Use object snapshots instead of thumbnails for GenAI description generation.",
    )
    prompt: str = Field(
        default="Analyze the sequence of images containing the {label}. Focus on the likely intent or behavior of the {label} based on its actions and movement, rather than describing its appearance or the surroundings. Consider what the {label} is doing, why, and what it might do next.",
        title="Caption prompt",
        description="Default prompt template used when generating descriptions with GenAI.",
    )
    object_prompts: dict[str, str] = Field(
        default_factory=dict,
        title="Object prompts",
        description="Per-object prompts to customize GenAI outputs for specific labels.",
    )

    objects: Union[str, list[str]] = Field(
        default_factory=list,
        title="GenAI objects",
        description="List of object labels to send to GenAI by default.",
    )
    required_zones: Union[str, list[str]] = Field(
        default_factory=list,
        title="Required zones",
        description="Zones that must be entered for objects to qualify for GenAI description generation.",
    )
    debug_save_thumbnails: bool = Field(
        default=False,
        title="Save thumbnails",
        description="Save thumbnails sent to GenAI for debugging and review.",
    )
    send_triggers: GenAIObjectTriggerConfig = Field(
        default_factory=GenAIObjectTriggerConfig,
        title="GenAI triggers",
        description="Defines when frames should be sent to GenAI (on end, after updates, etc.).",
    )
    enabled_in_config: Optional[bool] = Field(
        default=None,
        title="Original GenAI state",
        description="Indicates whether GenAI was enabled in the original static config.",
    )

    @field_validator("required_zones", mode="before")
    @classmethod
    def validate_required_zones(cls, v):
        if isinstance(v, str) and "," not in v:
            return [v]

        return v


class ObjectConfig(FrigateBaseModel):
    track: list[str] = Field(
        default=DEFAULT_TRACKED_OBJECTS,
        title="Objects to track",
        description="List of object labels to track for all cameras; can be overridden per-camera.",
    )
    filters: dict[str, FilterConfig] = Field(
        default_factory=dict,
        title="Object filters",
        description="Filters applied to detected objects to reduce false positives (area, ratio, confidence).",
    )
    mask: Union[str, list[str]] = Field(
        default="",
        title="Object mask",
        description="Mask polygon used to prevent object detection in specified areas.",
    )
    genai: GenAIObjectConfig = Field(
        default_factory=GenAIObjectConfig,
        title="GenAI object config",
        description="GenAI options for describing tracked objects and sending frames for generation.",
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
