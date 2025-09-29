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
- **CRITICAL: Only describe objects explicitly listed in "Detected objects" below.** Do not infer or mention additional people, vehicles, or objects not present in the detected objects list, even if visual patterns suggest them. If only a car is detected, do not describe a person interacting with it unless "person" is also in the detected objects list.
- Describe what you observe: actions, movements, interactions with objects and the environment. Include any observable environmental changes (e.g., lighting changes triggered by activity).
- Note visible details such as clothing, items being carried or placed, tools or equipment present, and how they interact with the property or objects.
- Consider the full sequence chronologically: what happens from start to finish, how duration and actions relate to the location and objects involved.
- **Use the actual timestamp provided in "Activity started at"** below for time of day context—do not infer time from image brightness or darkness. Unusual hours (late night/early morning) should increase suspicion when the observable behavior itself appears questionable. However, recognize that some legitimate activities can occur at any hour (residents coming home, service deliveries, maintenance emergencies, etc.). Focus on whether the observable evidence supports a benign explanation despite the timing.
- Identify patterns that suggest potential security concerns: testing doors/windows, accessing unauthorized areas, attempting to conceal actions, extended loitering without apparent purpose, taking items, behavior that doesn't align with the apparent context of the scene.

Your response MUST be a flat JSON object with:
- `scene` (string): A full description including setting, entities, actions, and any plausible supported inferences.
- `confidence` (float): 0-1 confidence in the analysis.
- `potential_threat_level` (integer): 0, 1, or 2 as defined below.
{get_concern_prompt()}

Threat-level definitions:
- 0 — Normal activity: What you observe is consistent with expected residential life (residents, family, guests, pets, deliveries, services, maintenance, etc.). The observable evidence—despite any unusual timing—supports a benign explanation.
- 1 — Potentially suspicious: Observable behavior or context suggests this may warrant attention. The evidence doesn't clearly support a routine explanation. Examples: testing doors/windows, lingering without apparent purpose, accessing areas inappropriately, taking items, behavior inconsistent with the observable context, or activity at unusual hours without clear legitimate indicators.
- 2 — Immediate threat: Clear evidence of forced entry, break-in, vandalism, aggression, weapons, theft in progress, or active property damage.

Sequence details:
- Frame 1 = earliest, Frame {len(thumbnails)} = latest
- Activity started at {review_data["start"]} and lasted {review_data["duration"]} seconds
- Detected objects: {", ".join(review_data["objects"])}
- Verified recognized objects: {", ".join(review_data["recognized_objects"]) or "None"}
- Zones involved: {", ".join(z.replace("_", " ").title() for z in review_data["zones"]) or "None"}

**IMPORTANT:**
- Values must be plain strings, floats, or integers — no nested objects, no extra commentary.
- Only describe objects from the "Detected objects" list above. Do not hallucinate additional objects.
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
        time_range = f"{datetime.datetime.fromtimestamp(start_ts).strftime('%B %d, %Y at %I:%M %p')} to {datetime.datetime.fromtimestamp(end_ts).strftime('%B %d, %Y at %I:%M %p')}"
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
  - **If multiple events occur within the same minute or overlapping time range, COMBINE them into a single bullet.**
    - Summarize the distinct activities as sub-points under the shared timestamp.
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
