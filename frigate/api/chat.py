"""Chat and LLM tool calling APIs."""

import json
import logging
from datetime import datetime, timezone
from typing import Any, Dict, List

from fastapi import APIRouter, Body, Depends, Request
from fastapi.responses import JSONResponse
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
)
from frigate.api.defs.tags import Tags
from frigate.api.event import events
from frigate.genai import get_genai_client

logger = logging.getLogger(__name__)

router = APIRouter(tags=[Tags.chat])


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
                    "An 'object' in Frigate represents a tracked detection (e.g., a person, package, car)."
                ),
                "parameters": {
                    "type": "object",
                    "properties": {
                        "camera": {
                            "type": "string",
                            "description": "Camera name to filter by (optional). Use 'all' for all cameras.",
                        },
                        "label": {
                            "type": "string",
                            "description": "Object label to filter by (e.g., 'person', 'package', 'car').",
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
                            "description": "Maximum number of objects to return (default: 10).",
                            "default": 10,
                        },
                    },
                },
                "required": [],
            },
        },
    ]


@router.get(
    "/chat/tools",
    dependencies=[Depends(allow_any_authenticated())],
    summary="Get available tools",
    description="Returns OpenAI-compatible tool definitions for function calling.",
)
def get_tools(request: Request) -> JSONResponse:
    """Get list of available tools for LLM function calling."""
    tools = get_tool_definitions()
    return JSONResponse(content={"tools": tools})


async def _execute_search_objects(
    request: Request,
    arguments: Dict[str, Any],
    allowed_cameras: List[str],
) -> JSONResponse:
    """
    Execute the search_objects tool.

    This searches for detected objects (events) in Frigate using the same
    logic as the events API endpoint.
    """
    # Parse ISO 8601 timestamps to Unix timestamps if provided
    after = arguments.get("after")
    before = arguments.get("before")

    if after:
        try:
            after_dt = datetime.fromisoformat(after.replace("Z", "+00:00"))
            after = after_dt.timestamp()
        except (ValueError, AttributeError):
            logger.warning(f"Invalid 'after' timestamp format: {after}")
            after = None

    if before:
        try:
            before_dt = datetime.fromisoformat(before.replace("Z", "+00:00"))
            before = before_dt.timestamp()
        except (ValueError, AttributeError):
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
        camera=arguments.get("camera", "all"),
        cameras=arguments.get("camera", "all"),
        label=arguments.get("label", "all"),
        labels=arguments.get("label", "all"),
        zones=zones,
        zone=zones,
        after=after,
        before=before,
        limit=arguments.get("limit", 10),
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
                "message": f"Error searching objects: {str(e)}",
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
        return await _execute_search_objects(request, arguments, allowed_cameras)

    return JSONResponse(
        content={
            "success": False,
            "message": f"Unknown tool: {tool_name}",
            "tool": tool_name,
        },
        status_code=400,
    )


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
        response = await _execute_search_objects(request, arguments, allowed_cameras)
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
    else:
        return {"error": f"Unknown tool: {tool_name}"}


@router.post(
    "/chat/completion",
    response_model=ChatCompletionResponse,
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
) -> JSONResponse:
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
    genai_client = get_genai_client(request.app.frigate_config)
    if not genai_client:
        return JSONResponse(
            content={
                "error": "GenAI is not configured. Please configure a GenAI provider in your Frigate config.",
            },
            status_code=400,
        )

    tools = get_tool_definitions()
    conversation = []

    current_datetime = datetime.now(timezone.utc)
    current_date_str = current_datetime.strftime("%Y-%m-%d")
    current_time_str = current_datetime.strftime("%H:%M:%S %Z")
    system_prompt = f"""You are a helpful assistant for Frigate, a security camera NVR system. You help users answer questions about their cameras, detected objects, and events.

Current date and time: {current_date_str} at {current_time_str} (UTC)

When users ask questions about "today", "yesterday", "this week", etc., use the current date above as reference.
When searching for objects or events, use ISO 8601 format for dates (e.g., {current_date_str}T00:00:00Z for the start of today).
Always be accurate with time calculations based on the current date provided."""

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
    max_iterations = body.max_tool_iterations

    logger.debug(
        f"Starting chat completion with {len(conversation)} message(s), "
        f"{len(tools)} tool(s) available, max_iterations={max_iterations}"
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

            assistant_message = {
                "role": "assistant",
                "content": response.get("content"),
            }
            if response.get("tool_calls"):
                assistant_message["tool_calls"] = [
                    {
                        "id": tc["id"],
                        "type": "function",
                        "function": {
                            "name": tc["name"],
                            "arguments": json.dumps(tc["arguments"]),
                        },
                    }
                    for tc in response["tool_calls"]
                ]
            conversation.append(assistant_message)

            tool_calls = response.get("tool_calls")
            if not tool_calls:
                logger.debug(
                    f"Chat completion finished with final answer (iterations: {tool_iterations})"
                )
                return JSONResponse(
                    content=ChatCompletionResponse(
                        message=ChatMessageResponse(
                            role="assistant",
                            content=response.get("content"),
                            tool_calls=None,
                        ),
                        finish_reason=response.get("finish_reason", "stop"),
                        tool_iterations=tool_iterations,
                    ).model_dump(),
                )

            # Execute tools
            tool_iterations += 1
            logger.debug(
                f"Tool calls detected (iteration {tool_iterations}/{max_iterations}): "
                f"{len(tool_calls)} tool(s) to execute"
            )
            tool_results = []

            for tool_call in tool_calls:
                tool_name = tool_call["name"]
                tool_args = tool_call["arguments"]
                tool_call_id = tool_call["id"]

                logger.debug(
                    f"Executing tool: {tool_name} (id: {tool_call_id}) with arguments: {json.dumps(tool_args, indent=2)}"
                )

                try:
                    tool_result = await _execute_tool_internal(
                        tool_name, tool_args, request, allowed_cameras
                    )

                    if isinstance(tool_result, dict):
                        result_content = json.dumps(tool_result)
                        result_summary = tool_result
                        if isinstance(tool_result, dict) and isinstance(
                            tool_result.get("content"), list
                        ):
                            result_count = len(tool_result.get("content", []))
                            result_summary = {
                                "count": result_count,
                                "sample": tool_result.get("content", [])[:2]
                                if result_count > 0
                                else [],
                            }
                        logger.debug(
                            f"Tool {tool_name} (id: {tool_call_id}) completed successfully. "
                            f"Result: {json.dumps(result_summary, indent=2)}"
                        )
                    elif isinstance(tool_result, str):
                        result_content = tool_result
                        logger.debug(
                            f"Tool {tool_name} (id: {tool_call_id}) completed successfully. "
                            f"Result length: {len(result_content)} characters"
                        )
                    else:
                        result_content = str(tool_result)
                        logger.debug(
                            f"Tool {tool_name} (id: {tool_call_id}) completed successfully. "
                            f"Result type: {type(tool_result).__name__}"
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
                        f"Error executing tool {tool_name} (id: {tool_call_id}): {e}",
                        exc_info=True,
                    )
                    error_content = json.dumps(
                        {"error": f"Tool execution failed: {str(e)}"}
                    )
                    tool_results.append(
                        {
                            "role": "tool",
                            "tool_call_id": tool_call_id,
                            "content": error_content,
                        }
                    )
                    logger.debug(
                        f"Tool {tool_name} (id: {tool_call_id}) failed. Error result added to conversation."
                    )

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
