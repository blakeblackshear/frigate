"""Gemini Provider for Frigate AI."""

import logging
from typing import Optional

import google.generativeai as genai
from google.api_core.exceptions import GoogleAPICallError

from frigate.config import GenAIProviderEnum
from frigate.genai import GenAIClient, register_genai_provider

logger = logging.getLogger(__name__)


@register_genai_provider(GenAIProviderEnum.gemini)
class GeminiClient(GenAIClient):
    """Generative AI client for Frigate using Gemini."""

    provider: genai.GenerativeModel

    def _init_provider(self):
        """Initialize the client."""
        genai.configure(api_key=self.genai_config.api_key)
        return genai.GenerativeModel(
            self.genai_config.model, **self.genai_config.provider_options
        )

    def _send(self, prompt: str, images: list[bytes]) -> Optional[str]:
        """Submit a request to Gemini."""
        data = [
            {
                "mime_type": "image/jpeg",
                "data": img,
            }
            for img in images
        ] + [prompt]
        try:
            # Merge runtime_options into generation_config if provided
            generation_config_dict = {"candidate_count": 1}
            generation_config_dict.update(self.genai_config.runtime_options)

            response = self.provider.generate_content(
                data,
                generation_config=genai.types.GenerationConfig(
                    **generation_config_dict
                ),
                request_options=genai.types.RequestOptions(
                    timeout=self.timeout,
                ),
            )
        except GoogleAPICallError as e:
            logger.warning("Gemini returned an error: %s", str(e))
            return None
        try:
            description = response.text.strip()
        except ValueError:
            # No description was generated
            return None
        return description

    def get_context_size(self) -> int:
        """Get the context window size for Gemini."""
        # Gemini Pro Vision has a 1M token context window
        return 1000000
