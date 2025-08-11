"""Generative AI module for Frigate."""

import datetime
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
        self,
        review_data: dict[str, Any],
        thumbnails: list[bytes],
        concerns: list[str],
        preferred_language: str | None,
    ) -> ReviewMetadata | None:
        """Generate a description for the review item activity."""
        if concerns:
            concern_list = "\n    - ".join(concerns)
            concern_prompt = f"""
- `other_concerns` (list of strings): Include a list of any of the following concerns that are occurring:
    - {concern_list}
"""

        else:
            concern_prompt = ""

        if preferred_language:
            language_prompt = f"Provide your answer in {preferred_language}"
        else:
            language_prompt = ""

        context_prompt = f"""
Please analyze the image(s), which are in chronological order, strictly from the perspective of the {review_data["camera"].replace("_", " ")} security camera.

Your task is to provide a **neutral, factual, and objective description** of the scene, while also:
- Clearly stating **what is happening** based on observable actions and movements.
- Including **reasonable, evidence-based inferences** about the likely activity or context, but only if directly supported by visible details.

When forming your description:
- **Facts first**: Describe the time, physical setting, people, and objects exactly as seen.
- **Then context**: Briefly note plausible purposes or activities (e.g., “appears to be delivering a package” if carrying a box to a door).
- Do not speculate beyond what is visible, and do not imply hostility, criminal intent, or other strong judgments unless there is unambiguous visual evidence.

Here is information already known:
- Activity occurred at {review_data["timestamp"].strftime("%I:%M %p")}
- Detected objects: {review_data["objects"]}
- Recognized objects: {review_data["recognized_objects"]}
- Zones involved: {review_data["zones"]}

Your response **MUST** be a flat JSON object with:
- `scene` (string): A full description including setting, entities, actions, and any plausible supported inferences.
- `confidence` (float): A number 0-1 for overall confidence in the analysis.
- `potential_threat_level` (integer, optional): Include only if there is a clear, observable security concern:
    - 0 = Normal activity is occurring
    - 1 = Unusual but not overtly threatening
    - 2 = Suspicious or potentially harmful
    - 3 = Clear and immediate threat
{concern_prompt}

**IMPORTANT:**
- Values must be plain strings, floats, or integers — no nested objects, no extra commentary.
{language_prompt}
        """
        logger.debug(
            f"Sending {len(thumbnails)} images to create review description on {review_data['camera']}"
        )
        response = self._send(context_prompt, thumbnails)

        if response:
            clean_json = re.sub(
                r"\n?```$", "", re.sub(r"^```[a-zA-Z0-9]*\n?", "", response)
            )

            try:
                return ReviewMetadata.model_validate_json(clean_json)
            except Exception as e:
                # rarely LLMs can fail to follow directions on output format
                logger.warning(
                    f"Failed to parse review description as the response did not match expected format. {e}"
                )
                return None
        else:
            return None

    def generate_review_summary(
        self, start_ts: float, end_ts: float, segments: list[dict[str, Any]]
    ) -> str | None:
        """Generate a summary of review item descriptions over a period of time."""
        time_range = f"{datetime.datetime.fromtimestamp(start_ts).strftime('%I:%M %p')} to {datetime.datetime.fromtimestamp(end_ts).strftime('%I:%M %p')}"
        timeline_summary_prompt = f"""
Analyze security camera metadata for {time_range} and write a professional security report.

INPUT FORMAT: JSON objects with "scene", "confidence", and "potential_threat_level" (0-3).

OUTPUT FORMAT:
Security Summary - {time_range}
[One sentence overview of general activity]

[Chronological timeline with timestamps when available]

[Final threat assessment statement]

REPORT REQUIREMENTS:
- Write chronologically using timestamps
- Highlight any potential_threat_level ≥ 2 incidents with times
- Note unusual events even if not threats
- State "only normal activity observed" if no threats detected
- Use factual, professional security language

STRICT RULES:
- Output ONLY the security report
- NO introductory phrases like "Here's a breakdown"
- NO recommendations, suggestions, or system commentary
- NO follow-up questions
- Write as a human security officer would
        """

        for item in segments:
            timeline_summary_prompt += f"\n        {item}"

        with open("/config/prompt.txt", "w") as f:
            f.write(timeline_summary_prompt)

        return self._send(timeline_summary_prompt, [])

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
    if not config.genai.provider:
        return None

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
