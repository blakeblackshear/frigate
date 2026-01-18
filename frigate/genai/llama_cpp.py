"""llama.cpp Provider for Frigate AI."""

import base64
import logging
from typing import Any, Optional

import requests

from frigate.config import GenAIProviderEnum
from frigate.genai import GenAIClient, register_genai_provider

logger = logging.getLogger(__name__)


@register_genai_provider(GenAIProviderEnum.llamacpp)
class LlamaCppClient(GenAIClient):
    """Generative AI client for Frigate using llama.cpp server."""

    LOCAL_OPTIMIZED_OPTIONS = {
        "temperature": 0.7,
        "repeat_penalty": 1.05,
        "top_p": 0.8,
    }

    provider: str  # base_url
    provider_options: dict[str, Any]

    def _init_provider(self):
        """Initialize the client."""
        self.provider_options = {
            **self.LOCAL_OPTIMIZED_OPTIONS,
            **self.genai_config.provider_options,
        }
        return (
            self.genai_config.base_url.rstrip("/")
            if self.genai_config.base_url
            else None
        )

    def _send(self, prompt: str, images: list[bytes]) -> Optional[str]:
        """Submit a request to llama.cpp server."""
        if self.provider is None:
            logger.warning(
                "llama.cpp provider has not been initialized, a description will not be generated. Check your llama.cpp configuration."
            )
            return None

        try:
            content = []
            for image in images:
                encoded_image = base64.b64encode(image).decode("utf-8")
                content.append(
                    {
                        "type": "image_url",
                        "image_url": {
                            "url": f"data:image/jpeg;base64,{encoded_image}",
                        },
                    }
                )
            content.append(
                {
                    "type": "text",
                    "text": prompt,
                }
            )

            # Build request payload with llama.cpp native options
            payload = {
                "messages": [
                    {
                        "role": "user",
                        "content": content,
                    },
                ],
                **self.provider_options,
            }

            response = requests.post(
                f"{self.provider}/v1/chat/completions",
                json=payload,
                timeout=self.timeout,
            )
            response.raise_for_status()
            result = response.json()

            if (
                result is not None
                and "choices" in result
                and len(result["choices"]) > 0
            ):
                choice = result["choices"][0]
                if "message" in choice and "content" in choice["message"]:
                    return choice["message"]["content"].strip()
            return None
        except Exception as e:
            logger.warning("llama.cpp returned an error: %s", str(e))
            return None

    def get_context_size(self) -> int:
        """Get the context window size for llama.cpp."""
        return self.genai_config.provider_options.get("context_size", 4096)
