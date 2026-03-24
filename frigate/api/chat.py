"""Chat and LLM tool calling APIs."""

import base64
import json
import logging
import time
from datetime import datetime
from typing import Any, Dict, Generator, List, Optional

import cv2
from fastapi import APIRouter, Body, Depends, Request
from fastapi.responses import JSONResponse, StreamingResponse
from pydantic import BaseModel

from frigate.api.auth import (
    allow_any_authenticated,
    get_allowed_cameras_for_filter,
)
from frigate.api.defs.query.events_query_parameters import EventsQueryParams
from frigate.api.defs.request.chat_body import ChatCompletionRequest
from frigate.api.defs.response.chat_response import (
    ChatCompletionResponse,
    ChatMessageResponse,
    ToolCall,
)
from frigate.api.defs.tags import Tags
from frigate.api.event import events
from frigate.genai.utils import build_assistant_message_for_conversation
from frigate.jobs.vlm_watch import (
    get_vlm_watch_job,
    start_vlm_watch_job,
    stop_vlm_watch_job,
)

logger = logging.getLogger(__name__)

router = APIRouter(tags=[Tags.chat])


def _chunk_content(content: str, chunk_size: int = 80) -> Generator[str, None, None]:
    """Yield content in word-aware chunks for streaming."""
    if not content:
        return
    words = content.split(" ")
    current: List[str] = []
    current_len = 0
    for w in words:
        current.append(w)
        current_len += len(w) + 1
        if current_len >= chunk_size:
            yield " ".join(current) + " "
            current = []
            current_len = 0
    if current:
        yield " ".join(current)


def _format_events_with_local_time(
    events_list: List[Dict[str, Any]],
) -> List[Dict[str, Any]]:
    """Add human-readable local start/end times to each event for the LLM."""
    result = []
    for evt in events_list:
        if not isinstance(evt, dict):
            result.append(evt)
            continue
        copy_evt = dict(evt)
        try:
            start_ts = evt.get("start_time")
            end_ts = evt.get("end_time")
            if start_ts is not None:
                dt_start = datetime.fromtimestamp(start_ts)
                copy_evt["start_time_local"] = dt_start.strftime("%Y-%m-%d %I:%M:%S %p")
            if end_ts is not None:
                dt_end = datetime.fromtimestamp(end_ts)
                copy_evt["end_time_local"] = dt_end.strftime("%Y-%m-%d %I:%M:%S %p")
        except (TypeError, ValueError, OSError):
            pass
        result.append(copy_evt)
    return result


class ToolExecuteRequest(BaseModel):
    """Request model for tool execution."""

    tool_name: str
    arguments: Dict[str, Any]


class VLMMonitorRequest(BaseModel):
    """Request model for starting a VLM watch job."""

    camera: str
    condition: str
    max_duration_minutes: int = 60
    labels: List[str] = []
    zones: List[str] = []


