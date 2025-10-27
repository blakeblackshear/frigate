from enum import Enum
from typing import Optional, Union

from pydantic import Field, field_validator

from ..base import FrigateBaseModel

__all__ = ["ReviewConfig", "DetectionsConfig", "AlertsConfig", "ImageSourceEnum"]


class ImageSourceEnum(str, Enum):
    """Image source options for GenAI Review."""

    preview = "preview"
    recordings = "recordings"


DEFAULT_ALERT_OBJECTS = ["person", "car"]


class AlertsConfig(FrigateBaseModel):
    """Configure alerts"""

    enabled: bool = Field(default=True, title="Enable alerts.")

    labels: list[str] = Field(
        default=DEFAULT_ALERT_OBJECTS, title="Labels to create alerts for."
    )
    required_zones: Union[str, list[str]] = Field(
        default_factory=list,
        title="List of required zones to be entered in order to save the event as an alert.",
    )

    enabled_in_config: Optional[bool] = Field(
        default=None, title="Keep track of original state of alerts."
    )
    cutoff_time: int = Field(
        default=40,
        title="Time to cutoff alerts after no alert-causing activity has occurred.",
    )

    @field_validator("required_zones", mode="before")
    @classmethod
    def validate_required_zones(cls, v):
        if isinstance(v, str) and "," not in v:
            return [v]

        return v


class DetectionsConfig(FrigateBaseModel):
    """Configure detections"""

    enabled: bool = Field(default=True, title="Enable detections.")

    labels: Optional[list[str]] = Field(
        default=None, title="Labels to create detections for."
    )
    required_zones: Union[str, list[str]] = Field(
        default_factory=list,
        title="List of required zones to be entered in order to save the event as a detection.",
    )
    cutoff_time: int = Field(
        default=30,
        title="Time to cutoff detection after no detection-causing activity has occurred.",
    )

    enabled_in_config: Optional[bool] = Field(
        default=None, title="Keep track of original state of detections."
    )

    @field_validator("required_zones", mode="before")
    @classmethod
    def validate_required_zones(cls, v):
        if isinstance(v, str) and "," not in v:
            return [v]

        return v


class GenAIReviewConfig(FrigateBaseModel):
    enabled: bool = Field(
        default=False,
        title="Enable GenAI descriptions for review items.",
    )
    alerts: bool = Field(default=True, title="Enable GenAI for alerts.")
    detections: bool = Field(default=False, title="Enable GenAI for detections.")
    image_source: ImageSourceEnum = Field(
        default=ImageSourceEnum.preview,
        title="Image source for review descriptions.",
    )
    additional_concerns: list[str] = Field(
        default=[],
        title="Additional concerns that GenAI should make note of on this camera.",
    )
    debug_save_thumbnails: bool = Field(
        default=False,
        title="Save thumbnails sent to generative AI for debugging purposes.",
    )
    enabled_in_config: Optional[bool] = Field(
        default=None, title="Keep track of original state of generative AI."
    )
    preferred_language: str | None = Field(
        title="Preferred language for GenAI Response",
        default=None,
    )
    activity_context_prompt: str = Field(
        default="""### Normal Activity Indicators (Level 0)
- Known/verified people in any zone
- People with pets in residential areas
- Deliveries: carrying packages to porches/doors, placing packages, leaving
- Access to private areas: entering back yards, garages, or homes
- Brief movement through semi-public areas (driveways, front yards) with clear purpose (carrying items, going to/from vehicles)
- Activity on public areas only (sidewalks, streets) without entering property
- Services/maintenance with visible indicators (tools, uniforms, work vehicles)

### Suspicious Activity Indicators (Level 1)
- Testing doors or windows on vehicles or buildings
- Standing near vehicles or in private zones without clear purpose or direct movement to destination
- Taking items from property (packages, objects from porches/driveways)
- Accessing areas at unusual hours without visible legitimate indicators (items, tools, purpose)
- Climbing or jumping fences/barriers
- Attempting to conceal actions or items
- Person in semi-public areas (driveways, front yards) at unusual hours without clear purpose

### Critical Threat Indicators (Level 2)
- Holding break-in tools (crowbars, pry bars, bolt cutters)
- Weapons visible (guns, knives, bats used aggressively)
- Forced entry in progress
- Physical aggression or violence
- Active property damage or theft

### Assessment Guidance
These patterns are guidance, not absolute rules. Context matters: time of day, visible items/tools, and apparent purpose help distinguish normal from suspicious. Not all cameras show full entry/exit paths - focus on observable behavior in frame. Use judgment based on the complete picture.""",
        title="Custom activity context prompt defining normal and suspicious activity patterns for this property.",
    )


class ReviewConfig(FrigateBaseModel):
    """Configure reviews"""

    alerts: AlertsConfig = Field(
        default_factory=AlertsConfig, title="Review alerts config."
    )
    detections: DetectionsConfig = Field(
        default_factory=DetectionsConfig, title="Review detections config."
    )
    genai: GenAIReviewConfig = Field(
        default_factory=GenAIReviewConfig, title="Review description genai config."
    )
