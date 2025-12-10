"""OpenAI embedding client for Frigate."""

import base64
import logging
from typing import Optional

from httpx import TimeoutException
from openai import OpenAI

from frigate.config import SemanticSearchProviderEnum
from frigate.embeddings.remote import (
    RemoteEmbeddingClient,
    register_embedding_provider,
)

logger = logging.getLogger(__name__)


@register_embedding_provider(SemanticSearchProviderEnum.openai)
class OpenAIEmbeddingClient(RemoteEmbeddingClient):
    """Remote embedding client for Frigate using OpenAI."""

    provider: OpenAI

    def _init_provider(self):
        """Initialize the client."""
        return OpenAI(
            api_key=self.config.semantic_search.remote.api_key,
            base_url=self.config.semantic_search.remote.url,
        )

    def embed_texts(self, texts: list[str]) -> Optional[list[list[float]]]:
        """Get embeddings for a list of texts."""
        try:
            result = self.provider.embeddings.create(
                model=self.config.semantic_search.remote.model,
                input=texts,
                timeout=self.timeout,
            )
            if (
                result is not None
                and hasattr(result, "data")
                and len(result.data) > 0
            ):
                return [embedding.embedding for embedding in result.data]
            return None
        except (TimeoutException, Exception) as e:
            logger.warning("OpenAI returned an error: %s", str(e))
            return None

    def embed_images(self, images: list[bytes]) -> Optional[list[list[float]]]:
        """Get embeddings for a list of images.

        This uses a two-step process:
        1. Generate a text description of the image using the configured GenAI provider.
        2. Create an embedding from the description using the text embedding model.
        """
        if not self.genai_client:
            logger.warning(
                "A GenAI provider is not configured. Cannot generate image descriptions."
            )
            return None

        descriptions = []
        for image in images:
            description = self.genai_client.generate_image_description(
                prompt=self.config.semantic_search.remote.vision_model_prompt,
                images=[image],
            )
            if description:
                descriptions.append(description)
            else:
                descriptions.append("")

        if not descriptions:
            return None

        return self.embed_texts(descriptions)
