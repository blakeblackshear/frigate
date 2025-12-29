from enum import Enum
from typing import Any, Optional

from pydantic import Field

from ..base import FrigateBaseModel
from ..env import EnvString

__all__ = ["GenAIProviderConfig", "GenAIProviderEnum"]


class GenAIProviderEnum(str, Enum):
    openai = "openai"
    azure_openai = "azure_openai"
    gemini = "gemini"
    ollama = "ollama"


class GenAIProviderConfig(FrigateBaseModel):
    """Primary GenAI Config to define GenAI Provider."""

    name: str = Field(default="default", title="Provider Name")
    api_key: Optional[EnvString] = Field(default=None, title="Provider API key.")
    base_url: Optional[str] = Field(default=None, title="Provider base url.")
    model: str = Field(default="gpt-4o", title="GenAI model.")
    provider: GenAIProviderEnum | None = Field(default=None, title="GenAI provider.")
    provider_options: dict[str, Any] = Field(
        default={}, title="GenAI Provider extra options."
    )
