from typing import Any, Optional, Union

from pydantic import Field, PrivateAttr, field_serializer, field_validator

from ..base import FrigateBaseModel

__all__ = ["ObjectConfig", "GenAIObjectConfig", "FilterConfig"]


DEFAULT_TRACKED_OBJECTS = ["person"]


class FilterConfig(FrigateBaseModel):
    min_area: Union[int, float] = Field(
        default=0,
        title="Minimum area of bounding box for object to be counted. Can be pixels (int) or percentage (float between 0.000001 and 0.99)",
        description="Minimum bounding box area (pixels or percentage) required for this object type. Can be pixels (int) or percentage (float between 0.000001 and 0.99).",
    )
    max_area: Union[int, float] = Field(
        default=24000000,
        title="Maximum area of bounding box for object to be counted. Can be pixels (int) or percentage (float between 0.000001 and 0.99)",
        description="Maximum bounding box area (pixels or percentage) allowed for this object type. Can be pixels (int) or percentage (float between 0.000001 and 0.99).",
    )
    min_ratio: float = Field(
        default=0,
        title="Minimum ratio of bounding box's width/height for object to be counted",
        description="Minimum width/height ratio required for the bounding box to qualify.",
    )
    max_ratio: float = Field(
        default=24000000,
        title="Maximum ratio of bounding box's width/height for object to be counted",
        description="Maximum width/height ratio allowed for the bounding box to qualify.",
    )
    threshold: float = Field(
        default=0.7,
        title="Average detection confidence threshold for object to be counted",
        description="Average detection confidence threshold required for the object to be considered a true positive.",
    )
    min_score: float = Field(
        default=0.5,
        title="Minimum detection confidence for object to be counted",
        description="Minimum single-frame detection confidence required for the object to be counted.",
    )
    mask: Optional[Union[str, list[str]]] = Field(
        default=None,
        title="Detection area polygon mask for this filter configuration",
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
        title="Send once the object is no longer tracked",
        description="Send a request to GenAI when the tracked object ends.",
    )
    after_significant_updates: Optional[int] = Field(
        default=None,
        title="Send an early request to generative AI when X frames accumulated",
        description="Send a request to GenAI after a specified number of significant updates for the tracked object.",
        ge=1,
    )


class GenAIObjectConfig(FrigateBaseModel):
    enabled: bool = Field(
        default=False,
        title="Enable GenAI for camera",
        description="Enable GenAI generation of descriptions for tracked objects by default.",
    )
    use_snapshot: bool = Field(
        default=False,
        title="Use snapshots for generating descriptions",
        description="Use object snapshots instead of thumbnails for GenAI description generation.",
    )
    prompt: str = Field(
        default="Analyze the sequence of images containing the {label}. Focus on the likely intent or behavior of the {label} based on its actions and movement, rather than describing its appearance or the surroundings. Consider what the {label} is doing, why, and what it might do next.",
        title="Default caption prompt",
        description="Default prompt template used when generating descriptions with GenAI.",
    )
    object_prompts: dict[str, str] = Field(
        default_factory=dict,
        title="Object specific prompts",
        description="Per-object prompts to customize GenAI outputs for specific labels.",
    )

    objects: Union[str, list[str]] = Field(
        default_factory=list,
        title="List of objects to run generative AI for",
        description="List of object labels to send to GenAI by default.",
    )
    required_zones: Union[str, list[str]] = Field(
        default_factory=list,
        title="List of required zones to be entered in order to run generative AI",
        description="Zones that must be entered for objects to qualify for GenAI description generation.",
    )
    debug_save_thumbnails: bool = Field(
        default=False,
        title="Save thumbnails sent to generative AI for debugging purposes",
        description="Save thumbnails sent to GenAI for debugging and review.",
    )
    send_triggers: GenAIObjectTriggerConfig = Field(
        default_factory=GenAIObjectTriggerConfig,
        title="What triggers to use to send frames to generative AI for a tracked object",
        description="Defines when frames should be sent to GenAI (on end, after updates, etc.).",
    )
    enabled_in_config: Optional[bool] = Field(
        default=None,
        title="Keep track of original state of generative AI",
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
        description="List of object labels to track globally; camera configs can override this.",
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
        title="Config for using genai to analyze objects",
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
