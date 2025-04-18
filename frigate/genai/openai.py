"""OpenAI Provider for Frigate AI."""

import base64
import logging
from typing import Optional

from httpx import TimeoutException
from openai import OpenAI

from frigate.config import GenAIProviderEnum
from frigate.genai import GenAIClient, register_genai_provider

logger = logging.getLogger(__name__)


@register_genai_provider(GenAIProviderEnum.openai)
class OpenAIClient(GenAIClient):
    """Generative AI client for Frigate using OpenAI."""

    provider: OpenAI

    def _init_provider(self):
        """Initialize the client."""
        return OpenAI(api_key=self.genai_config.api_key)

    def _send(self, prompt: str, images: list[bytes]) -> Optional[str]:
        """Submit a request to OpenAI."""
        encoded_images = [base64.b64encode(image).decode("utf-8") for image in images]
        messages_content = []
        for image in encoded_images:
            messages_content.append(
                {
                    "type": "image_url",
                    "image_url": {
                        "url": f"data:image/jpeg;base64,{image}",
                        "detail": "low",
                    },
                }
            )
        messages_content.append(
            {
                "type": "text",
                "text": prompt,
            }
        )
        try:
            result = self.provider.chat.completions.create(
                model=self.genai_config.model,
                messages=[
                    {
                        "role": "user",
                        "content": messages_content,
                    },
                ],
                timeout=self.timeout,
            )
            if (
                result is not None
                and hasattr(result, "choices")
                and len(result.choices) > 0
            ):
                return result.choices[0].message.content.strip()
            return None
        except (TimeoutException, Exception) as e:
            logger.warning("OpenAI returned an error: %s", str(e))
            return None
