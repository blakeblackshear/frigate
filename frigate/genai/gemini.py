"""Gemini Provider for Frigate AI."""

import logging
from typing import Optional

from google import genai
from google.genai import errors, types

from frigate.config import GenAIProviderEnum
from frigate.genai import GenAIClient, register_genai_provider

logger = logging.getLogger(__name__)


@register_genai_provider(GenAIProviderEnum.gemini)
class GeminiClient(GenAIClient):
    """Generative AI client for Frigate using Gemini."""

    provider: genai.Client

    def _init_provider(self):
        """Initialize the client."""
        # Merge provider_options into HttpOptions
        http_options_dict = {
            "timeout": int(self.timeout * 1000),  # requires milliseconds
            "retry_options": types.HttpRetryOptions(
                attempts=3,
                initial_delay=1.0,
                max_delay=60.0,
                exp_base=2.0,
                jitter=1.0,
                http_status_codes=[429, 500, 502, 503, 504],
            ),
        }

        if isinstance(self.genai_config.provider_options, dict):
            http_options_dict.update(self.genai_config.provider_options)

        return genai.Client(
            api_key=self.genai_config.api_key,
            http_options=types.HttpOptions(**http_options_dict),
        )

    def _send(self, prompt: str, images: list[bytes]) -> Optional[str]:
        """Submit a request to Gemini."""
        contents = [
            types.Part.from_bytes(data=img, mime_type="image/jpeg") for img in images
        ] + [prompt]
        try:
            # Merge runtime_options into generation_config if provided
            generation_config_dict = {"candidate_count": 1}
            generation_config_dict.update(self.genai_config.runtime_options)

            response = self.provider.models.generate_content(
                model=self.genai_config.model,
                contents=contents,
                config=types.GenerateContentConfig(
                    **generation_config_dict,
                ),
            )
        except errors.APIError as e:
            logger.warning("Gemini returned an error: %s", str(e))
            return None
        except Exception as e:
            logger.warning("An unexpected error occurred with Gemini: %s", str(e))
            return None

        try:
            description = response.text.strip()
        except (ValueError, AttributeError):
            # No description was generated
            return None
        return description

    def get_context_size(self) -> int:
        """Get the context window size for Gemini."""
        # Gemini Pro Vision has a 1M token context window
        return 1000000
