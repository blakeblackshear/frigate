"""Generative AI module for Frigate."""

import importlib
import json
import logging
import os
from typing import Any, Optional

from playhouse.shortcuts import model_to_dict

from frigate.config import CameraConfig, FrigateConfig, GenAIConfig, GenAIProviderEnum
from frigate.models import Event

logger = logging.getLogger(__name__)

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

    def generate_review_description(
        self, review_data: dict[str, Any], thumbnails: list[bytes]
    ) -> None:
        """Generate a description for the review item activity."""
        context_prompt = f"""
        Here is additional context about the scene from a security camera:
        {json.dumps(review_data, indent=2)}

        Please analyze the image(s), which are in chronological order, strictly from the perspective of a security camera.
        Your task is to provide a **neutral, factual, and objective description** of the scene.
        **Do not make assumptions about intent, emotions, or potential threats.**
        Focus solely on observable actions, visible entities, and the environment.

        Describe:
        - What is happening?
        - Who or what is visible?
        - What are the entities doing?
        - What is the environmental context (e.g., time of day, weather, lighting)?
    """
        logger.info(f"processing {review_data}")
        logger.info(f"Got GenAI review: {self._send(context_prompt, thumbnails)}")

    def generate_object_description(
        self,
        camera_config: CameraConfig,
        thumbnails: list[bytes],
        event: Event,
    ) -> Optional[str]:
        """Generate a description for the frame."""
        prompt = camera_config.objects.genai.object_prompts.get(
            event.label,
            camera_config.objects.genai.prompt,
        ).format(**model_to_dict(event))
        logger.debug(f"Sending images to genai provider with prompt: {prompt}")
        return self._send(prompt, thumbnails)

    def _init_provider(self):
        """Initialize the client."""
        return None

    def _send(self, prompt: str, images: list[bytes]) -> Optional[str]:
        """Submit a request to the provider."""
        return None


def get_genai_client(config: FrigateConfig) -> Optional[GenAIClient]:
    """Get the GenAI client."""
    load_providers()
    provider = PROVIDERS.get(config.genai.provider)
    if provider:
        return provider(config.genai)

    return None


def load_providers():
    package_dir = os.path.dirname(__file__)
    for filename in os.listdir(package_dir):
        if filename.endswith(".py") and filename != "__init__.py":
            module_name = f"frigate.genai.{filename[:-3]}"
            importlib.import_module(module_name)
