"""Ollama embedding client for Frigate."""

import logging
from typing import Optional

from httpx import TimeoutException
from ollama import Client as ApiClient
from ollama import ResponseError

from frigate.config import SemanticSearchProviderEnum
from frigate.embeddings.remote import (
    RemoteEmbeddingClient,
    register_embedding_provider,
)

logger = logging.getLogger(__name__)


@register_embedding_provider(SemanticSearchProviderEnum.ollama)
class OllamaEmbeddingClient(RemoteEmbeddingClient):
    """Remote embedding client for Frigate using Ollama."""

    provider: ApiClient

    def _init_provider(self):
        """Initialize the client."""
        try:
            client = ApiClient(
                host=self.config.semantic_search.remote.url, timeout=self.timeout
            )
            # ensure the model is available locally
            response = client.show(self.config.semantic_search.remote.model)
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

    def embed_texts(self, texts: list[str]) -> Optional[list[list[float]]]:
        """Get embeddings for a list of texts."""
        if self.provider is None:
            logger.warning(
                "Ollama provider has not been initialized, embeddings will not be generated. Check your Ollama configuration."
            )
            return None
        try:
            embeddings = []
            for text in texts:
                result = self.provider.embeddings(
                    model=self.config.semantic_search.remote.model,
                    prompt=text,
                )
                embeddings.append(result["embedding"])
            return embeddings
        except (TimeoutException, ResponseError, ConnectionError) as e:
            logger.warning("Ollama returned an error: %s", str(e))
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
