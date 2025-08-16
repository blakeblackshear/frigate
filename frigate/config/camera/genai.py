from enum import Enum
from typing import Optional, Union

from pydantic import BaseModel, Field, field_validator

from ..base import FrigateBaseModel
from ..env import EnvString

__all__ = ["GenAIConfig", "GenAICameraConfig", "GenAIProviderEnum"]


class GenAIProviderEnum(str, Enum):
    openai = "openai"
    azure_openai = "azure_openai"
    gemini = "gemini"
    ollama = "ollama"


class GenAISendTriggersConfig(BaseModel):
    tracked_object_end: bool = Field(
        default=True, title="Send once the object is no longer tracked."
    )
    after_significant_updates: Optional[int] = Field(
        default=None,
        title="Send an early request to generative AI when X frames accumulated.",
        ge=1,
    )


# uses BaseModel because some global attributes are not available at the camera level
class GenAICameraConfig(BaseModel):
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
    send_triggers: GenAISendTriggersConfig = Field(
        default_factory=GenAISendTriggersConfig,
        title="What triggers to use to send frames to generative AI for a tracked object.",
    )

    @field_validator("required_zones", mode="before")
    @classmethod
    def validate_required_zones(cls, v):
        if isinstance(v, str) and "," not in v:
            return [v]

        return v


class GenAIConfig(FrigateBaseModel):
    enabled: bool = Field(default=False, title="Enable GenAI.")
    prompt: str = Field(
        default="Analyze the sequence of images containing the {label}. Focus on the likely intent or behavior of the {label} based on its actions and movement, rather than describing its appearance or the surroundings. Consider what the {label} is doing, why, and what it might do next.",
        title="Default caption prompt.",
    )
    object_prompts: dict[str, str] = Field(
        default_factory=dict, title="Object specific prompts."
    )

    api_key: Optional[EnvString] = Field(default=None, title="Provider API key.")
    base_url: Optional[str] = Field(default=None, title="Provider base url.")
    model: str = Field(default="gpt-4o", title="GenAI model.")
    provider: GenAIProviderEnum = Field(
        default=GenAIProviderEnum.openai, title="GenAI provider."
    )
