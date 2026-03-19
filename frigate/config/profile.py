"""Top-level profile definition configuration."""

from pydantic import Field

from .base import FrigateBaseModel

__all__ = ["ProfileDefinitionConfig"]


class ProfileDefinitionConfig(FrigateBaseModel):
    """Defines a named profile with a human-readable display name.

    The dict key is the machine name used internally; friendly_name
    is the label shown in the UI and API responses.
    """

    friendly_name: str = Field(
        title="Friendly name",
        description="Display name for this profile shown in the UI.",
    )
