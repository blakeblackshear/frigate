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
        try:
            client = ApiClient(host=self.genai_config.base_url, timeout=self.timeout)
            # ensure the model is available locally
            response = client.show(self.genai_config.model)
            if response.get("error"):
                logger.error(
                    "Ollama error: %s",
                    response["error"],
                )
                return None
            return client
        except Exception as e:
            logger.warning("Error initializing Ollama: %s", str(e))
            return None

    def _send(self, prompt: str, images: list[bytes]) -> Optional[str]:
        """Submit a request to Ollama"""
        if self.provider is None:
            logger.warning(
                "Ollama provider has not been initialized, a description will not be generated. Check your Ollama configuration."
            )
            return None
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
