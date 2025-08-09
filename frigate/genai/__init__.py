"""Generative AI module for Frigate."""

import importlib
import logging
import os
from typing import Any, Optional

from playhouse.shortcuts import model_to_dict

from frigate.config import CameraConfig, FrigateConfig, GenAIConfig, GenAIProviderEnum
from frigate.data_processing.post.types import ReviewMetadata
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
        Please analyze the image(s), which are in chronological order, strictly from the perspective of the {review_data['camera'].replace('_', ' ')} security camera.
        Your task is to provide a **neutral, factual, and objective description** of the scene and the objects interacting with it.
        Focus solely on observable actions, visible entities, and the environment.

        Here is some information we already know:
        - the following activity occurred at {review_data['timestamp'].strftime('%I:%M %p')}
        - the following objects were detected: {review_data['objects']}
        - the following recognized objects were detected: {review_data['recognized_objects']}
        - the activity happened in the following zones: {review_data['zones']}

        Your response **MUST** be a flat JSON object with the following fields:
        - `scene` (string): A single, comprehensive description of the entire visual scene.
        - `action` (string): A single description of any key actions or movements.
        - `potential_threat_level` (integer, optional): An integer from 0 to 3. Only include if a clear security concern is visible. Omit if no threat.

        **IMPORTANT:** The value for each field (e.g., "scene", "action") must be a plain string or integer, NOT another JSON object or a description of the field itself.

        Provide the response in the exact JSON format specified by this schema:
        {ReviewMetadata.model_json_schema()['properties']}
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
