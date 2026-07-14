"""Prompt and response-format builders for GenAI features.

Centralizes the per-feature prompt framing and structured-output schema
shaping so provider clients in :mod:`frigate.genai.plugins` only handle
transport.
"""

import datetime
from typing import Any

from playhouse.shortcuts import model_to_dict

from frigate.config import CameraConfig, FrigateConfig
from frigate.config.classification import ObjectClassificationType
from frigate.config.ui import UnitSystemEnum
from frigate.data_processing.post.types import ReviewMetadata
from frigate.models import Event


def build_review_description_prompt(
    review_data: dict[str, Any],
    thumbnails: list[bytes],
    concerns: list[str],
    preferred_language: str | None,
    activity_context_prompt: str,
) -> str:
    """Build the prompt for review activity description generation."""

    def get_concern_prompt() -> str:
        if concerns:
            concern_list = "\n    - ".join(concerns)
            return (
                "\n- `other_concerns` (list of strings): Include a list of any of "
                "the following concerns that are occurring:\n"
                f"    - {concern_list}"
            )
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

    return f"""
Your task is to analyze a sequence of images taken in chronological order from a security camera.

## Normal Activity Patterns for This Property

{activity_context_prompt}

## Task Instructions

Describe the scene based on observable actions and movements, evaluate the activity against the Activity Indicators above, and assign a potential_threat_level (0, 1, or 2) by applying the threat level indicators consistently.

## Analysis Guidelines

When forming your description:
- **Treat "Objects in Scene" as the list of tracked subjects to describe.** Do not introduce additional people or vehicles that are not present in this list. You may freely reference other items, surfaces, and environmental details visible in the frames when describing what the listed subjects are doing.
- **Describe the most likely activity from visible cues across the sequence** — the subject's path, what they are carrying, and what they interact with. Avoid asserting completed outcomes you do not observe; describe in-progress actions rather than results.
- Describe what you observe: actions, movements, interactions with objects and the environment. Include any observable environmental changes (e.g., lighting changes triggered by activity).
- Note visible details such as clothing, items being carried or placed, tools or equipment present, and how they interact with the property or objects.
- Consider the full sequence chronologically: what happens from start to finish, how duration and actions relate to the location and objects involved.
- **Use the actual timestamp provided in "Activity started at"** below for time of day context—do not infer time from image brightness or darkness. Unusual hours (late night/early morning) should increase suspicion when the observable behavior itself appears questionable. However, recognize that some legitimate activities can occur at any hour.
- **Consider duration as a primary factor**: Apply the duration thresholds defined in the activity patterns above. Brief sequences during normal hours with apparent purpose typically indicate normal activity unless explicit suspicious actions are visible.
- **Weigh all evidence holistically**: Match the activity against the normal and suspicious patterns defined above, then evaluate based on the complete context (zone, objects, time, actions, duration). Apply the threat level indicators consistently. Use your judgment for edge cases.

## Response Field Guidelines

Respond with a JSON object matching the provided schema. Field-specific guidance:
- `observations`: Include the very start of the activity — for example, a vehicle entering the frame or pulling into the driveway — even if it lasts only a few frames and the rest of the clip is dominated by a longer activity. Include each arrival, departure, object handled, and notable change in position or state. Each item is a single concrete fact written as a complete sentence.
- `scene`: Describe how the sequence begins, then the progression of events — all significant movements and actions in order. For example, if a vehicle arrives and then a person exits, describe both sequentially. For named subjects (those with a `←` separator in "Objects in Scene"), always use their name — do not replace them with generic terms. For unnamed objects (e.g., "person", "car"), refer to them naturally with articles (e.g., "a person", "the car"). Your description should align with and support the threat level you assign.
- `title`: Name the primary activity across the observations, together with the location. An activity is what is being done with objects, tools, or surfaces; locomotion through the scene qualifies as the activity only when no other interaction is observed. For named subjects, always use their name. For unnamed objects, refer to them naturally with articles.
- `shortSummary`: Briefly summarize the primary activity across the observations.
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


def build_review_description_response_format(concerns: list[str]) -> dict[str, Any]:
    """Build the structured-output JSON schema for review descriptions.

    Strips the `time` field (populated server-side) and drops
    `other_concerns` when no concerns are configured.
    """
    schema = ReviewMetadata.model_json_schema()
    schema.get("properties", {}).pop("time", None)

    if "time" in schema.get("required", []):
        schema["required"].remove("time")
    if not concerns:
        schema.get("properties", {}).pop("other_concerns", None)
        if "other_concerns" in schema.get("required", []):
            schema["required"].remove("other_concerns")

    return {
        "type": "json_schema",
        "json_schema": {
            "name": "review_metadata",
            "strict": True,
            "schema": schema,
        },
    }


def build_review_summary_prompt(
    start_ts: float,
    end_ts: float,
    events: list[dict[str, Any]],
    preferred_language: str | None,
) -> str:
    """Build the prompt for a multi-event review summary."""
    time_range = (
        f"{datetime.datetime.fromtimestamp(start_ts).strftime('%B %d, %Y at %I:%M %p')}"
        f" to "
        f"{datetime.datetime.fromtimestamp(end_ts).strftime('%B %d, %Y at %I:%M %p')}"
    )
    prompt = f"""
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

    prompt += "\n\nEvents:\n"
    for event in events:
        prompt += f"\n{event}\n"

    if preferred_language:
        prompt += f"\nProvide your answer in {preferred_language}"

    return prompt


