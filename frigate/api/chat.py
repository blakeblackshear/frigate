"""Chat and LLM tool calling APIs."""

import logging
from datetime import datetime
from typing import Any, Dict, List

from fastapi import APIRouter, Body, Depends, Request
from fastapi.responses import JSONResponse
from pydantic import BaseModel

from frigate.api.auth import (
    allow_any_authenticated,
    get_allowed_cameras_for_filter,
)
from frigate.api.defs.query.events_query_parameters import EventsQueryParams
from frigate.api.defs.tags import Tags
from frigate.api.event import events

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
