from enum import Enum
from typing import Any, Optional

from pydantic import Field

from ..base import FrigateBaseModel
from ..env import EnvString

__all__ = ["GenAIConfig", "GenAIProviderEnum", "GenAIRoleEnum"]


class GenAIProviderEnum(str, Enum):
    openai = "openai"
    azure_openai = "azure_openai"
    gemini = "gemini"
    ollama = "ollama"
    llamacpp = "llamacpp"


class GenAIRoleEnum(str, Enum):
    tools = "tools"
    vision = "vision"
    embeddings = "embeddings"


class GenAIConfig(FrigateBaseModel):
    """Primary GenAI Config to define GenAI Provider."""

    api_key: Optional[EnvString] = Field(
        default=None,
        title="API key",
        description="API key required by some providers (can also be set via environment variables).",
    )
    base_url: Optional[str] = Field(
        default=None,
        title="Base URL",
        description="Base URL for self-hosted or compatible providers (for example an Ollama instance).",
    )
    model: str = Field(
        default="gpt-4o",
        title="Model",
        description="The model to use from the provider for generating descriptions or summaries.",
    )
    provider: GenAIProviderEnum | None = Field(
        default=None,
        title="Provider",
        description="The GenAI provider to use (for example: ollama, gemini, openai).",
    )
    roles: list[GenAIRoleEnum] = Field(
        default_factory=lambda: [
            GenAIRoleEnum.embeddings,
            GenAIRoleEnum.vision,
            GenAIRoleEnum.tools,
        ],
        title="Roles",
        description="GenAI roles (tools, vision, embeddings); one provider per role.",
    )
    provider_options: dict[str, Any] = Field(
        default={},
        title="Provider options",
        description="Additional provider-specific options to pass to the GenAI client.",
        json_schema_extra={"additionalProperties": {"type": "string"}},
    )
    runtime_options: dict[str, Any] = Field(
        default={},
        title="Runtime options",
        description="Runtime options passed to the provider for each inference call.",
        json_schema_extra={"additionalProperties": {"type": "string"}},
    )
    runtime_options: dict[str, Any] = Field(
        default={}, title="Options to pass during inference calls."
    )