def build_object_description_prompt(
    camera_config: CameraConfig,
    event: Event,
) -> str:
    """Build the prompt for a per-object description.

    Pulls the per-label override from `objects.genai.object_prompts`, falling
    back to the camera default, and interpolates event fields.

    Raises:
        KeyError: if the user-defined prompt template references an unknown
            event field.
    """
    template = camera_config.objects.genai.object_prompts.get(
        str(event.label),
        camera_config.objects.genai.prompt,
    )
    return template.format(**model_to_dict(event))


def get_attribute_classifications(config: FrigateConfig) -> list[dict[str, Any]]:
    """Return enabled custom classification models of `attribute` type.

    Each entry: {"name": <model name>, "objects": [<object label>, ...]}.
    These models attach attribute metadata to events on the listed object
    types, which can later be filtered via the search_objects `attribute`
    field.
    """
    result: list[dict[str, Any]] = []

    for model_key, model_config in config.classification.custom.items():
        if not model_config.enabled or model_config.object_config is None:
            continue

        if (
            model_config.object_config.classification_type
            != ObjectClassificationType.attribute
        ):
            continue

        result.append(
            {
                "name": model_config.name or model_key,
                "objects": list(model_config.object_config.objects or []),
            }
        )

    return result


def get_tool_definitions(
    semantic_search_enabled: bool = False,
    attribute_classifications: list[dict[str, Any]] | None = None,
) -> list[dict[str, Any]]:
    """
    Get OpenAI-compatible tool definitions for Frigate.

    Returns a list of tool definitions that can be used with OpenAI-compatible
    function calling APIs. When semantic search is enabled, the search_objects
    tool exposes an additional `semantic_query` parameter for descriptive
    queries (e.g. "person riding a lawn mower") and find_similar_objects is
    included. When attribute classification models are configured, an
    `attribute` parameter is exposed for filtering by their labels.
    """
    search_objects_properties: dict[str, Any] = {
        "camera": {
            "type": "string",
            "description": "Camera name to filter by (optional).",
        },
        "label": {
            "type": "string",
            "description": (
                "Generic object class to filter by — one of the tracked detector "
                "labels such as 'person', 'package', 'car', 'dog', 'bird'. Use "
                "this for broad queries like 'show me all cars today'. Combine "
                "with semantic_query when the user also describes appearance or "
                "behavior (e.g. label='person', semantic_query='riding a lawn "
                "mower')."
            ),
        },
        "sub_label": {
            "type": "string",
            "description": (
                "Filter by a DISCRETE NAMED entity recognized in the detection. "
                "Use this for: a known person's name ('John'), a delivery "
                "company ('Amazon', 'UPS'), a recognized animal species or "
                "breed ('blue jay', 'cardinal', 'golden retriever'), or a "
                "license plate string. When filtering by a specific name, set "
                "only sub_label and leave label unset. Do NOT use sub_label "
                "for descriptions of appearance, clothing, or actions — those "
                "belong in semantic_query."
            ),
        },
        "after": {
            "type": "string",
            "description": "Start time in ISO 8601 format (e.g., '2024-01-01T00:00:00Z').",
        },
        "before": {
            "type": "string",
            "description": "End time in ISO 8601 format (e.g., '2024-01-01T23:59:59Z').",
        },
        "zones": {
            "type": "array",
            "items": {"type": "string"},
            "description": "List of zone names to filter by.",
        },
        "limit": {
            "type": "integer",
            "description": "Maximum number of objects to return (default: 25).",
            "default": 25,
        },
    }

    if attribute_classifications:
        model_outline = "; ".join(
            f"{m['name']} (applies to {', '.join(m['objects']) or 'any object'})"
            for m in attribute_classifications
        )
        search_objects_properties["attribute"] = {
            "type": "string",
            "description": (
                "Filter by a classification attribute label produced by a "
                "configured attribute classification model. Use this INSTEAD "
                "of semantic_query when the user's request matches one of "
                "these classifications. Configured models: "
                f"{model_outline}. "
                "Set the value to the attribute label that matches the user's "
                "phrasing (case-sensitive)."
            ),
        }

    if semantic_search_enabled:
        search_objects_properties["semantic_query"] = {
            "type": "string",
            "description": (
                "Optional natural-language description of a PHYSICAL "
                "CHARACTERISTIC, APPEARANCE, or ACTIVITY the user mentioned, "
                "used to semantically narrow results. Only set this when the "
                "user describes something beyond what label and sub_label can "
                "express on their own.\n"
                "USE for descriptive phrases like: 'riding a lawn mower', "
                "'wearing a red jacket', 'carrying a package', 'walking a "
                "dog', 'on a bicycle', 'holding an umbrella'.\n"
                "DO NOT USE for:\n"
                "- specific named people, pets, or delivery companies → use sub_label\n"
                "- animal species or breed names like 'blue jay', 'cardinal', "
                "'golden retriever' → use sub_label\n"
                "- license plate strings → use sub_label\n"
                "- generic object queries like 'all cars today' or 'every "
                "person' → use label alone with no semantic_query\n"
                "When set, combine with label/time/camera/zone filters as "
                "usual (e.g. label='person', semantic_query='riding a lawn "
                "mower', after='2024-05-01T00:00:00Z')."
            ),
        }

    search_objects_description = (
        "Search the historical record of detected objects in Frigate. "
        "Use this ONLY for questions about the PAST — e.g. 'did anyone come by today?', "
        "'when was the last car?', 'show me detections from yesterday'. "
        "Do NOT use this for monitoring or alerting requests about future events — "
        "use start_camera_watch instead for those. "
        "An 'object' in Frigate represents a tracked detection (e.g., a person, package, car).\n\n"
        "Choose filters based on what the user is asking for:\n"
        "- Generic class query ('show me all cars today'): set `label` only.\n"
        "- Specific NAMED entity (known person, delivery company, animal "
        "species/breed like 'blue jay' or 'golden retriever', license "
        "plate): set `sub_label` only and leave `label` unset.\n"
    )
    if semantic_search_enabled:
        search_objects_description += (
            "- Physical CHARACTERISTIC, APPEARANCE, or ACTIVITY that is not a "
            "discrete name ('person riding a lawn mower', 'someone in a red "
            "jacket', 'person carrying a package'): set `semantic_query` with "
            "the descriptive phrase, optionally alongside `label` for the "
            "object class. Do NOT put descriptive phrases in sub_label."
        )

    return [
        {
            "type": "function",
            "function": {
                "name": "search_objects",
                "description": search_objects_description,
                "parameters": {
                    "type": "object",
                    "properties": search_objects_properties,
                },
                "required": [],
            },
        },
        {
            "type": "function",
            "function": {
                "name": "find_similar_objects",
                "description": (
                    "Find tracked objects that are visually and semantically similar "
                    "to a specific past event. Use this when the user references a "
                    "particular object they have seen and wants to find other "
                    "sightings of the same or similar one ('that green car', 'the "
                    "person in the red jacket', 'the package that was delivered'). "
                    "Prefer this over search_objects whenever the user's intent is "
                    "'find more like this specific one.' Use search_objects first "
                    "only if you need to locate the anchor event. Requires semantic "
                    "search to be enabled."
                ),
                "parameters": {
                    "type": "object",
                    "properties": {
                        "event_id": {
                            "type": "string",
                            "description": "The id of the anchor event to find similar objects to.",
                        },
                        "after": {
                            "type": "string",
                            "description": "Start time in ISO 8601 format (e.g., '2024-01-01T00:00:00Z').",
                        },
                        "before": {
                            "type": "string",
                            "description": "End time in ISO 8601 format (e.g., '2024-01-01T23:59:59Z').",
                        },
                        "cameras": {
                            "type": "array",
                            "items": {"type": "string"},
                            "description": "Optional list of cameras to restrict to. Defaults to all.",
                        },
                        "labels": {
                            "type": "array",
                            "items": {"type": "string"},
                            "description": "Optional list of labels to restrict to. Defaults to the anchor event's label.",
                        },
                        "sub_labels": {
                            "type": "array",
                            "items": {"type": "string"},
                            "description": "Optional list of sub_labels (names) to restrict to.",
                        },
                        "zones": {
                            "type": "array",
                            "items": {"type": "string"},
                            "description": "Optional list of zones. An event matches if any of its zones overlap.",
                        },
                        "similarity_mode": {
                            "type": "string",
                            "enum": ["visual", "semantic", "fused"],
                            "description": "Which similarity signal(s) to use. 'fused' (default) combines visual and semantic.",
                            "default": "fused",
                        },
                        "min_score": {
                            "type": "number",
                            "description": "Drop matches with a similarity score below this threshold (0.0-1.0).",
                        },
                        "limit": {
                            "type": "integer",
                            "description": "Maximum number of matches to return (default: 10).",
                            "default": 10,
                        },
                    },
                    "required": ["event_id"],
                },
            },
        },
        {
            "type": "function",
            "function": {
                "name": "set_camera_state",
                "description": (
                    "Change a camera's feature state (e.g., turn detection on/off, enable/disable recordings). "
                    "Use camera='*' to apply to all cameras at once. "
                    "Only call this tool when the user explicitly asks to change a camera setting. "
                    "Requires admin privileges."
                ),
                "parameters": {
                    "type": "object",
                    "properties": {
                        "camera": {
                            "type": "string",
                            "description": "Camera name to target, or '*' to target all cameras.",
                        },
                        "feature": {
                            "type": "string",
                            "enum": [
                                "detect",
                                "record",
                                "snapshots",
                                "audio",
                                "motion",
                                "enabled",
                                "birdseye",
                                "birdseye_mode",
                                "improve_contrast",
                                "ptz_autotracker",
                                "motion_contour_area",
                                "motion_threshold",
                                "notifications",
                                "audio_transcription",
                                "review_alerts",
                                "review_detections",
                                "object_descriptions",
                                "review_descriptions",
                                "profile",
                            ],
                            "description": (
                                "The feature to change. Most features accept ON or OFF. "
                                "birdseye_mode accepts CONTINUOUS, MOTION, or OBJECTS. "
                                "motion_contour_area and motion_threshold accept a number. "
                                "profile accepts a profile name or 'none' to deactivate (requires camera='*')."
                            ),
                        },
                        "value": {
                            "type": "string",
                            "description": "The value to set. ON or OFF for toggles, a number for thresholds, a profile name or 'none' for profile.",
                        },
                    },
                    "required": ["camera", "feature", "value"],
                },
            },
        },
        {
            "type": "function",
            "function": {
                "name": "get_live_context",
                "description": (
                    "Get the current live image and detection information for a single camera: objects being tracked, "
                    "zones, timestamps. Use this to understand what is visible in the live view. "
                    "Call this when answering questions about what is happening right now on a specific camera. "
                    "Operates on one camera at a time; call the tool again for each additional camera. "
                    "Wildcards and empty values are not accepted."
                ),
                "parameters": {
                    "type": "object",
                    "properties": {
                        "camera": {
                            "type": "string",
                            "description": (
                                "Exact name of a single camera to get live context for. "
                                "Wildcards (e.g. '*', 'all') and empty strings are not accepted."
                            ),
                        },
                    },
                    "required": ["camera"],
                },
            },
        },
        {
            "type": "function",
            "function": {
                "name": "start_camera_watch",
                "description": (
                    "Start a continuous VLM watch job that monitors a camera and sends a notification "
                    "when a specified condition is met. Use this when the user wants to be alerted about "
                    "a future event, e.g. 'tell me when guests arrive' or 'notify me when the package is picked up'. "
                    "Only one watch job can run at a time. Returns a job ID."
                ),
                "parameters": {
                    "type": "object",
                    "properties": {
                        "camera": {
                            "type": "string",
                            "description": "Camera ID to monitor.",
                        },
                        "condition": {
                            "type": "string",
                            "description": (
                                "Natural-language description of the condition to watch for, "
                                "e.g. 'a person arrives at the front door'."
                            ),
                        },
                        "max_duration_minutes": {
                            "type": "integer",
                            "description": "Maximum time to watch before giving up (minutes, default 60).",
                            "default": 60,
                        },
                        "labels": {
                            "type": "array",
                            "items": {"type": "string"},
                            "description": "Object labels that should trigger a VLM check (e.g. ['person', 'car']). If omitted, any detection on the camera triggers a check.",
                        },
                        "zones": {
                            "type": "array",
                            "items": {"type": "string"},
                            "description": "Zone names to filter by. If specified, only detections in these zones trigger a VLM check.",
                        },
                    },
                    "required": ["camera", "condition"],
                },
            },
        },
        {
            "type": "function",
            "function": {
                "name": "stop_camera_watch",
                "description": (
                    "Cancel the currently running VLM watch job. Use this when the user wants to "
                    "stop a previously started watch, e.g. 'stop watching the front door'."
                ),
                "parameters": {
                    "type": "object",
                    "properties": {},
                    "required": [],
                },
            },
        },
        {
            "type": "function",
            "function": {
                "name": "get_profile_status",
                "description": (
                    "Get the current profile status including the active profile and "
                    "timestamps of when each profile was last activated. Use this to "
                    "determine time periods for recap requests — e.g. when the user asks "
                    "'what happened while I was away?', call this first to find the relevant "
                    "time window based on profile activation history."
                ),
                "parameters": {
                    "type": "object",
                    "properties": {},
                    "required": [],
                },
            },
        },
        {
            "type": "function",
            "function": {
                "name": "get_recap",
                "description": (
                    "Get a recap of all activity (alerts and detections) for a given time period. "
                    "Use this after calling get_profile_status to retrieve what happened during "
                    "a specific window — e.g. 'what happened while I was away?'. Returns a "
                    "chronological list of activity with camera, objects, zones, and GenAI-generated "
                    "descriptions when available. Summarize the results for the user."
                ),
                "parameters": {
                    "type": "object",
                    "properties": {
                        "after": {
                            "type": "string",
                            "description": "Start of the time period in ISO 8601 format (e.g. '2025-03-15T08:00:00').",
                        },
                        "before": {
                            "type": "string",
                            "description": "End of the time period in ISO 8601 format (e.g. '2025-03-15T17:00:00').",
                        },
                        "cameras": {
                            "type": "string",
                            "description": "Comma-separated camera IDs to include, or 'all' for all cameras. Default is 'all'.",
                        },
                        "severity": {
                            "type": "string",
                            "enum": ["alert", "detection"],
                            "description": "Filter by severity level. Omit to include both alerts and detections.",
                        },
                    },
                    "required": ["after", "before"],
                },
            },
        },
    ]


