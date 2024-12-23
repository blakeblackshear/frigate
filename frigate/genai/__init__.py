"""Generative AI module for Frigate."""

import importlib
import logging
import os
from typing import Optional

import cv2
import numpy as np
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

        if self.genai_config.blur_faces:
            self.face_cascade_classifier = cv2.CascadeClassifier(
                cv2.data.haarcascades + "/haarcascade_frontalface_alt.xml"
            )
            self.face_profile_cascade_classifier = cv2.CascadeClassifier(
                cv2.data.haarcascades + "/haarcascade_profileface.xml"
            )

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
        if self.genai_config.blur_faces:
            self.blur_faces(thumbnails)
        logger.debug(f"Sending images to genai provider with prompt: {prompt}")
        return self._send(prompt, thumbnails)

    def _init_provider(self):
        """Initialize the client."""
        return None

    def _send(self, prompt: str, images: list[bytes]) -> Optional[str]:
        """Submit a request to the provider."""
        return None

    def blur_faces(self, thumbnails: list[bytes]):
        for thumb in thumbnails:
            image = cv2.imdecode(np.frombuffer(thumb, dtype=np.int8), cv2.IMREAD_COLOR)

            gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)

            face_data = self.face_cascade_classifier.detectMultiScale(
                image=gray, scaleFactor=1.1, minNeighbors=2, minSize=(25, 25)
            )

            face_profile_data = self.face_profile_cascade_classifier.detectMultiScale(
                image=gray, scaleFactor=1.1, minNeighbors=2, minSize=(25, 25)
            )

            for x, y, w, h in face_data:
                roi = image[y : y + h, x : x + w]
                roi = cv2.blur(roi, (30, 30), 0)
                image[y : y + h, x : x + w] = roi

            for x, y, w, h in face_profile_data:
                roi = image[y : y + h, x : x + w]
                roi = cv2.blur(roi, (30, 30), 0)
                image[y : y + h, x : x + w] = roi


def get_genai_client(config: FrigateConfig) -> Optional[GenAIClient]:
    """Get the GenAI client."""
    genai_config = config.genai
    genai_cameras = [
        c for c in config.cameras.values() if c.enabled and c.genai.enabled
    ]

    if genai_cameras:
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
