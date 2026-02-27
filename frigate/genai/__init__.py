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

    def __init__(self, genai_config: GenAIConfig, timeout: int = 120) -> None:
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
        activity_context_prompt: str,
    ) -> ReviewMetadata | None:
        """Generate a description for the review item activity."""

        def get_concern_prompt() -> str:
            if concerns:
                concern_list = "\n    - ".join(concerns)
                return f"""- `other_concerns` (list of strings): Include a list of any of the following concerns that are occurring:
    - {concern_list}"""
            else:
                return ""

        def get_language_prompt() -> str:
            if preferred_language:
                return f"Provide your answer in {preferred_language}"
            else:
                return ""

        def get_objects_list() -> str:
            if review_data["unified_objects"]:
                return "\n- " + "\n- ".join(review_data["unified_objects"])
            else:
                return "\n- (No objects detected)"

        context_prompt = f"""
Your task is to analyze the sequence of images ({len(thumbnails)} total) taken in chronological order from the perspective of the {review_data["camera"]} security camera.

## Normal Activity Patterns for This Property

{activity_context_prompt}

## Task Instructions

Your task is to provide a clear, accurate description of the scene that:
1. States exactly what is happening based on observable actions and movements.
2. Evaluates the activity against the Normal and Suspicious Activity Indicators above.
3. Assigns a potential_threat_level (0, 1, or 2) based on the threat level indicators defined above, applying them consistently.

**Use the activity patterns above as guidance to calibrate your assessment. Match the activity against both normal and suspicious indicators, then use your judgment based on the complete context.**

## Analysis Guidelines

When forming your description:
- **CRITICAL: Only describe objects explicitly listed in "Objects in Scene" below.** Do not infer or mention additional people, vehicles, or objects not present in this list, even if visual patterns suggest them. If only a car is listed, do not describe a person interacting with it unless "person" is also in the objects list.
- **Only describe actions actually visible in the frames.** Do not assume or infer actions that you don't observe happening. If someone walks toward furniture but you never see them sit, do not say they sat. Stick to what you can see across the sequence.
- Describe what you observe: actions, movements, interactions with objects and the environment. Include any observable environmental changes (e.g., lighting changes triggered by activity).
- Note visible details such as clothing, items being carried or placed, tools or equipment present, and how they interact with the property or objects.
- Consider the full sequence chronologically: what happens from start to finish, how duration and actions relate to the location and objects involved.
- **Use the actual timestamp provided in "Activity started at"** below for time of day context—do not infer time from image brightness or darkness. Unusual hours (late night/early morning) should increase suspicion when the observable behavior itself appears questionable. However, recognize that some legitimate activities can occur at any hour.
- **Consider duration as a primary factor**: Apply the duration thresholds defined in the activity patterns above. Brief sequences during normal hours with apparent purpose typically indicate normal activity unless explicit suspicious actions are visible.
- **Weigh all evidence holistically**: Match the activity against the normal and suspicious patterns defined above, then evaluate based on the complete context (zone, objects, time, actions, duration). Apply the threat level indicators consistently. Use your judgment for edge cases.

## Response Format

Your response MUST be a flat JSON object with:
- `scene` (string): A narrative description of what happens across the sequence from start to finish, in chronological order. Start by describing how the sequence begins, then describe the progression of events. **Describe all significant movements and actions in the order they occur.** For example, if a vehicle arrives and then a person exits, describe both actions sequentially. **Only describe actions you can actually observe happening in the frames provided.** Do not infer or assume actions that aren't visible (e.g., if you see someone walking but never see them sit, don't say they sat down). Include setting, detected objects, and their observable actions. Avoid speculation or filling in assumed behaviors. Your description should align with and support the threat level you assign.
- `title` (string): A concise, grammatically complete title in the format "[Subject] [action verb] [context]" that matches your scene description. Use names from "Objects in Scene" when you visually observe them.
- `shortSummary` (string): A brief 2-sentence summary of the scene, suitable for notifications. Should capture the key activity and context without full detail. This should be a condensed version of the scene description above.
- `confidence` (float): 0-1 confidence in your analysis. Higher confidence when objects/actions are clearly visible and context is unambiguous. Lower confidence when the sequence is unclear, objects are partially obscured, or context is ambiguous.
- `potential_threat_level` (integer): 0, 1, or 2 as defined in "Normal Activity Patterns for This Property" above. Your threat level must be consistent with your scene description and the guidance above.
{get_concern_prompt()}

## Sequence Details

- Frame 1 = earliest, Frame {len(thumbnails)} = latest
- Activity started at {review_data["start"]} and lasted {review_data["duration"]} seconds
- Zones involved: {", ".join(review_data["zones"]) if review_data["zones"] else "None"}

## Objects in Scene

Each line represents a detection state, not necessarily unique individuals. Parentheses indicate object type or category, use only the name/label in your response, not the parentheses.

**CRITICAL: When you see both recognized and unrecognized entries of the same type (e.g., "Joe (person)" and "Person"), visually count how many distinct people/objects you actually see based on appearance and clothing. If you observe only ONE person throughout the sequence, use ONLY the recognized name (e.g., "Joe"). The same person may be recognized in some frames but not others. Only describe both if you visually see MULTIPLE distinct people with clearly different appearances.**

**Note: Unidentified objects (without names) are NOT indicators of suspicious activity—they simply mean the system hasn't identified that object.**
{get_objects_list()}

## Important Notes
- Values must be plain strings, floats, or integers — no nested objects, no extra commentary.
- Only describe objects from the "Objects in Scene" list above. Do not hallucinate additional objects.
- When describing people or vehicles, use the exact names provided.
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

                # If any verified objects (contain parentheses with name), set to 0
                if any("(" in obj for obj in review_data["unified_objects"]):
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
        events: list[dict[str, Any]],
        preferred_language: str | None,
        debug_save: bool,
    ) -> str | None:
        """Generate a summary of review item descriptions over a period of time."""
        time_range = f"{datetime.datetime.fromtimestamp(start_ts).strftime('%B %d, %Y at %I:%M %p')} to {datetime.datetime.fromtimestamp(end_ts).strftime('%B %d, %Y at %I:%M %p')}"
        timeline_summary_prompt = f"""
