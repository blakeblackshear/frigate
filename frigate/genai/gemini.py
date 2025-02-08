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
        return genai.GenerativeModel(self.genai_config.model)

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
            response = self.provider.generate_content(
                data,
                generation_config=genai.types.GenerationConfig(
                    candidate_count=1,
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
