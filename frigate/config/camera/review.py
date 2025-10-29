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
- Brief activity near vehicles: approaching vehicles, brief standing, then leaving or entering vehicle (unloading, loading, checking something). Very short sequences (under 15 seconds) of vehicle access during typical hours (6 AM - 10 PM) are almost always normal.
- Deliveries or services: brief approach to doors/porches, standing briefly, placing or retrieving items, then leaving
- Access to private areas: entering back yards, garages, or homes (with or without visible purpose in frame)
- Brief movement through semi-public areas (driveways, front yards) with items or approaching structure/vehicle
- Activity on public areas only (sidewalks, streets) without entering property
- Services/maintenance workers with tools, uniforms, or vehicles

### Suspicious Activity Indicators (Level 1)
- Testing or attempting to open doors/windows on vehicles or buildings
- Taking items that don't belong to them (stealing packages, objects from porches/driveways)
- Climbing or jumping fences/barriers to access property
- Attempting to conceal actions or items from view
- Prolonged presence without purpose: remaining in same area (near vehicles, private zones) throughout most/all of the sequence without clear activity or task. Brief stops (a few seconds of standing) are normal; sustained presence (most of the duration) without interaction is concerning.
- Activity at unusual hours (11 PM - 5 AM) combined with suspicious behavior patterns. Normal commute/daytime hours (6 AM - 6 PM) do not increase suspicion by themselves.

### Critical Threat Indicators (Level 2)
- Holding break-in tools (crowbars, pry bars, bolt cutters)
- Weapons visible (guns, knives, bats used aggressively)
- Forced entry in progress
- Physical aggression or violence
- Active property damage or theft

### Assessment Guidance
**Default to Level 0** for brief activity during normal hours. When evaluating, first check if it matches Normal Activity Indicators. Very short sequences (under 15 seconds) of vehicle access, deliveries, or movement through property during typical hours (6 AM - 11 PM) should be Level 0 unless there are clear suspicious actions visible (testing doors, stealing, climbing barriers).

Only assign Level 1 if the activity shows clear suspicious behaviors: testing access points, stealing items, lingering throughout most of the sequence without task, climbing barriers, or other explicit violations. Brief activity with apparent purpose (approaching vehicle, delivery, passing through) is Level 0.

Consider duration, time, zone, and actions holistically. Brief is normal; sustained suspicious behavior is concerning.""",
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