def build_chat_system_prompt(
    config: FrigateConfig,
    allowed_cameras: list[str],
    semantic_search_enabled: bool,
    attribute_classifications: list[dict[str, Any]],
) -> str:
    """Build the system prompt for the chat completion endpoint.

    Composes the static framing with conditional sections describing the
    available cameras, speed units, semantic-search routing guidance, and
    configured attribute classifications.
    """
    current_datetime = datetime.datetime.now()
    current_date_str = current_datetime.strftime("%Y-%m-%d")
    current_time_str = current_datetime.strftime("%I:%M:%S %p")

    cameras_info: list[str] = []
    has_speed_zone = False
    for camera_id in allowed_cameras:
        if camera_id not in config.cameras:
            continue
        camera_config = config.cameras[camera_id]
        friendly_name = (
            camera_config.friendly_name
            if camera_config.friendly_name
            else camera_id.replace("_", " ").title()
        )
        zone_descriptors = [
            f"{zone_config.get_formatted_name(zone_name)} (ID: {zone_name})"
            for zone_name, zone_config in camera_config.zones.items()
        ]
        if not has_speed_zone:
            has_speed_zone = any(
                zone.distances for zone in camera_config.zones.values()
            )
        if zone_descriptors:
            cameras_info.append(
                f"  - {friendly_name} (ID: {camera_id}, zones: {', '.join(zone_descriptors)})"
            )
        else:
            cameras_info.append(f"  - {friendly_name} (ID: {camera_id})")

    cameras_section = ""
    if cameras_info:
        cameras_section = (
            "\n\nAvailable cameras:\n"
            + "\n".join(cameras_info)
            + "\n\nWhen users refer to cameras or zones by their friendly name (e.g., 'Back Deck Camera', 'Front Walkway'), use the corresponding ID (e.g., 'back_deck_cam', 'front_walk') in tool calls. Tool results also identify zones by their ID, so when presenting cameras or zones back to the user, translate the ID to its friendly name."
        )

    speed_units_section = ""
    if has_speed_zone:
        speed_unit = (
            "mph" if config.ui.unit_system == UnitSystemEnum.imperial else "km/h"
        )
        speed_units_section = f"\n\nReport object speeds to the user in {speed_unit}."

    semantic_search_section = ""
    if semantic_search_enabled:
        semantic_search_section = (
            "\n\nWhen routing a search_objects call, pick filters by the shape of the user's request:\n"
            "- Generic class ('show me all cars today'): set `label` only.\n"
            "- Specific named entity — a known person ('John'), delivery company ('Amazon'), animal species/breed ('blue jay', 'cardinal', 'golden retriever'), or license plate: set `sub_label` only and leave `label` unset.\n"
            "- Physical characteristic, appearance, or activity that is NOT a discrete name ('find me people riding a lawn mower', 'someone in a red jacket', 'a person carrying a package'): set `semantic_query` with the descriptive phrase, optionally combined with `label` for the object class. Never put descriptive phrases in `sub_label`."
        )

    attribute_classification_section = ""
    if attribute_classifications:
        model_lines = "\n".join(
            f"- {m['name']}: applies to {', '.join(m['objects']) or 'any object'}"
            for m in attribute_classifications
        )
        attribute_classification_section = (
            "\n\nAttribute classification models are configured for the following object types:\n"
            f"{model_lines}\n"
            "When the user's request matches one of these classifications, set the search_objects `attribute` field to the matching label rather than using `semantic_query`. Reserve `semantic_query` for descriptive phrases that fall outside the configured attribute labels."
        )

    return f"""You are a helpful assistant for Frigate, a security camera NVR system. You help users answer questions about their cameras, detected objects, and events.

Current server local date and time: {current_date_str} at {current_time_str}

Do not start your response with phrases like "I will check...", "Let me see...", or "Let me look...". Answer directly.

Always present times to the user in the server's local timezone. When tool results include start_time_local and end_time_local, use those exact strings when listing or describing detection times—do not convert or invent timestamps. Do not use UTC or ISO format with Z for the user-facing answer unless the tool result only provides Unix timestamps without local time fields.
When users ask about "today", "yesterday", "this week", etc., use the current date above as reference.
When searching for objects or events, use ISO 8601 format for dates (e.g., {current_date_str}T00:00:00Z for the start of today).
Always be accurate with time calculations based on the current date provided.

When a user refers to a specific object they have seen or describe with identifying details ("that green car", "the person in the red jacket", "a package left today"), prefer the find_similar_objects tool over search_objects. Use search_objects first only to locate the anchor event, then pass its id to find_similar_objects. For generic queries like "show me all cars today", keep using search_objects. If a user message begins with [attached_event:<id>], treat that event id as the anchor for any similarity or "tell me more" request in the same message and call find_similar_objects with that id.{semantic_search_section}{attribute_classification_section}{cameras_section}{speed_units_section}"""
