"""Onboarding configuration for first-time setup wizard."""

from pydantic import Field

from frigate.config.base import FrigateBaseModel


class OnboardingConfig(FrigateBaseModel):
    setup_complete: bool = Field(
        default=False,
        title="Setup complete",
        description="Set to true after the first-time setup wizard is completed or dismissed.",
    )
