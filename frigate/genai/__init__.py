"""Generative AI module for Frigate."""

import importlib
import os
from typing import Optional

from playhouse.shortcuts import model_to_dict

from frigate.config import CameraConfig, GenAIConfig, GenAIProviderEnum
from frigate.models import Event

PROVIDERS = {}


def register_genai_provider(key: GenAIProviderEnum):
    """Register a GenAI provider."""

    def decorator(cls):
        PROVIDERS[key] = cls
        return cls

    return decorator


class GenAIClient:
    """Generative AI client for Frigate."""

    def __init__(self, genai_config: GenAIConfig, timeout: int = 60) -> None:
        self.genai_config: GenAIConfig = genai_config
        self.timeout = timeout
        self.provider = self._init_provider()

    def generate_description(
        self,
        camera_config: CameraConfig,
        thumbnails: list[bytes],
        event: Event,
    ) -> Optional[str]:
        """Generate a description for the frame."""
        prompt = camera_config.genai.object_prompts.get(
            event.label,
            camera_config.genai.prompt,
        ).format(**model_to_dict(event))
        return self._send(prompt, thumbnails)

    def _init_provider(self):
        """Initialize the client."""
        return None

    def _send(self, prompt: str, images: list[bytes]) -> Optional[str]:
        """Submit a request to the provider."""
        return None


def get_genai_client(genai_config: GenAIConfig) -> Optional[GenAIClient]:
    """Get the GenAI client."""
    if genai_config.enabled:
        load_providers()
        provider = PROVIDERS.get(genai_config.provider)
        if provider:
            return provider(genai_config)
    return None


def load_providers():
    package_dir = os.path.dirname(__file__)
    for filename in os.listdir(package_dir):
        if filename.endswith(".py") and filename != "__init__.py":
            module_name = f"frigate.genai.{filename[:-3]}"
            importlib.import_module(module_name)
