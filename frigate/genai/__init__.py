"""Generative AI module for Frigate."""

import datetime
import importlib
import logging
import os
import re
from typing import Any, Callable, Optional

import numpy as np
from playhouse.shortcuts import model_to_dict

from frigate.config import CameraConfig, GenAIConfig, GenAIProviderEnum
from frigate.const import CLIPS_DIR
from frigate.data_processing.post.types import ReviewMetadata
from frigate.genai.manager import GenAIClientManager
from frigate.models import Event

logger = logging.getLogger(__name__)

__all__ = [
    "GenAIClient",
    "GenAIClientManager",
    "GenAIConfig",
    "GenAIProviderEnum",
    "PROVIDERS",
    "load_providers",
    "register_genai_provider",
]

PROVIDERS = {}


def register_genai_provider(key: GenAIProviderEnum) -> Callable:
    """Register a GenAI provider."""

    def decorator(cls: type) -> type:
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
Your task is to analyze a sequence of images taken in chronological order from a security camera.

## Normal Activity Patterns for This Property

{activity_context_prompt}

## Task Instructions

Describe the scene based on observable actions and movements, evaluate the activity against the Activity Indicators above, and assign a potential_threat_level (0, 1, or 2) by applying the threat level indicators consistently.

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

## Response Field Guidelines

Respond with a JSON object matching the provided schema. Field-specific guidance:
- `scene`: Describe how the sequence begins, then the progression of events — all significant movements and actions in order. For example, if a vehicle arrives and then a person exits, describe both sequentially. Always use subject names from "Objects in Scene" — do not replace named subjects with generic terms like "a person" or "the individual". Your description should align with and support the threat level you assign.
- `title`: Characterize **what took place and where** — interpret the overall purpose or outcome, do not simply compress the scene description into fewer words. Include the relevant location (zone, area, or entry point). Always include subject names from "Objects in Scene" — do not replace named subjects with generic terms. No editorial qualifiers like "routine" or "suspicious."
- `potential_threat_level`: Must be consistent with your scene description and the activity patterns above.
{get_concern_prompt()}

## Sequence Details

- Camera: {review_data["camera"]}
- Total frames: {len(thumbnails)} (Frame 1 = earliest, Frame {len(thumbnails)} = latest)
- Activity started at {review_data["start"]} and lasted {review_data["duration"]} seconds
- Zones involved: {", ".join(review_data["zones"]) if review_data["zones"] else "None"}

## Objects in Scene

Each line represents a detection state, not necessarily unique individuals. The `←` symbol separates a recognized subject's name from their object type — use only the name (before the `←`) in your response, not the type after it. The same subject may appear across multiple lines if detected multiple times.

**Note: Unidentified objects (without names) are NOT indicators of suspicious activity—they simply mean the system hasn't identified that object.**
{get_objects_list()}

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

        # Build JSON schema for structured output from ReviewMetadata model
        schema = ReviewMetadata.model_json_schema()
        schema.get("properties", {}).pop("time", None)

        if "time" in schema.get("required", []):
            schema["required"].remove("time")
        if not concerns:
            schema.get("properties", {}).pop("other_concerns", None)
            if "other_concerns" in schema.get("required", []):
                schema["required"].remove("other_concerns")

        # OpenAI strict mode requires additionalProperties: false on all objects
        schema["additionalProperties"] = False

        response_format = {
            "type": "json_schema",
            "json_schema": {
                "name": "review_metadata",
                "strict": True,
                "schema": schema,
            },
        }

        response = self._send(context_prompt, thumbnails, response_format)

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

                # Normalize confidence if model returned a percentage (e.g. 85 instead of 0.85)
                if metadata.confidence > 1.0:
                    metadata.confidence = min(metadata.confidence / 100.0, 1.0)

                # If any verified objects (contain ← separator), set to 0
                if any("←" in obj for obj in review_data["unified_objects"]):
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
                str(event.label),
                camera_config.objects.genai.prompt,
            ).format(**model_to_dict(event))
        except KeyError as e:
            logger.error(f"Invalid key in GenAI prompt: {e}")
            return None

        logger.debug(f"Sending images to genai provider with prompt: {prompt}")
        return self._send(prompt, thumbnails)

    def _init_provider(self) -> Any:
        """Initialize the client."""
        return None

    def _send(
        self,
        prompt: str,
        images: list[bytes],
        response_format: Optional[dict] = None,
    ) -> Optional[str]:
        """Submit a request to the provider."""
        return None

    def get_context_size(self) -> int:
        """Get the context window size for this provider in tokens."""
        return 4096

    def embed(
        self,
        texts: list[str] | None = None,
        images: list[bytes] | None = None,
    ) -> list[np.ndarray]:
        """Generate embeddings for text and/or images.

        Returns list of numpy arrays (one per input). Expected dimension is 768
        for Frigate semantic search compatibility.

        Providers that support embeddings should override this method.
        """
        logger.warning(
            "%s does not support embeddings. "
            "This method should be overridden by the provider implementation.",
            self.__class__.__name__,
        )
        return []

    def chat_with_tools(
        self,
        messages: list[dict[str, Any]],
        tools: Optional[list[dict[str, Any]]] = None,
        tool_choice: Optional[str] = "auto",
    ) -> dict[str, Any]:
        """
        Send chat messages to LLM with optional tool definitions.

        This method handles conversation-style interactions with the LLM,
        including function calling/tool usage capabilities.

        Args:
            messages: List of message dictionaries. Each message should have:
                - 'role': str - One of 'user', 'assistant', 'system', or 'tool'
                - 'content': str - The message content
                - 'tool_call_id': Optional[str] - For tool responses, the ID of the tool call
                - 'name': Optional[str] - For tool messages, the tool name
            tools: Optional list of tool definitions in OpenAI-compatible format.
                   Each tool should have 'type': 'function' and 'function' with:
                   - 'name': str - Tool name
                   - 'description': str - Tool description
                   - 'parameters': dict - JSON schema for parameters
            tool_choice: How the model should handle tools:
                - 'auto': Model decides whether to call tools
                - 'none': Model must not call tools
                - 'required': Model must call at least one tool
                - Or a dict specifying a specific tool to call
            **kwargs: Additional provider-specific parameters.

        Returns:
            Dictionary with:
            - 'content': Optional[str] - The text response from the LLM, None if tool calls
            - 'tool_calls': Optional[List[Dict]] - List of tool calls if LLM wants to call tools.
              Each tool call dict has:
                - 'id': str - Unique identifier for this tool call
                - 'name': str - Tool name to call
                - 'arguments': dict - Arguments for the tool call (parsed JSON)
            - 'finish_reason': str - Reason generation stopped:
                - 'stop': Normal completion
                - 'tool_calls': LLM wants to call tools
                - 'length': Hit token limit
                - 'error': An error occurred

        Raises:
            NotImplementedError: If the provider doesn't implement this method.
        """
        # Base implementation - each provider should override this
        logger.warning(
            f"{self.__class__.__name__} does not support chat_with_tools. "
            "This method should be overridden by the provider implementation."
        )
        return {
            "content": None,
            "tool_calls": None,
            "finish_reason": "error",
        }


def load_providers() -> None:
    package_dir = os.path.dirname(__file__)
    for filename in os.listdir(package_dir):
        if filename.endswith(".py") and filename != "__init__.py":
            module_name = f"frigate.genai.{filename[:-3]}"
            importlib.import_module(module_name)