def get_tool_definitions() -> List[Dict[str, Any]]:
    """
    Get OpenAI-compatible tool definitions for Frigate.

    Returns a list of tool definitions that can be used with OpenAI-compatible
    function calling APIs.
    """
    return [
        {
            "type": "function",
            "function": {
                "name": "search_objects",
                "description": (
                    "Search the historical record of detected objects in Frigate. "
                    "Use this ONLY for questions about the PAST — e.g. 'did anyone come by today?', "
                    "'when was the last car?', 'show me detections from yesterday'. "
                    "Do NOT use this for monitoring or alerting requests about future events — "
                    "use start_camera_watch instead for those. "
                    "An 'object' in Frigate represents a tracked detection (e.g., a person, package, car). "
                    "When the user asks about a specific name (person, delivery company, animal, etc.), "
                    "filter by sub_label only and do not set label."
                ),
                "parameters": {
                    "type": "object",
                    "properties": {
                        "camera": {
                            "type": "string",
                            "description": "Camera name to filter by (optional).",
                        },
                        "label": {
                            "type": "string",
                            "description": "Object label to filter by (e.g., 'person', 'package', 'car').",
                        },
                        "sub_label": {
                            "type": "string",
                            "description": "Name of a person, delivery company, animal, etc. When filtering by a specific name, use only sub_label; do not set label.",
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
                    },
                },
                "required": [],
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
                    "Get the current live image and detection information for a camera: objects being tracked, "
                    "zones, timestamps. Use this to understand what is visible in the live view. "
                    "Call this when answering questions about what is happening right now on a specific camera."
                ),
                "parameters": {
                    "type": "object",
                    "properties": {
                        "camera": {
                            "type": "string",
                            "description": "Camera name to get live context for.",
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
    ]


@router.get(
    "/chat/tools",
    dependencies=[Depends(allow_any_authenticated())],
    summary="Get available tools",
    description="Returns OpenAI-compatible tool definitions for function calling.",
)
def get_tools() -> JSONResponse:
    """Get list of available tools for LLM function calling."""
    tools = get_tool_definitions()
    return JSONResponse(content={"tools": tools})


async def _execute_search_objects(
    arguments: Dict[str, Any],
    allowed_cameras: List[str],
) -> JSONResponse:
    """
    Execute the search_objects tool.

    This searches for detected objects (events) in Frigate using the same
    logic as the events API endpoint.
    """
    # Parse after/before as server local time; convert to Unix timestamp
    after = arguments.get("after")
    before = arguments.get("before")

    def _parse_as_local_timestamp(s: str):
        s = s.replace("Z", "").strip()[:19]
        dt = datetime.strptime(s, "%Y-%m-%dT%H:%M:%S")
        return time.mktime(dt.timetuple())

    if after:
        try:
            after = _parse_as_local_timestamp(after)
        except (ValueError, AttributeError, TypeError):
            logger.warning(f"Invalid 'after' timestamp format: {after}")
            after = None

    if before:
        try:
            before = _parse_as_local_timestamp(before)
        except (ValueError, AttributeError, TypeError):
            logger.warning(f"Invalid 'before' timestamp format: {before}")
            before = None

    # Convert zones array to comma-separated string if provided
    zones = arguments.get("zones")
    if isinstance(zones, list):
        zones = ",".join(zones)
    elif zones is None:
        zones = "all"

    # Build query parameters compatible with EventsQueryParams
    query_params = EventsQueryParams(
        cameras=arguments.get("camera", "all"),
        labels=arguments.get("label", "all"),
        sub_labels=arguments.get("sub_label", "all").lower(),
        zones=zones,
        zone=zones,
        after=after,
        before=before,
        limit=arguments.get("limit", 25),
    )

    try:
        # Call the events endpoint function directly
        # The events function is synchronous and takes params and allowed_cameras
        response = events(query_params, allowed_cameras)

        # The response is already a JSONResponse with event data
        # Return it as-is for the LLM
        return response
    except Exception as e:
        logger.error(f"Error executing search_objects: {e}", exc_info=True)
        return JSONResponse(
            content={
                "success": False,
                "message": "Error searching objects",
            },
            status_code=500,
        )


@router.post(
    "/chat/execute",
    dependencies=[Depends(allow_any_authenticated())],
    summary="Execute a tool",
    description="Execute a tool function call from an LLM.",
)
async def execute_tool(
    request: Request,
    body: ToolExecuteRequest = Body(...),
    allowed_cameras: List[str] = Depends(get_allowed_cameras_for_filter),
) -> JSONResponse:
    """
    Execute a tool function call.

    This endpoint receives tool calls from LLMs and executes the corresponding
    Frigate operations, returning results in a format the LLM can understand.
    """
    tool_name = body.tool_name
    arguments = body.arguments

    logger.debug(f"Executing tool: {tool_name} with arguments: {arguments}")

    if tool_name == "search_objects":
        return await _execute_search_objects(arguments, allowed_cameras)

    if tool_name == "set_camera_state":
        result = await _execute_set_camera_state(request, arguments)
        return JSONResponse(
            content=result, status_code=200 if result.get("success") else 400
        )

    return JSONResponse(
        content={
            "success": False,
            "message": f"Unknown tool: {tool_name}",
            "tool": tool_name,
        },
        status_code=400,
    )


async def _execute_get_live_context(
    request: Request,
    camera: str,
    allowed_cameras: List[str],
) -> Dict[str, Any]:
    if camera not in allowed_cameras:
        return {
            "error": f"Camera '{camera}' not found or access denied",
        }

    if camera not in request.app.frigate_config.cameras:
        return {
            "error": f"Camera '{camera}' not found",
        }

    try:
        frame_processor = request.app.detected_frames_processor
        camera_state = frame_processor.camera_states.get(camera)

        if camera_state is None:
            return {
                "error": f"Camera '{camera}' state not available",
            }

        tracked_objects_dict = {}
        with camera_state.current_frame_lock:
            tracked_objects = camera_state.tracked_objects.copy()
            frame_time = camera_state.current_frame_time

        for obj_id, tracked_obj in tracked_objects.items():
            obj_dict = tracked_obj.to_dict()
            if obj_dict.get("frame_time") == frame_time:
                tracked_objects_dict[obj_id] = {
                    "label": obj_dict.get("label"),
                    "zones": obj_dict.get("current_zones", []),
                    "sub_label": obj_dict.get("sub_label"),
                    "stationary": obj_dict.get("stationary", False),
                }

        result: Dict[str, Any] = {
            "camera": camera,
            "timestamp": frame_time,
            "detections": list(tracked_objects_dict.values()),
        }

        # Grab live frame and handle based on provider configuration
        image_url = await _get_live_frame_image_url(request, camera, allowed_cameras)
        if image_url:
            genai_manager = request.app.genai_manager
            if genai_manager.tool_client is genai_manager.vision_client:
                # Same provider handles both roles — pass image URL so it can
                # be injected as a user message (images can't be in tool results)
                result["_image_url"] = image_url
            elif genai_manager.vision_client is not None:
                # Separate vision provider — have it describe the image,
                # providing detection context so it knows what to focus on
                frame_bytes = _decode_data_url(image_url)
                if frame_bytes:
                    detections = result.get("detections", [])
                    if detections:
                        detection_lines = []
                        for d in detections:
                            parts = [d.get("label", "unknown")]
                            if d.get("sub_label"):
                                parts.append(f"({d['sub_label']})")
                            if d.get("zones"):
                                parts.append(f"in {', '.join(d['zones'])}")
                            detection_lines.append(" ".join(parts))
                        context = (
                            "The following objects are currently being tracked: "
                            + "; ".join(detection_lines)
                            + "."
                        )
                    else:
                        context = "No objects are currently being tracked."

                    description = genai_manager.vision_client._send(
                        f"Describe what you see in this security camera image. "
                        f"{context} Focus on the scene, any visible activity, "
                        f"and details about the tracked objects.",
                        [frame_bytes],
                    )
                    if description:
                        result["image_description"] = description

        return result

    except Exception as e:
        logger.error(f"Error executing get_live_context: {e}", exc_info=True)
        return {
            "error": "Error getting live context",
        }


async def _get_live_frame_image_url(
    request: Request,
    camera: str,
    allowed_cameras: List[str],
) -> Optional[str]:
    """
    Fetch the current live frame for a camera as a base64 data URL.

    Returns None if the frame cannot be retrieved. Used by get_live_context
    to attach the live image to the conversation.
    """
    if (
        camera not in allowed_cameras
        or camera not in request.app.frigate_config.cameras
    ):
        return None
    try:
        frame_processor = request.app.detected_frames_processor
        if camera not in frame_processor.camera_states:
            return None
        frame = frame_processor.get_current_frame(camera, {})
        if frame is None:
            return None
        height, width = frame.shape[:2]
        target_height = 480
        if height > target_height:
            scale = target_height / height
            frame = cv2.resize(
                frame,
                (int(width * scale), target_height),
                interpolation=cv2.INTER_AREA,
            )
        _, img_encoded = cv2.imencode(".jpg", frame, [cv2.IMWRITE_JPEG_QUALITY, 85])
        b64 = base64.b64encode(img_encoded.tobytes()).decode("utf-8")
        return f"data:image/jpeg;base64,{b64}"
    except Exception as e:
        logger.debug("Failed to get live frame for %s: %s", camera, e)
        return None


def _decode_data_url(data_url: str) -> Optional[bytes]:
    """Decode a base64 data URL to raw bytes."""
    try:
        # Format: data:image/jpeg;base64,<data>
        _, encoded = data_url.split(",", 1)
        return base64.b64decode(encoded)
    except (ValueError, Exception) as e:
        logger.debug("Failed to decode data URL: %s", e)
        return None


async def _execute_set_camera_state(
    request: Request,
    arguments: Dict[str, Any],
) -> Dict[str, Any]:
    role = request.headers.get("remote-role", "")
    if "admin" not in [r.strip() for r in role.split(",")]:
        return {"error": "Admin privileges required to change camera settings."}

    camera = arguments.get("camera", "").strip()
    feature = arguments.get("feature", "").strip()
    value = arguments.get("value", "").strip()

    if not camera or not feature or not value:
        return {"error": "camera, feature, and value are all required."}

    dispatcher = request.app.dispatcher
    frigate_config = request.app.frigate_config

    if feature == "profile":
        if camera != "*":
            return {"error": "Profile feature requires camera='*'."}
        dispatcher._receive("profile/set", value)
        return {"success": True, "camera": camera, "feature": feature, "value": value}

    if feature not in dispatcher._camera_settings_handlers:
        return {"error": f"Unknown feature: {feature}"}

    if camera == "*":
        cameras = list(frigate_config.cameras.keys())
    elif camera not in frigate_config.cameras:
        return {"error": f"Camera '{camera}' not found."}
    else:
        cameras = [camera]

    for cam in cameras:
        dispatcher._receive(f"{cam}/{feature}/set", value)

    return {"success": True, "camera": camera, "feature": feature, "value": value}


async def _execute_tool_internal(
    tool_name: str,
    arguments: Dict[str, Any],
    request: Request,
    allowed_cameras: List[str],
) -> Dict[str, Any]:
    """
    Internal helper to execute a tool and return the result as a dict.

    This is used by the chat completion endpoint to execute tools.
    """
    if tool_name == "search_objects":
        response = await _execute_search_objects(arguments, allowed_cameras)
        try:
            if hasattr(response, "body"):
                body_str = response.body.decode("utf-8")
                return json.loads(body_str)
            elif hasattr(response, "content"):
                return response.content
            else:
                return {}
        except (json.JSONDecodeError, AttributeError) as e:
            logger.warning(f"Failed to extract tool result: {e}")
            return {"error": "Failed to parse tool result"}
    elif tool_name == "set_camera_state":
        return await _execute_set_camera_state(request, arguments)
    elif tool_name == "get_live_context":
        camera = arguments.get("camera")
        if not camera:
            logger.error(
                "Tool get_live_context failed: camera parameter is required. "
                "Arguments: %s",
                json.dumps(arguments),
            )
            return {"error": "Camera parameter is required"}
        return await _execute_get_live_context(request, camera, allowed_cameras)
    elif tool_name == "start_camera_watch":
        return await _execute_start_camera_watch(request, arguments)
    elif tool_name == "stop_camera_watch":
        return _execute_stop_camera_watch()
    else:
        logger.error(
            "Tool call failed: unknown tool %r. Expected one of: search_objects, get_live_context, "
            "start_camera_watch, stop_camera_watch. Arguments received: %s",
            tool_name,
            json.dumps(arguments),
        )
        return {"error": f"Unknown tool: {tool_name}"}


async def _execute_start_camera_watch(
    request: Request,
    arguments: Dict[str, Any],
) -> Dict[str, Any]:
    camera = arguments.get("camera", "").strip()
    condition = arguments.get("condition", "").strip()
    max_duration_minutes = int(arguments.get("max_duration_minutes", 60))
    labels = arguments.get("labels") or []
    zones = arguments.get("zones") or []

    if not camera or not condition:
        return {"error": "camera and condition are required."}

    config = request.app.frigate_config
    if camera not in config.cameras:
        return {"error": f"Camera '{camera}' not found."}

    genai_manager = request.app.genai_manager
    vision_client = genai_manager.vision_client or genai_manager.tool_client
    if vision_client is None:
        return {"error": "No vision/GenAI provider configured."}

    try:
        job_id = start_vlm_watch_job(
            camera=camera,
            condition=condition,
            max_duration_minutes=max_duration_minutes,
            config=config,
            frame_processor=request.app.detected_frames_processor,
            genai_manager=genai_manager,
            dispatcher=request.app.dispatcher,
            labels=labels,
            zones=zones,
        )
    except RuntimeError as e:
        logger.error("Failed to start VLM watch job: %s", e, exc_info=True)
        return {"error": "Failed to start VLM watch job."}

    return {
        "success": True,
        "job_id": job_id,
        "message": (
            f"Now watching '{camera}' for: {condition}. "
            f"You'll receive a notification when the condition is met (timeout: {max_duration_minutes} min)."
        ),
    }


def _execute_stop_camera_watch() -> Dict[str, Any]:
    cancelled = stop_vlm_watch_job()
    if cancelled:
        return {"success": True, "message": "Watch job cancelled."}
    return {"success": False, "message": "No active watch job to cancel."}


async def _execute_pending_tools(
    pending_tool_calls: List[Dict[str, Any]],
    request: Request,
    allowed_cameras: List[str],
) -> tuple[List[ToolCall], List[Dict[str, Any]], List[Dict[str, Any]]]:
    """
    Execute a list of tool calls.

    Returns:
        (ToolCall list for API response,
         tool result dicts for conversation,
         extra messages to inject after tool results — e.g. user messages with images)
    """
    tool_calls_out: List[ToolCall] = []
    tool_results: List[Dict[str, Any]] = []
    extra_messages: List[Dict[str, Any]] = []
    for tool_call in pending_tool_calls:
        tool_name = tool_call["name"]
        tool_args = tool_call.get("arguments") or {}
        tool_call_id = tool_call["id"]
        logger.debug(
            f"Executing tool: {tool_name} (id: {tool_call_id}) with arguments: {json.dumps(tool_args, indent=2)}"
        )
        try:
            tool_result = await _execute_tool_internal(
                tool_name, tool_args, request, allowed_cameras
            )
            if isinstance(tool_result, dict) and tool_result.get("error"):
                logger.error(
                    "Tool call %s (id: %s) returned error: %s. Arguments: %s",
                    tool_name,
                    tool_call_id,
                    tool_result.get("error"),
                    json.dumps(tool_args),
                )
            if tool_name == "search_objects" and isinstance(tool_result, list):
                tool_result = _format_events_with_local_time(tool_result)
                _keys = {
                    "id",
                    "camera",
                    "label",
                    "zones",
                    "start_time_local",
                    "end_time_local",
                    "sub_label",
                    "event_count",
                }
                tool_result = [
                    {k: evt[k] for k in _keys if k in evt}
                    for evt in tool_result
                    if isinstance(evt, dict)
                ]

            # Extract _image_url from get_live_context results — images can
            # only be sent in user messages, not tool results
            if isinstance(tool_result, dict) and "_image_url" in tool_result:
                image_url = tool_result.pop("_image_url")
                extra_messages.append(
                    {
                        "role": "user",
                        "content": [
                            {
                                "type": "text",
                                "text": f"Here is the current live image from camera '{tool_result.get('camera', 'unknown')}'.",
                            },
                            {
                                "type": "image_url",
                                "image_url": {"url": image_url},
                            },
                        ],
                    }
                )

            result_content = (
                json.dumps(tool_result)
                if isinstance(tool_result, (dict, list))
                else (tool_result if isinstance(tool_result, str) else str(tool_result))
            )
            tool_calls_out.append(
                ToolCall(name=tool_name, arguments=tool_args, response=result_content)
            )
            tool_results.append(
                {
                    "role": "tool",
                    "tool_call_id": tool_call_id,
                    "content": result_content,
                }
            )
        except Exception as e:
            logger.error(
                "Error executing tool %s (id: %s): %s. Arguments: %s",
                tool_name,
                tool_call_id,
                e,
                json.dumps(tool_args),
                exc_info=True,
            )
            error_content = json.dumps({"error": f"Tool execution failed: {str(e)}"})
            tool_calls_out.append(
                ToolCall(name=tool_name, arguments=tool_args, response=error_content)
            )
            tool_results.append(
                {
                    "role": "tool",
                    "tool_call_id": tool_call_id,
                    "content": error_content,
                }
            )
    return (tool_calls_out, tool_results, extra_messages)


@router.post(
    "/chat/completion",
    dependencies=[Depends(allow_any_authenticated())],
    summary="Chat completion with tool calling",
    description=(
        "Send a chat message to the configured GenAI provider with tool calling support. "
        "The LLM can call Frigate tools to answer questions about your cameras and events."
    ),
)
async def chat_completion(
    request: Request,
    body: ChatCompletionRequest = Body(...),
    allowed_cameras: List[str] = Depends(get_allowed_cameras_for_filter),
):
    """
    Chat completion endpoint with tool calling support.

    This endpoint:
    1. Gets the configured GenAI client
    2. Gets tool definitions
    3. Sends messages + tools to LLM
    4. Handles tool_calls if present
    5. Executes tools and sends results back to LLM
    6. Repeats until final answer
    7. Returns response to user
    """
    genai_client = request.app.genai_manager.tool_client
    if not genai_client:
        return JSONResponse(
            content={
                "error": "GenAI is not configured. Please configure a GenAI provider in your Frigate config.",
            },
            status_code=400,
        )

    tools = get_tool_definitions()
    conversation = []

    current_datetime = datetime.now()
    current_date_str = current_datetime.strftime("%Y-%m-%d")
    current_time_str = current_datetime.strftime("%I:%M:%S %p")

    cameras_info = []
    config = request.app.frigate_config
    for camera_id in allowed_cameras:
        if camera_id not in config.cameras:
            continue
        camera_config = config.cameras[camera_id]
        friendly_name = (
            camera_config.friendly_name
            if camera_config.friendly_name
            else camera_id.replace("_", " ").title()
        )
        zone_names = list(camera_config.zones.keys())
        if zone_names:
            cameras_info.append(
                f"  - {friendly_name} (ID: {camera_id}, zones: {', '.join(zone_names)})"
            )
        else:
            cameras_info.append(f"  - {friendly_name} (ID: {camera_id})")

    cameras_section = ""
    if cameras_info:
        cameras_section = (
            "\n\nAvailable cameras:\n"
            + "\n".join(cameras_info)
            + "\n\nWhen users refer to cameras by their friendly name (e.g., 'Back Deck Camera'), use the corresponding camera ID (e.g., 'back_deck_cam') in tool calls."
        )

    system_prompt = f"""You are a helpful assistant for Frigate, a security camera NVR system. You help users answer questions about their cameras, detected objects, and events.

Current server local date and time: {current_date_str} at {current_time_str}

Do not start your response with phrases like "I will check...", "Let me see...", or "Let me look...". Answer directly.

Always present times to the user in the server's local timezone. When tool results include start_time_local and end_time_local, use those exact strings when listing or describing detection times—do not convert or invent timestamps. Do not use UTC or ISO format with Z for the user-facing answer unless the tool result only provides Unix timestamps without local time fields.
When users ask about "today", "yesterday", "this week", etc., use the current date above as reference.
When searching for objects or events, use ISO 8601 format for dates (e.g., {current_date_str}T00:00:00Z for the start of today).
Always be accurate with time calculations based on the current date provided.{cameras_section}"""

    conversation.append(
        {
            "role": "system",
            "content": system_prompt,
        }
    )

    for msg in body.messages:
        msg_dict = {
            "role": msg.role,
            "content": msg.content,
        }
        if msg.tool_call_id:
            msg_dict["tool_call_id"] = msg.tool_call_id
        if msg.name:
            msg_dict["name"] = msg.name

        conversation.append(msg_dict)

    tool_iterations = 0
    tool_calls: List[ToolCall] = []
    max_iterations = body.max_tool_iterations

    logger.debug(
        f"Starting chat completion with {len(conversation)} message(s), "
        f"{len(tools)} tool(s) available, max_iterations={max_iterations}"
    )

    # True LLM streaming when client supports it and stream requested
    if body.stream and hasattr(genai_client, "chat_with_tools_stream"):
        stream_tool_calls: List[ToolCall] = []
        stream_iterations = 0

        async def stream_body_llm():
            nonlocal conversation, stream_tool_calls, stream_iterations
            while stream_iterations < max_iterations:
                logger.debug(
                    f"Streaming LLM (iteration {stream_iterations + 1}/{max_iterations}) "
                    f"with {len(conversation)} message(s)"
                )
                async for event in genai_client.chat_with_tools_stream(
                    messages=conversation,
                    tools=tools if tools else None,
                    tool_choice="auto",
                ):
                    kind, value = event
                    if kind == "content_delta":
                        yield (
                            json.dumps({"type": "content", "delta": value}).encode(
                                "utf-8"
                            )
                            + b"\n"
                        )
                    elif kind == "message":
                        msg = value
                        if msg.get("finish_reason") == "error":
                            yield (
                                json.dumps(
                                    {
                                        "type": "error",
                                        "error": "An error occurred while processing your request.",
                                    }
                                ).encode("utf-8")
                                + b"\n"
                            )
                            return
                        pending = msg.get("tool_calls")
                        if pending:
                            stream_iterations += 1
                            conversation.append(
                                build_assistant_message_for_conversation(
                                    msg.get("content"), pending
                                )
                            )
                            (
                                executed_calls,
                                tool_results,
                                extra_msgs,
                            ) = await _execute_pending_tools(
                                pending, request, allowed_cameras
                            )
                            stream_tool_calls.extend(executed_calls)
                            conversation.extend(tool_results)
                            conversation.extend(extra_msgs)
                            yield (
                                json.dumps(
                                    {
                                        "type": "tool_calls",
                                        "tool_calls": [
                                            tc.model_dump() for tc in stream_tool_calls
                                        ],
                                    }
                                ).encode("utf-8")
                                + b"\n"
                            )
                            break
                        else:
                            yield (json.dumps({"type": "done"}).encode("utf-8") + b"\n")
                            return
            else:
                yield json.dumps({"type": "done"}).encode("utf-8") + b"\n"

        return StreamingResponse(
            stream_body_llm(),
            media_type="application/x-ndjson",
            headers={"X-Accel-Buffering": "no"},
        )

    try:
        while tool_iterations < max_iterations:
            logger.debug(
                f"Calling LLM (iteration {tool_iterations + 1}/{max_iterations}) "
                f"with {len(conversation)} message(s) in conversation"
            )
            response = genai_client.chat_with_tools(
                messages=conversation,
                tools=tools if tools else None,
                tool_choice="auto",
            )

            if response.get("finish_reason") == "error":
                logger.error("GenAI client returned an error")
                return JSONResponse(
                    content={
                        "error": "An error occurred while processing your request.",
                    },
                    status_code=500,
                )

            conversation.append(
                build_assistant_message_for_conversation(
                    response.get("content"), response.get("tool_calls")
                )
            )

            pending_tool_calls = response.get("tool_calls")
            if not pending_tool_calls:
                logger.debug(
                    f"Chat completion finished with final answer (iterations: {tool_iterations})"
                )
                final_content = response.get("content") or ""

                if body.stream:

                    async def stream_body() -> Any:
                        if tool_calls:
                            yield (
                                json.dumps(
                                    {
                                        "type": "tool_calls",
                                        "tool_calls": [
                                            tc.model_dump() for tc in tool_calls
                                        ],
                                    }
                                ).encode("utf-8")
                                + b"\n"
                            )
                        # Stream content in word-sized chunks for smooth UX
                        for part in _chunk_content(final_content):
                            yield (
                                json.dumps({"type": "content", "delta": part}).encode(
                                    "utf-8"
                                )
                                + b"\n"
                            )
                        yield json.dumps({"type": "done"}).encode("utf-8") + b"\n"

                    return StreamingResponse(
                        stream_body(),
                        media_type="application/x-ndjson",
                    )

                return JSONResponse(
                    content=ChatCompletionResponse(
                        message=ChatMessageResponse(
                            role="assistant",
                            content=final_content,
                            tool_calls=None,
                        ),
                        finish_reason=response.get("finish_reason", "stop"),
                        tool_iterations=tool_iterations,
                        tool_calls=tool_calls,
                    ).model_dump(),
                )

            tool_iterations += 1
            logger.debug(
                f"Tool calls detected (iteration {tool_iterations}/{max_iterations}): "
                f"{len(pending_tool_calls)} tool(s) to execute"
            )
            executed_calls, tool_results, extra_msgs = await _execute_pending_tools(
                pending_tool_calls, request, allowed_cameras
            )
            tool_calls.extend(executed_calls)
            conversation.extend(tool_results)
            conversation.extend(extra_msgs)
            logger.debug(
                f"Added {len(tool_results)} tool result(s) to conversation. "
                f"Continuing with next LLM call..."
            )

        logger.warning(
            f"Max tool iterations ({max_iterations}) reached. Returning partial response."
        )
        return JSONResponse(
            content=ChatCompletionResponse(
                message=ChatMessageResponse(
                    role="assistant",
                    content="I reached the maximum number of tool call iterations. Please try rephrasing your question.",
                    tool_calls=None,
                ),
                finish_reason="length",
                tool_iterations=tool_iterations,
                tool_calls=tool_calls,
            ).model_dump(),
        )

    except Exception as e:
        logger.error(f"Error in chat completion: {e}", exc_info=True)
        return JSONResponse(
            content={
                "error": "An error occurred while processing your request.",
            },
            status_code=500,
        )


# ---------------------------------------------------------------------------
# VLM Monitor endpoints
# ---------------------------------------------------------------------------


@router.post(
    "/vlm/monitor",
    dependencies=[Depends(allow_any_authenticated())],
    summary="Start a VLM watch job",
    description=(
        "Start monitoring a camera with the vision provider. "
        "The VLM analyzes live frames until the specified condition is met, "
        "then sends a notification. Only one watch job can run at a time."
    ),
)
async def start_vlm_monitor(
    request: Request,
    body: VLMMonitorRequest,
) -> JSONResponse:
    config = request.app.frigate_config
    genai_manager = request.app.genai_manager

    if body.camera not in config.cameras:
        return JSONResponse(
            content={"success": False, "message": f"Camera '{body.camera}' not found."},
            status_code=404,
        )

    vision_client = genai_manager.vision_client or genai_manager.tool_client
    if vision_client is None:
        return JSONResponse(
            content={
                "success": False,
                "message": "No vision/GenAI provider configured.",
            },
            status_code=400,
        )

    try:
        job_id = start_vlm_watch_job(
            camera=body.camera,
            condition=body.condition,
            max_duration_minutes=body.max_duration_minutes,
            config=config,
            frame_processor=request.app.detected_frames_processor,
            genai_manager=genai_manager,
            dispatcher=request.app.dispatcher,
            labels=body.labels,
            zones=body.zones,
        )
    except RuntimeError as e:
        logger.error("Failed to start VLM watch job: %s", e, exc_info=True)
        return JSONResponse(
            content={"success": False, "message": "Failed to start VLM watch job."},
            status_code=409,
        )

    return JSONResponse(
        content={"success": True, "job_id": job_id},
        status_code=201,
    )


@router.get(
    "/vlm/monitor",
    dependencies=[Depends(allow_any_authenticated())],
    summary="Get current VLM watch job",
    description="Returns the current (or most recently completed) VLM watch job.",
)
async def get_vlm_monitor() -> JSONResponse:
    job = get_vlm_watch_job()
    if job is None:
        return JSONResponse(content={"active": False}, status_code=200)
    return JSONResponse(content={"active": True, **job.to_dict()}, status_code=200)


@router.delete(
    "/vlm/monitor",
    dependencies=[Depends(allow_any_authenticated())],
    summary="Cancel the current VLM watch job",
    description="Cancels the running watch job if one exists.",
)
async def cancel_vlm_monitor() -> JSONResponse:
    cancelled = stop_vlm_watch_job()
    if not cancelled:
        return JSONResponse(
            content={"success": False, "message": "No active watch job to cancel."},
            status_code=404,
        )
    return JSONResponse(content={"success": True}, status_code=200)
