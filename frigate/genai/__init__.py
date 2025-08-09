"""Generative AI module for Frigate."""

import importlib
import logging
import os
import re
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
    ) -> ReviewMetadata | None:
        """Generate a description for the review item activity."""
        context_prompt = f"""
        Please analyze the image(s), which are in chronological order, strictly from the perspective of the {review_data["camera"].replace("_", " ")} security camera.
        Your task is to provide a **neutral, factual, and objective description** of the scene, while also including **reasonable, evidence-based inferences** about the likely context or activity — but do not make unfounded assumptions.

        When forming your description:
        - Base all statements on visible details in the images.
        - You may deduce plausible intent or context only if supported by clear, observable evidence (e.g., someone carrying tools toward a car may indicate vehicle maintenance).
        - Avoid implying hostility, criminal intent, or other strong judgments unless the visual evidence is unambiguous.
        - Distinguish between what is certain (facts) and what appears likely (reasonable inference).

        Here is some information we already know:
        - The activity occurred at {review_data["timestamp"].strftime("%I:%M %p")}
        - The following objects were detected: {review_data["objects"]}
        - The following recognized objects were detected: {review_data["recognized_objects"]}
        - The activity happened in the following zones: {review_data["zones"]}

        Your response **MUST** be a flat JSON object with the following fields:
        - `scene` (string): A comprehensive description of the setting and entities, including relevant context and plausible inferences if supported by visual evidence.
        - `confidence` (float): A float between 0 and 1 representing your overall confidence in this analysis.
        - `potential_threat_level` (integer, optional): 1–3 scale. Only include if a clear security concern is visible:
        - 1 = Unusual but not overtly threatening
        - 2 = Suspicious or potentially harmful
        - 3 = Clear and immediate threat
        Omit this field entirely if there is no observable security concern.

        **IMPORTANT:**
        - Values for each field must be plain strings or integers — no nested objects or explanatory text.
        - The JSON must strictly match this structure:
        {ReviewMetadata.model_json_schema()["properties"]}
        """
        response = self._send(context_prompt, thumbnails)

        if response:
            clean_json = re.sub(
                r"\n?```$", "", re.sub(r"^```[a-zA-Z0-9]*\n?", "", response)
            )

            try:
                return ReviewMetadata.model_validate_json(clean_json)
            except Exception:
                # rarely LLMs can fail to follow directions on output format
                return None
        else:
            return None

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