You are a security officer writing a concise security report.

Time range: {time_range}

Input format: Each event is a JSON object with:
- "title", "scene", "confidence", "potential_threat_level" (0-2), "other_concerns", "camera", "time", "start_time", "end_time"
- "context": array of related events from other cameras that occurred during overlapping time periods

**Note: Use the "scene" field for event descriptions in the report. Ignore any "shortSummary" field if present.**

Report Structure - Use this EXACT format:

# Security Summary - {time_range}

## Overview
[Write 1-2 sentences summarizing the overall activity pattern during this period.]

---

## Timeline

[Group events by time periods (e.g., "Morning (6:00 AM - 12:00 PM)", "Afternoon (12:00 PM - 5:00 PM)", "Evening (5:00 PM - 9:00 PM)", "Night (9:00 PM - 6:00 AM)"). Use appropriate time blocks based on when events occurred.]

### [Time Block Name]

**HH:MM AM/PM** | [Camera Name] | [Threat Level Indicator]
- [Event title]: [Clear description incorporating contextual information from the "context" array]
- Context: [If context array has items, mention them here, e.g., "Delivery truck present on Front Driveway Cam (HH:MM AM/PM)"]
- Assessment: [Brief assessment incorporating context - if context explains the event, note it here]

[Repeat for each event in chronological order within the time block]

---

## Summary
[One sentence summarizing the period. If all events are normal/explained: "Routine activity observed." If review needed: "Some activity requires review but no security concerns." If security concerns: "Security concerns requiring immediate attention."]

Guidelines:
- List ALL events in chronological order, grouped by time blocks
- Threat level indicators: ✓ Normal, ⚠️ Needs review, 🔴 Security concern
- Integrate contextual information naturally - use the "context" array to enrich each event's description
- If context explains the event (e.g., delivery truck explains person at door), describe it accordingly (e.g., "delivery person" not "unidentified person")
- Be concise but informative - focus on what happened and what it means
- If contextual information makes an event clearly normal, reflect that in your assessment
- Only create time blocks that have events - don't create empty sections
"""

        timeline_summary_prompt += "\n\nEvents:\n"
        for event in events:
            timeline_summary_prompt += f"\n{event}\n"

        if preferred_language:
            timeline_summary_prompt += f"\nProvide your answer in {preferred_language}"

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
            prompt = camera_config.objects.genai.object_prompts.get(
                event.label,
                camera_config.objects.genai.prompt,
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

    def get_context_size(self) -> int:
        """Get the context window size for this provider in tokens."""
        return 4096


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
