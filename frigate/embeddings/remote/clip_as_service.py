"""Clip-as-service embedding client for Frigate."""

import base64
import logging
from typing import Optional

import requests

from frigate.config import SemanticSearchProviderEnum
from frigate.embeddings.remote import (
    RemoteEmbeddingClient,
    register_embedding_provider,
)

logger = logging.getLogger(__name__)


@register_embedding_provider(SemanticSearchProviderEnum.clip_as_service)
class ClipAsServiceEmbeddingClient(RemoteEmbeddingClient):
    """Remote embedding client for Frigate using clip-as-service."""

    def _init_provider(self):
        """Initialize the client."""
        return True

    def embed_texts(self, texts: list[str]) -> Optional[list[list[float]]]:
        """Get embeddings for a list of texts."""
        if not self.config.semantic_search.remote.url:
            logger.error("Clip-as-service URL is not configured.")
            return None

        payload = {
            "data": [{"text": t} for t in texts],
            "exec_endpoint": "/"
        }

        try:
            response = requests.post(
                f"{self.config.semantic_search.remote.url}/post",
                json=payload,
                timeout=self.timeout,
            )
            response.raise_for_status()
            data = response.json()
            if "data" in data:
                return [item["embedding"] for item in data["data"]]
            return None
        except Exception as e:
            logger.warning("Clip-as-service error: %s", str(e))
            return None

    def embed_images(self, images: list[bytes]) -> Optional[list[list[float]]]:
        """Get embeddings for a list of images."""
        if not self.config.semantic_search.remote.url:
            logger.error("Clip-as-service URL is not configured.")
            return None

        payload_data = []
        for img_bytes in images:
            b64_str = base64.b64encode(img_bytes).decode("utf-8")
            payload_data.append({"blob": b64_str})

        payload = {
            "data": payload_data,
            "exec_endpoint": "/"
        }

        try:
            response = requests.post(
                f"{self.config.semantic_search.remote.url}/post",
                json=payload,
                timeout=self.timeout,
            )
            response.raise_for_status()
            data = response.json()
            if "data" in data:
                return [item["embedding"] for item in data["data"]]
            return None
        except Exception as e:
            logger.warning("Clip-as-service error: %s", str(e))
            return None
