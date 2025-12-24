"""Ollama Provider for Frigate AI."""

import logging
from typing import Any, Optional

from httpx import RemoteProtocolError, TimeoutException
from ollama import Client as ApiClient
from ollama import ResponseError

from frigate.config import GenAIProviderEnum
from frigate.genai import GenAIClient, register_genai_provider

logger = logging.getLogger(__name__)


@register_genai_provider(GenAIProviderEnum.ollama)
class OllamaClient(GenAIClient):
    """Generative AI client for Frigate using Ollama."""

    LOCAL_OPTIMIZED_OPTIONS = {
        "options": {
            "temperature": 0.5,
            "repeat_penalty": 1.05,
            "presence_penalty": 0.3,
        },
    }

    provider: ApiClient
    provider_options: dict[str, Any]

    def _init_provider(self):
        """Initialize the client."""
        self.provider_options = {
            **self.LOCAL_OPTIMIZED_OPTIONS,
            **self.genai_config.provider_options,
        }

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
                images=images if images else None,
                **self.provider_options,
            )
            logger.debug(
                f"Ollama tokens used: eval_count={result.get('eval_count')}, prompt_eval_count={result.get('prompt_eval_count')}"
            )
            return result["response"].strip()
        except (
            TimeoutException,
            ResponseError,
            RemoteProtocolError,
            ConnectionError,
        ) as e:
            logger.warning("Ollama returned an error: %s", str(e))
            return None

    def get_context_size(self) -> int:
        """Get the context window size for Ollama."""
        return self.genai_config.provider_options.get("options", {}).get(
            "num_ctx", 4096
        )
