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

    enabled: bool = Field(
        default=True,
        title="Enable alerts",
        description="Enable or disable alert generation for this camera.",
    )

    labels: list[str] = Field(
        default=DEFAULT_ALERT_OBJECTS,
        title="Labels to create alerts for",
        description="List of object labels that qualify as alerts (for example: car, person).",
    )
    required_zones: Union[str, list[str]] = Field(
        default_factory=list,
        title="List of required zones to be entered in order to save the event as an alert",
        description="Zones that an object must enter to be considered an alert; leave empty to allow any zone.",
    )

    enabled_in_config: Optional[bool] = Field(
        default=None,
        title="Keep track of original state of alerts",
        description="Tracks whether alerts were originally enabled in the static configuration.",
    )
    cutoff_time: int = Field(
        default=40,
        title="Time to cutoff alerts after no alert-causing activity has occurred",
        description="Seconds to wait after no alert-causing activity before cutting off an alert.",
    )

    @field_validator("required_zones", mode="before")
    @classmethod
    def validate_required_zones(cls, v):
        if isinstance(v, str) and "," not in v:
            return [v]

        return v


class DetectionsConfig(FrigateBaseModel):
    """Configure detections"""

    enabled: bool = Field(
        default=True,
        title="Enable detections",
        description="Enable or disable detection events for this camera.",
    )

    labels: Optional[list[str]] = Field(
        default=None,
        title="Labels to create detections for",
        description="List of object labels that qualify as detection events.",
    )
    required_zones: Union[str, list[str]] = Field(
        default_factory=list,
        title="List of required zones to be entered in order to save the event as a detection",
        description="Zones that an object must enter to be considered a detection; leave empty to allow any zone.",
    )
    cutoff_time: int = Field(
        default=30,
        title="Time to cutoff detection after no detection-causing activity has occurred",
        description="Seconds to wait after no detection-causing activity before cutting off a detection.",
    )

    enabled_in_config: Optional[bool] = Field(
        default=None,
        title="Keep track of original state of detections",
        description="Tracks whether detections were originally enabled in the static configuration.",
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
        title="Enable GenAI descriptions for review items",
        description="Enable or disable GenAI-generated descriptions and summaries for review items.",
    )
    alerts: bool = Field(
        default=True,
        title="Enable GenAI for alerts",
        description="Use GenAI to generate descriptions for alert items.",
    )
    detections: bool = Field(
        default=False,
        title="Enable GenAI for detections",
        description="Use GenAI to generate descriptions for detection items.",
    )
    image_source: ImageSourceEnum = Field(
        default=ImageSourceEnum.preview,
        title="Image source for review descriptions",
        description="Source of images sent to GenAI ('preview' or 'recordings'); 'recordings' uses higher quality frames but more tokens.",
    )
    additional_concerns: list[str] = Field(
        default=[],
        title="Additional concerns that GenAI should make note of on this camera",
        description="A list of additional concerns or notes the GenAI should consider when evaluating activity on this camera.",
    )
    debug_save_thumbnails: bool = Field(
        default=False,
        title="Save thumbnails sent to generative AI for debugging purposes",
        description="Save thumbnails that are sent to the GenAI provider for debugging and review.",
    )
    enabled_in_config: Optional[bool] = Field(
        default=None,
        title="Keep track of original state of generative AI",
        description="Tracks whether GenAI review was originally enabled in the static configuration.",
    )
    preferred_language: str | None = Field(
        title="Preferred language for GenAI Response",
        description="Preferred language to request from the GenAI provider for generated responses.",
        default=None,
    )
    activity_context_prompt: str = Field(
        default="""### Normal Activity Indicators (Level 0)
- Known/verified people in any zone at any time
- People with pets in residential areas
- Routine residential vehicle access during daytime/evening (6 AM - 10 PM): entering, exiting, loading/unloading items — normal commute and travel patterns
- Deliveries or services during daytime/evening (6 AM - 10 PM): carrying packages to doors/porches, placing items, leaving
- Services/maintenance workers with visible tools, uniforms, or service vehicles during daytime
- Activity confined to public areas only (sidewalks, streets) without entering property at any time

### Suspicious Activity Indicators (Level 1)
- **Checking or probing vehicle/building access**: trying handles without entering, peering through windows, examining multiple vehicles, or possessing break-in tools — Level 1
- **Unidentified person in private areas (driveways, near vehicles/buildings) during late night/early morning (11 PM - 5 AM)** — ALWAYS Level 1 regardless of activity or duration
- Taking items that don't belong to them (packages, objects from porches/driveways)
- Climbing or jumping fences/barriers to access property
- Attempting to conceal actions or items from view
- Prolonged loitering: remaining in same area without visible purpose throughout most of the sequence

### Critical Threat Indicators (Level 2)
- Holding break-in tools (crowbars, pry bars, bolt cutters)
- Weapons visible (guns, knives, bats used aggressively)
- Forced entry in progress
- Physical aggression or violence
- Active property damage or theft in progress

### Assessment Guidance
Evaluate in this order:

1. **If person is verified/known** → Level 0 regardless of time or activity
2. **If person is unidentified:**
   - Check time: If late night/early morning (11 PM - 5 AM) AND in private areas (driveways, near vehicles/buildings) → Level 1
   - Check actions: If probing access (trying handles without entering, checking multiple vehicles), taking items, climbing → Level 1
   - Otherwise, if daytime/evening (6 AM - 10 PM) with clear legitimate purpose (delivery, service, routine vehicle access) → Level 0
3. **Escalate to Level 2 if:** Weapons, break-in tools, forced entry in progress, violence, or active property damage visible (escalates from Level 0 or 1)

The mere presence of an unidentified person in private areas during late night hours is inherently suspicious and warrants human review, regardless of what activity they appear to be doing or how brief the sequence is.""",
        title="Custom activity context prompt defining normal and suspicious activity patterns for this property",
        description="Custom prompt describing what is and is not suspicious activity to provide context for GenAI summaries.",
    )


class ReviewConfig(FrigateBaseModel):
    alerts: AlertsConfig = Field(
        default_factory=AlertsConfig,
        title="Review alerts config",
        description="Settings for which tracked objects generate alerts and how alerts are retained.",
    )
    detections: DetectionsConfig = Field(
        default_factory=DetectionsConfig,
        title="Review detections config",
        description="Settings for creating detection events (non-alert) and how long to keep them.",
    )
    genai: GenAIReviewConfig = Field(
        default_factory=GenAIReviewConfig,
        title="Review description genai config",
        description="Controls use of generative AI for producing descriptions and summaries of review items.",
    )
