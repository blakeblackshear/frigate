from enum import Enum
from typing import Any, Self

from pydantic import Field, model_validator

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
    chat = "chat"
    descriptions = "descriptions"
    embeddings = "embeddings"
    transcribe = "transcribe"


# Providers that can accept audio input for the transcribe role. Ollama has no
# audio input support, so claiming the role there would fail at request time.
TRANSCRIBE_CAPABLE_PROVIDERS = {
    GenAIProviderEnum.openai,
    GenAIProviderEnum.azure_openai,
    GenAIProviderEnum.gemini,
    GenAIProviderEnum.llamacpp,
}


class GenAIConfig(FrigateBaseModel):
    """Primary GenAI Config to define GenAI Provider."""

    api_key: EnvString | None = Field(
        default=None,
        title="API key",
        description="API key required by some providers (can also be set via environment variables).",
    )
    base_url: str | None = Field(
        default=None,
        title="Base URL",
        description="Base URL for self-hosted or compatible providers (for example an Ollama instance).",
    )
    model: str = Field(
        default="",
        title="Model",
        description="The model to use from the provider for generating descriptions or summaries.",
    )
    provider: GenAIProviderEnum = Field(
        title="Provider",
        description="The GenAI provider to use (for example: ollama, gemini, openai).",
    )
    roles: list[GenAIRoleEnum] = Field(
        default_factory=lambda: [
            GenAIRoleEnum.embeddings,
            GenAIRoleEnum.descriptions,
            GenAIRoleEnum.chat,
        ],
        title="Roles",
        description="GenAI roles (chat, descriptions, embeddings, transcribe); one provider per role. Only chat, descriptions, and embeddings are granted by default; transcribe must be listed explicitly.",
    )
    provider_options: dict[str, Any] = Field(
        default={},
        title="Provider options",
        description="Additional provider-specific options to pass to the GenAI client.",
        json_schema_extra={"additionalProperties": {}},
    )
    runtime_options: dict[str, Any] = Field(
        default={},
        title="Runtime options",
        description="Runtime options passed to the provider for each inference call.",
        json_schema_extra={"additionalProperties": {}},
    )

    @model_validator(mode="after")
    def validate_transcribe_provider(self) -> Self:
        """Reject the transcribe role on providers that cannot accept audio input."""
        if (
            GenAIRoleEnum.transcribe in self.roles
            and self.provider not in TRANSCRIBE_CAPABLE_PROVIDERS
        ):
            raise ValueError(
                f"GenAI provider '{self.provider.value}' does not support audio input "
                "and cannot be given the 'transcribe' role."
            )

        return self
