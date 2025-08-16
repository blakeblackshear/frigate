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

    enabled_in_config: Optional[bool] = Field(
        default=None, title="Keep track of original state of detections."
    )

    @field_validator("required_zones", mode="before")
    @classmethod
    def validate_required_zones(cls, v):
        if isinstance(v, str) and "," not in v:
            return [v]

        return v


class ReviewConfig(FrigateBaseModel):
    """Configure reviews"""

    alerts: AlertsConfig = Field(
        default_factory=AlertsConfig, title="Review alerts config."
    )
    detections: DetectionsConfig = Field(
        default_factory=DetectionsConfig, title="Review detections config."
    )
