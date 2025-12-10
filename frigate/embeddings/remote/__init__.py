"""Remote embedding clients for Frigate."""

import importlib
import logging
import os
from typing import Any, Optional

from frigate.config import FrigateConfig, SemanticSearchConfig, SemanticSearchProviderEnum
from frigate.genai import get_genai_client

logger = logging.getLogger(__name__)

PROVIDERS = {}


def register_embedding_provider(key: SemanticSearchProviderEnum):
    """Register a remote embedding provider."""

    def decorator(cls):
        PROVIDERS[key] = cls
        return cls

    return decorator


class RemoteEmbeddingClient:
    """Remote embedding client for Frigate."""

    def __init__(self, config: FrigateConfig, timeout: int = 120) -> None:
        self.config = config
        self.timeout = timeout
        self.provider = self._init_provider()
        self.genai_client = get_genai_client(self.config)

    def _init_provider(self):
        """Initialize the client."""
        return None

    def embed_texts(self, texts: list[str]) -> Optional[list[list[float]]]:
        """Get embeddings for a list of texts."""
        return None

    def embed_images(self, images: list[bytes]) -> Optional[list[list[float]]]:
        """Get embeddings for a list of images."""
        return None



def get_embedding_client(config: FrigateConfig) -> Optional[RemoteEmbeddingClient]:
    """Get the embedding client."""
    if not config.semantic_search.provider or config.semantic_search.provider == SemanticSearchProviderEnum.local:
        return None

    load_providers()
    provider = PROVIDERS.get(config.semantic_search.provider)
    if provider:
        return provider(config)

    return None


def load_providers():
    package_dir = os.path.dirname(__file__)
    for filename in os.listdir(package_dir):
        if filename.endswith(".py") and filename != "__init__.py":
            module_name = f"frigate.embeddings.remote.{filename[:-3]}"
            importlib.import_module(module_name)
