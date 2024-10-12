"""Ollama Provider for Frigate AI."""

import logging
from typing import Optional

from httpx import TimeoutException
from ollama import Client as ApiClient
from ollama import ResponseError

from frigate.config import GenAIProviderEnum
from frigate.genai import GenAIClient, register_genai_provider

logger = logging.getLogger(__name__)


@register_genai_provider(GenAIProviderEnum.ollama)
class OllamaClient(GenAIClient):
    """Generative AI client for Frigate using Ollama."""

    provider: ApiClient

    def _init_provider(self):
        """Initialize the client."""
        client = ApiClient(host=self.genai_config.base_url, timeout=self.timeout)
        response = client.pull(self.genai_config.model)
        if response["status"] != "success":
            logger.error("Failed to pull %s model from Ollama", self.genai_config.model)
            return None
        return client

    def _send(self, prompt: str, images: list[bytes]) -> Optional[str]:
        """Submit a request to Ollama"""
        try:
            result = self.provider.generate(
                self.genai_config.model,
                prompt,
                images=images,
            )
            return result["response"].strip()
        except (TimeoutException, ResponseError) as e:
            logger.warning("Ollama returned an error: %s", str(e))
            return None
