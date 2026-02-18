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
                    "Search for detected objects in Frigate by camera, object label, time range, "
                    "zones, and other filters. Use this to answer questions about when "
                    "objects were detected, what objects appeared, or to find specific object detections. "
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
                "name": "get_live_context",
                "description": (
                    "Get the current detection information for a camera: objects being tracked, "
                    "zones, timestamps. Use this to understand what is visible in the live view. "
                    "Call this when the user has included a live image (via include_live_image) or "
                    "when answering questions about what is happening right now on a specific camera."
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

        return {
            "camera": camera,
            "timestamp": frame_time,
            "detections": list(tracked_objects_dict.values()),
        }

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

    Returns None if the frame cannot be retrieved. Used when include_live_image
    is set to attach the image to the first user message.
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
        max_dimension = 1024
        if height > max_dimension or width > max_dimension:
            scale = max_dimension / max(height, width)
            frame = cv2.resize(
                frame,
                (int(width * scale), int(height * scale)),
                interpolation=cv2.INTER_AREA,
            )
        _, img_encoded = cv2.imencode(".jpg", frame, [cv2.IMWRITE_JPEG_QUALITY, 85])
        b64 = base64.b64encode(img_encoded.tobytes()).decode("utf-8")
        return f"data:image/jpeg;base64,{b64}"
    except Exception as e:
        logger.debug("Failed to get live frame for %s: %s", camera, e)
        return None


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
    else:
        logger.error(
            "Tool call failed: unknown tool %r. Expected one of: search_objects, get_live_context. "
            "Arguments received: %s",
            tool_name,
            json.dumps(arguments),
        )
        return {"error": f"Unknown tool: {tool_name}"}


async def _execute_pending_tools(
    pending_tool_calls: List[Dict[str, Any]],
    request: Request,
    allowed_cameras: List[str],
) -> tuple[List[ToolCall], List[Dict[str, Any]]]:
    """
    Execute a list of tool calls; return (ToolCall list for API response, tool result dicts for conversation).
    """
    tool_calls_out: List[ToolCall] = []
    tool_results: List[Dict[str, Any]] = []
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
    return (tool_calls_out, tool_results)


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
        cameras_info.append(f"  - {friendly_name} (ID: {camera_id})")

    cameras_section = ""
    if cameras_info:
        cameras_section = (
            "\n\nAvailable cameras:\n"
            + "\n".join(cameras_info)
            + "\n\nWhen users refer to cameras by their friendly name (e.g., 'Back Deck Camera'), use the corresponding camera ID (e.g., 'back_deck_cam') in tool calls."
        )

    live_image_note = ""
    if body.include_live_image:
        live_image_note = (
            f"\n\nThe first user message includes a live image from camera "
            f"'{body.include_live_image}'. Use get_live_context for that camera to get "
            "current detection details (objects, zones) to aid in understanding the image."
        )

    system_prompt = f"""You are a helpful assistant for Frigate, a security camera NVR system. You help users answer questions about their cameras, detected objects, and events.

Current server local date and time: {current_date_str} at {current_time_str}

Do not start your response with phrases like "I will check...", "Let me see...", or "Let me look...". Answer directly.

Always present times to the user in the server's local timezone. When tool results include start_time_local and end_time_local, use those exact strings when listing or describing detection times—do not convert or invent timestamps. Do not use UTC or ISO format with Z for the user-facing answer unless the tool result only provides Unix timestamps without local time fields.
When users ask about "today", "yesterday", "this week", etc., use the current date above as reference.
When searching for objects or events, use ISO 8601 format for dates (e.g., {current_date_str}T00:00:00Z for the start of today).
Always be accurate with time calculations based on the current date provided.{cameras_section}{live_image_note}"""

    conversation.append(
        {
            "role": "system",
            "content": system_prompt,
        }
    )

    first_user_message_seen = False
    for msg in body.messages:
        msg_dict = {
            "role": msg.role,
            "content": msg.content,
        }
        if msg.tool_call_id:
            msg_dict["tool_call_id"] = msg.tool_call_id
        if msg.name:
            msg_dict["name"] = msg.name

        if (
            msg.role == "user"
            and not first_user_message_seen
            and body.include_live_image
        ):
            first_user_message_seen = True
            image_url = await _get_live_frame_image_url(
                request, body.include_live_image, allowed_cameras
            )
            if image_url:
                msg_dict["content"] = [
                    {"type": "text", "text": msg.content},
                    {"type": "image_url", "image_url": {"url": image_url}},
                ]

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
                            executed_calls, tool_results = await _execute_pending_tools(
                                pending, request, allowed_cameras
                            )
                            stream_tool_calls.extend(executed_calls)
                            conversation.extend(tool_results)
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
            executed_calls, tool_results = await _execute_pending_tools(
                pending_tool_calls, request, allowed_cameras
            )
            tool_calls.extend(executed_calls)
            conversation.extend(tool_results)
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
