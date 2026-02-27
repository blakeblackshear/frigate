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
    context_size: Optional[int] = None

    def _init_provider(self):
        """Initialize the client."""
        # Extract context_size from provider_options as it's not a valid OpenAI client parameter
        # It will be used in get_context_size() instead
        provider_opts = {
            k: v
            for k, v in self.genai_config.provider_options.items()
            if k != "context_size"
        }
        return OpenAI(api_key=self.genai_config.api_key, **provider_opts)

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
                **self.genai_config.runtime_options,
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

    def get_context_size(self) -> int:
        """Get the context window size for OpenAI."""
        if self.context_size is not None:
            return self.context_size

        # First check provider_options for manually specified context size
        # This is necessary for llama.cpp and other OpenAI-compatible servers
        # that don't expose the configured runtime context size in the API response
        if "context_size" in self.genai_config.provider_options:
            self.context_size = self.genai_config.provider_options["context_size"]
            logger.debug(
                f"Using context size {self.context_size} from provider_options for model {self.genai_config.model}"
            )
            return self.context_size

        try:
            models = self.provider.models.list()
            for model in models.data:
                if model.id == self.genai_config.model:
                    if hasattr(model, "max_model_len") and model.max_model_len:
                        self.context_size = model.max_model_len
                        logger.debug(
                            f"Retrieved context size {self.context_size} for model {self.genai_config.model}"
                        )
                        return self.context_size

        except Exception as e:
            logger.debug(
                f"Failed to fetch model context size from API: {e}, using default"
            )

        # Default to 128K for ChatGPT models, 8K for others
        model_name = self.genai_config.model.lower()
        if "gpt" in model_name:
            self.context_size = 128000
        else:
            self.context_size = 8192

        logger.debug(
            f"Using default context size {self.context_size} for model {self.genai_config.model}"
        )
        return self.context_size
