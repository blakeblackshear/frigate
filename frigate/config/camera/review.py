from typing import Optional, Union

from pydantic import Field, field_validator

from ..base import FrigateBaseModel

__all__ = ["ReviewConfig", "DetectionsConfig", "AlertsConfig"]


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
        default="""- **Zone context is critical**: Private enclosed spaces (back yards, back decks, fenced areas, inside garages) are resident territory where brief transient activity, routine tasks, and pet care are expected and normal. Front yards, driveways, and porches are semi-public but still resident spaces where deliveries, parking, and coming/going are routine. Consider whether the zone and activity align with normal residential use.
- **Person + Pet = Normal Activity**: When both "Person" and "Dog" (or "Cat") are detected together in residential zones, this is routine pet care activity (walking, letting out, playing, supervising). Assign Level 0 unless there are OTHER strong suspicious behaviors present (like testing doors, taking items, etc.). A person with their pet in a residential zone is baseline normal activity.
- Brief appearances in private zones (back yards, garages) are normal residential patterns.
- Normal residential activity includes: residents, family members, guests, deliveries, services, maintenance workers, routine property use (parking, unloading, mail pickup, trash removal).
- Brief movement with legitimate items (bags, packages, tools, equipment) in appropriate zones is routine.
""",
        title="Custom activity context prompt defining normal activity patterns for this property.",
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
