"""Generative AI module for Frigate."""

import datetime
import importlib
import logging
import os
import re
from typing import Any, Optional

from playhouse.shortcuts import model_to_dict

from frigate.config import CameraConfig, FrigateConfig, GenAIConfig, GenAIProviderEnum
from frigate.const import CLIPS_DIR
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
        debug_save: bool,
    ) -> ReviewMetadata | None:
        """Generate a description for the review item activity."""

        def get_concern_prompt() -> str:
            if concerns:
                concern_list = "\n    - ".join(concerns)
                return f"""
- `other_concerns` (list of strings): Include a list of any of the following concerns that are occurring:
    - {concern_list}"""
            else:
                return ""

        def get_language_prompt() -> str:
            if preferred_language:
                return f"Provide your answer in {preferred_language}"
            else:
                return ""

        context_prompt = f"""
Please analyze the sequence of images ({len(thumbnails)} total) taken in chronological order from the perspective of the {review_data["camera"].replace("_", " ")} security camera.

Your task is to provide a clear, security-focused description of the scene that:
1. States exactly what is happening based on observable actions and movements.
2. Identifies and emphasizes behaviors that match patterns of suspicious activity.
3. Assigns a potential_threat_level based on the definitions below, applying them consistently.

Facts come first, but identifying security risks is the primary goal.

When forming your description:
- Describe the people and objects exactly as seen. Include any observable environmental changes (e.g., lighting changes triggered by activity).
- Time of day should **increase suspicion only when paired with unusual or security-relevant behaviors**. Do not raise the threat level for common residential activities (e.g., residents walking pets, retrieving mail, gardening, playing with pets, supervising children) even at unusual hours, unless other suspicious indicators are present.
- Focus on behaviors that are uncharacteristic of innocent activity: loitering without clear purpose, avoiding cameras, inspecting vehicles/doors, changing behavior when lights activate, scanning surroundings without an apparent benign reason.
- **Benign context override**: If scanning or looking around is clearly part of an innocent activity (such as playing with a dog, gardening, supervising children, or watching for a pet), do not treat it as suspicious.

Your response MUST be a flat JSON object with:
- `scene` (string): A full description including setting, entities, actions, and any plausible supported inferences.
- `confidence` (float): 0-1 confidence in the analysis.
- `potential_threat_level` (integer): 0, 1, or 2 as defined below.
{get_concern_prompt()}

Threat-level definitions:
- 0 — Typical or expected activity for this location/time (includes residents, guests, or known animals engaged in normal activities, even if they glance around or scan surroundings).
- 1 — Unusual or suspicious activity: At least one security-relevant behavior is present **and not explainable by a normal residential activity**.
- 2 — Active or immediate threat: Breaking in, vandalism, aggression, weapon display.

Sequence details:
- Frame 1 = earliest, Frame {len(thumbnails)} = latest
- Activity started at {review_data["start"]} and lasted {review_data["duration"]} seconds
- Detected objects: {", ".join(review_data["objects"])}
- Verified recognized objects: {", ".join(review_data["recognized_objects"]) or "None"}
- Zones involved: {", ".join(z.replace("_", " ").title() for z in review_data["zones"]) or "None"}

**IMPORTANT:**
- Values must be plain strings, floats, or integers — no nested objects, no extra commentary.
{get_language_prompt()}
"""
        logger.debug(
            f"Sending {len(thumbnails)} images to create review description on {review_data['camera']}"
        )

        if debug_save:
            with open(
                os.path.join(
                    CLIPS_DIR, "genai-requests", review_data["id"], "prompt.txt"
                ),
                "w",
            ) as f:
                f.write(context_prompt)

        response = self._send(context_prompt, thumbnails)

        if debug_save and response:
            with open(
                os.path.join(
                    CLIPS_DIR, "genai-requests", review_data["id"], "response.txt"
                ),
                "w",
            ) as f:
                f.write(response)

        if response:
            clean_json = re.sub(
                r"\n?```$", "", re.sub(r"^```[a-zA-Z0-9]*\n?", "", response)
            )

            try:
                metadata = ReviewMetadata.model_validate_json(clean_json)

                if review_data["recognized_objects"]:
                    metadata.potential_threat_level = 0

                metadata.time = review_data["start"]
                return metadata
            except Exception as e:
                # rarely LLMs can fail to follow directions on output format
                logger.warning(
                    f"Failed to parse review description as the response did not match expected format. {e}"
                )
                return None
        else:
            return None

    def generate_review_summary(
        self,
        start_ts: float,
        end_ts: float,
        segments: list[dict[str, Any]],
        debug_save: bool,
    ) -> str | None:
        """Generate a summary of review item descriptions over a period of time."""
        time_range = f"{datetime.datetime.fromtimestamp(start_ts).strftime('%I:%M %p')} to {datetime.datetime.fromtimestamp(end_ts).strftime('%I:%M %p')}"
        timeline_summary_prompt = f"""
You are a security officer.
Time range: {time_range}.
Input: JSON list with "scene", "confidence", "potential_threat_level" (1-2), "other_concerns".

Task: Write a concise, human-presentable security report in markdown format.

Rules for the report:

- Title & overview
  - Start with:
    # Security Summary - {time_range}
  - Write a 1-2 sentence situational overview capturing the general pattern of the period.

- Event details
  - Present events in chronological order as a bullet list.
  - Merge events with overlapping or identical timestamps into a single bullet.
  - If no timestamp is given, preserve order but label as “Time not specified.”
  - Use bold timestamps for clarity.
  - Group bullets under subheadings when multiple events fall into the same category (e.g., Vehicle Activity, Porch Activity, Unusual Behavior).

- Threat levels
  - Always show (threat level: X) for each event.
  - If multiple events at the same time share the same threat level, only state it once.

- Final assessment
  - End with a Final Assessment section.
  - If all events are threat level 1 with no escalation:
    Final assessment: Only normal residential activity observed during this period.
  - If threat level 2+ events are present, clearly summarize them as Potential concerns requiring review.

- Conciseness
  - Do not repeat benign clothing/appearance details unless they distinguish individuals.
  - Summarize similar routine events instead of restating full scene descriptions.
"""

        for item in segments:
            timeline_summary_prompt += f"\n{item}"

        if debug_save:
            with open(
                os.path.join(
                    CLIPS_DIR, "genai-requests", f"{start_ts}-{end_ts}", "prompt.txt"
                ),
                "w",
            ) as f:
                f.write(timeline_summary_prompt)

        response = self._send(timeline_summary_prompt, [])

        if debug_save and response:
            with open(
                os.path.join(
                    CLIPS_DIR, "genai-requests", f"{start_ts}-{end_ts}", "response.txt"
                ),
                "w",
            ) as f:
                f.write(response)

        return response

    def generate_object_description(
        self,
        camera_config: CameraConfig,
        thumbnails: list[bytes],
        event: Event,
    ) -> Optional[str]:
        """Generate a description for the frame."""
        try:
            prompt = camera_config.genai.object_prompts.get(
                event.label,
                camera_config.genai.prompt,
            ).format(**model_to_dict(event))
        except KeyError as e:
            logger.error(f"Invalid key in GenAI prompt: {e}")
            return None

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
