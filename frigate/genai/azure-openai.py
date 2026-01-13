"""Azure OpenAI Provider for Frigate AI."""

import base64
import logging
from typing import Optional
from urllib.parse import parse_qs, urlparse

from openai import AzureOpenAI

from frigate.config import GenAIProviderEnum
from frigate.genai import GenAIClient, register_genai_provider

logger = logging.getLogger(__name__)


@register_genai_provider(GenAIProviderEnum.azure_openai)
class OpenAIClient(GenAIClient):
    """Generative AI client for Frigate using Azure OpenAI."""

    provider: AzureOpenAI

    def _init_provider(self):
        """Initialize the client."""
        try:
            parsed_url = urlparse(self.genai_config.base_url)
            query_params = parse_qs(parsed_url.query)
            api_version = query_params.get("api-version", [None])[0]
            azure_endpoint = f"{parsed_url.scheme}://{parsed_url.netloc}/"

            if not api_version:
                logger.warning("Azure OpenAI url is missing API version.")
                return None

        except Exception as e:
            logger.warning("Error parsing Azure OpenAI url: %s", str(e))
            return None

        return AzureOpenAI(
            api_key=self.genai_config.api_key,
            api_version=api_version,
            azure_endpoint=azure_endpoint,
        )

    def _send(self, prompt: str, images: list[bytes]) -> Optional[str]:
        """Submit a request to Azure OpenAI."""
        encoded_images = [base64.b64encode(image).decode("utf-8") for image in images]
        try:
            result = self.provider.chat.completions.create(
                model=self.genai_config.model,
                messages=[
                    {
                        "role": "user",
                        "content": [{"type": "text", "text": prompt}]
                        + [
                            {
                                "type": "image_url",
                                "image_url": {
                                    "url": f"data:image/jpeg;base64,{image}",
                                    "detail": "low",
                                },
                            }
                            for image in encoded_images
                        ],
                    },
                ],
                timeout=self.timeout,
                **self.genai_config.runtime_options,
            )
        except Exception as e:
            logger.warning("Azure OpenAI returned an error: %s", str(e))
            return None
        if len(result.choices) > 0:
            return result.choices[0].message.content.strip()
        return None

    def get_context_size(self) -> int:
        """Get the context window size for Azure OpenAI."""
        return 128000
