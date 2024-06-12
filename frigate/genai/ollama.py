"""Ollama Provider for Frigate AI."""

from typing import Optional

from ollama import Client as ApiClient
from ollama import ResponseError

from frigate.config import GenAIProviderEnum
from frigate.genai import GenAIClient, register_genai_provider


@register_genai_provider(GenAIProviderEnum.ollama)
class OllamaClient(GenAIClient):
    """Generative AI client for Frigate using Ollama."""

    provider: ApiClient

    def _init_provider(self):
        """Initialize the client."""
        return ApiClient(host=self.genai_config.base_url)

    def _send(self, prompt: str, images: list[bytes]) -> Optional[str]:
        """Submit a request to Ollama."""
        try:
            result = self.provider.generate(
                self.genai_config.model,
                prompt,
                images=images,
            )
            return result["response"].strip()
        except ResponseError:
            return None
