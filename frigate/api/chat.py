"""Chat and LLM tool calling APIs."""

import base64
import json
import logging
import operator
import time
from datetime import datetime
from functools import reduce
from typing import Any, Dict, List, Optional

import cv2
from fastapi import APIRouter, Body, Depends, HTTPException, Request
from fastapi.responses import JSONResponse, StreamingResponse
from pydantic import BaseModel

from frigate.api.auth import (
    allow_any_authenticated,
    get_allowed_cameras_for_filter,
    require_camera_access,
)
from frigate.api.chat_util import (
    chunk_content,
    distance_to_score,
    format_events_with_local_time,
    fuse_scores,
    hydrate_event,
    parse_iso_to_timestamp,
)
from frigate.api.defs.query.events_query_parameters import EventsQueryParams
from frigate.api.defs.request.chat_body import ChatCompletionRequest
from frigate.api.defs.response.chat_response import (
    ChatCompletionResponse,
    ChatMessageResponse,
    ToolCall,
)
from frigate.api.defs.tags import Tags
from frigate.api.event import _build_attribute_filter_clause, events
from frigate.config import FrigateConfig
from frigate.genai.prompts import (
    build_chat_system_prompt,
    get_attribute_classifications,
    get_tool_definitions,
)
from frigate.genai.utils import build_assistant_message_for_conversation
from frigate.jobs.vlm_watch import (
    get_vlm_watch_job,
    start_vlm_watch_job,
    stop_vlm_watch_job,
)
from frigate.models import Event

logger = logging.getLogger(__name__)

router = APIRouter(tags=[Tags.chat])


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


@router.get(
    "/chat/tools",
    dependencies=[Depends(allow_any_authenticated())],
    summary="Get available tools",
    description="Returns OpenAI-compatible tool definitions for function calling.",
)
def get_tools(request: Request) -> JSONResponse:
    """Get list of available tools for LLM function calling."""
    config = request.app.frigate_config
    semantic_search_enabled = bool(getattr(config.semantic_search, "enabled", False))
    attribute_classifications = get_attribute_classifications(config)
    tools = get_tool_definitions(
        semantic_search_enabled=semantic_search_enabled,
        attribute_classifications=attribute_classifications,
    )
    return JSONResponse(content={"tools": tools})


def _resolve_zones(
    zones: List[str],
    config: FrigateConfig,
    target_cameras: List[str],
) -> List[str]:
    """Map zone names to their canonical config keys, case-insensitively.

    LLMs frequently echo a user's casing ("Front Yard") instead of the
    configured key ("front_yard"). The downstream zone filter is a SQLite GLOB
    over the JSON-encoded zones column, which is case-sensitive — so an
    unnormalized name silently returns zero matches. Build a lookup over the
    relevant cameras' configured zones and substitute when we find a match;
    unknown names pass through so behavior matches what the model asked for.
    """
    if not zones:
        return zones

    lookup: Dict[str, str] = {}
    for camera_id in target_cameras:
        camera_config = config.cameras.get(camera_id)
        if camera_config is None:
            continue
        for zone_name in camera_config.zones.keys():
            lookup.setdefault(zone_name.lower(), zone_name)

    return [lookup.get(z.lower(), z) for z in zones]


async def _execute_search_objects(
    request: Request,
    arguments: Dict[str, Any],
    allowed_cameras: List[str],
) -> JSONResponse:
    """
    Execute the search_objects tool.

    Routes to the semantic path when the LLM supplied a `semantic_query`
    and semantic search is enabled; otherwise delegates to the standard
    events API logic.
    """
    config = request.app.frigate_config
    semantic_query = arguments.get("semantic_query")
    if isinstance(semantic_query, str):
        semantic_query = semantic_query.strip() or None
    else:
        semantic_query = None

    if semantic_query and getattr(config.semantic_search, "enabled", False):
        return await _execute_search_objects_semantic(
            request, arguments, allowed_cameras, semantic_query
        )

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
        camera_arg = arguments.get("camera")
        target_cameras = (
            [camera_arg] if camera_arg and camera_arg != "all" else allowed_cameras
        )
        zones = _resolve_zones(zones, config, target_cameras)
        zones = ",".join(zones)
    elif zones is None:
        zones = "all"

    attribute = arguments.get("attribute")

    # Build query parameters compatible with EventsQueryParams
    query_params = EventsQueryParams(
        cameras=arguments.get("camera", "all"),
        labels=arguments.get("label", "all"),
        sub_labels=arguments.get("sub_label", "all"),  # case-insensitive on the backend
        attributes=attribute if attribute else "all",
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


async def _execute_search_objects_semantic(
    request: Request,
    arguments: Dict[str, Any],
    allowed_cameras: List[str],
    semantic_query: str,
) -> JSONResponse:
    """Search objects via fused thumbnail + description embeddings.

    Runs both visual and description vec searches against `semantic_query`,
    intersects the candidates with the structured filters (camera, label,
    sub_label, zones, time window) the LLM supplied, and ranks the survivors
    by fused similarity. Mirrors the candidate-then-filter pattern used by
    find_similar_objects since sqlite-vec's IN filter is unreliable.
    """
    from peewee import fn

    config = request.app.frigate_config
    context = request.app.embeddings
    if context is None:
        logger.warning(
            "semantic_query supplied but embeddings context is unavailable; "
            "returning empty results."
        )
        return JSONResponse(content=[])

    after = parse_iso_to_timestamp(arguments.get("after"))
    before = parse_iso_to_timestamp(arguments.get("before"))

    camera_arg = arguments.get("camera")
    if camera_arg and camera_arg != "all":
        if camera_arg not in allowed_cameras:
            return JSONResponse(content=[])
        cameras = [camera_arg]
    else:
        cameras = list(allowed_cameras) if allowed_cameras else []

    if not cameras:
        return JSONResponse(content=[])

    label = arguments.get("label")
    sub_label = arguments.get("sub_label")
    attribute = arguments.get("attribute")

    zones = arguments.get("zones")
    if isinstance(zones, list) and zones:
        zones = _resolve_zones(zones, config, cameras)
    else:
        zones = None

    limit = int(arguments.get("limit", 25))
    limit = max(1, min(limit, 100))

    visual_distances: Dict[str, float] = {}
    description_distances: Dict[str, float] = {}
    try:
        rows = context.search_thumbnail(semantic_query)
        visual_distances = {row[0]: row[1] for row in rows}
    except Exception:
        logger.exception(
            "search_thumbnail failed for semantic_query: %s", semantic_query
        )

    try:
        rows = context.search_description(semantic_query)
        description_distances = {row[0]: row[1] for row in rows}
    except Exception:
        logger.exception(
            "search_description failed for semantic_query: %s", semantic_query
        )

    vec_ids = set(visual_distances) | set(description_distances)
    if not vec_ids:
        return JSONResponse(content=[])

    clauses = [Event.id.in_(list(vec_ids)), Event.camera.in_(cameras)]
    if after is not None:
        clauses.append(Event.start_time >= after)
    if before is not None:
        clauses.append(Event.start_time <= before)
    if label:
        clauses.append(Event.label == label)
    if sub_label:
        # case-insensitive match to mirror events() behavior
        clauses.append(fn.LOWER(Event.sub_label.cast("text")) == sub_label.lower())
    if attribute:
        attribute_clause = _build_attribute_filter_clause(attribute)
        if attribute_clause is not None:
            clauses.append(attribute_clause)
    if zones:
        zone_clauses = [Event.zones.cast("text") % f'*"{zone}"*' for zone in zones]
        clauses.append(reduce(operator.or_, zone_clauses))

    eligible = {e.id: e for e in Event.select().where(reduce(operator.and_, clauses))}

    scored: List[tuple[str, float]] = []
    for eid in eligible:
        v_score = (
            distance_to_score(visual_distances[eid], context.thumb_stats)
            if eid in visual_distances
            else None
        )
        d_score = (
            distance_to_score(description_distances[eid], context.desc_stats)
            if eid in description_distances
            else None
        )
        fused = fuse_scores(v_score, d_score)
        if fused is None:
            continue
        scored.append((eid, fused))

    scored.sort(key=lambda pair: pair[1], reverse=True)
    scored = scored[:limit]

    results = [hydrate_event(eligible[eid], score=score) for eid, score in scored]
    return JSONResponse(content=results)


async def _execute_find_similar_objects(
    request: Request,
    arguments: Dict[str, Any],
    allowed_cameras: List[str],
) -> Dict[str, Any]:
    """Execute the find_similar_objects tool.

    Returns a plain dict (not JSONResponse) so the chat loop can embed it
    directly in tool-result messages.
    """
    # 1. Semantic search enabled?
    config = request.app.frigate_config
    if not getattr(config.semantic_search, "enabled", False):
        return {
            "error": "semantic_search_disabled",
            "message": (
                "Semantic search must be enabled to find similar objects. "
                "Enable it in the Frigate config under semantic_search."
            ),
        }

    context = request.app.embeddings
    if context is None:
        return {
            "error": "semantic_search_disabled",
            "message": "Embeddings context is not available.",
        }

    # 2. Anchor lookup.
    event_id = arguments.get("event_id")
    if not event_id:
        return {"error": "missing_event_id", "message": "event_id is required."}

    try:
        anchor = Event.get(Event.id == event_id)
    except Event.DoesNotExist:
        return {
            "error": "anchor_not_found",
            "message": f"Could not find event {event_id}.",
        }

    # 3. Parse params.
    after = parse_iso_to_timestamp(arguments.get("after"))
    before = parse_iso_to_timestamp(arguments.get("before"))

    cameras = arguments.get("cameras")
    if cameras:
        # Respect RBAC: intersect with the user's allowed cameras.
        cameras = [c for c in cameras if c in allowed_cameras]
    else:
        cameras = list(allowed_cameras) if allowed_cameras else None

    labels = arguments.get("labels") or [anchor.label]
    sub_labels = arguments.get("sub_labels")
    zones = arguments.get("zones")

    if zones:
        zones = _resolve_zones(
            zones, request.app.frigate_config, cameras or list(allowed_cameras)
        )

    similarity_mode = arguments.get("similarity_mode", "fused")
    if similarity_mode not in ("visual", "semantic", "fused"):
        similarity_mode = "fused"

    min_score = arguments.get("min_score")
    limit = int(arguments.get("limit", 10))
    limit = max(1, min(limit, 50))

    # 4. Run similarity searches. We deliberately do NOT pass event_ids into
    # the vec queries — the IN filter on sqlite-vec is broken in the installed
    # version (see frigate/embeddings/__init__.py). Mirror the pattern used by
    # frigate/api/event.py events_search: fetch top-k globally, then intersect
    # with the structured filters via Peewee.
    visual_distances: Dict[str, float] = {}
    description_distances: Dict[str, float] = {}

    try:
        if similarity_mode in ("visual", "fused"):
            rows = context.search_thumbnail(anchor)
            visual_distances = {row[0]: row[1] for row in rows}

        if similarity_mode in ("semantic", "fused"):
            query_text = (
                (anchor.data or {}).get("description")
                or anchor.sub_label
                or anchor.label
            )
            rows = context.search_description(query_text)
            description_distances = {row[0]: row[1] for row in rows}
    except Exception:
        logger.exception("Similarity search failed")
        return {
            "error": "similarity_search_failed",
            "message": "Failed to run similarity search.",
        }

    vec_ids = set(visual_distances) | set(description_distances)
    vec_ids.discard(anchor.id)
    # vec layer returns up to k=100 per modality; flag when we hit that ceiling
    # so the LLM can mention there may be more matches beyond what we saw.
    candidate_truncated = (
        len(visual_distances) >= 100 or len(description_distances) >= 100
    )

    if not vec_ids:
        return {
            "anchor": hydrate_event(anchor),
            "results": [],
            "similarity_mode": similarity_mode,
            "candidate_truncated": candidate_truncated,
        }

    # 5. Apply structured filters, intersected with vec hits.
    clauses = [Event.id.in_(list(vec_ids))]
    if after is not None:
        clauses.append(Event.start_time >= after)
    if before is not None:
        clauses.append(Event.start_time <= before)
    if cameras:
        clauses.append(Event.camera.in_(cameras))
    if labels:
        clauses.append(Event.label.in_(labels))
    if sub_labels:
        clauses.append(Event.sub_label.in_(sub_labels))
    if zones:
        # Mirror the pattern used by frigate/api/event.py for JSON-array zone match.
        zone_clauses = [Event.zones.cast("text") % f'*"{zone}"*' for zone in zones]
        clauses.append(reduce(operator.or_, zone_clauses))

    eligible = {e.id: e for e in Event.select().where(reduce(operator.and_, clauses))}

    # 6. Fuse and rank.
    scored: List[tuple[str, float]] = []
    for eid in eligible:
        v_score = (
            distance_to_score(visual_distances[eid], context.thumb_stats)
            if eid in visual_distances
            else None
        )
        d_score = (
            distance_to_score(description_distances[eid], context.desc_stats)
            if eid in description_distances
            else None
        )
        fused = fuse_scores(v_score, d_score)
        if fused is None:
            continue
        if min_score is not None and fused < min_score:
            continue
        scored.append((eid, fused))

    scored.sort(key=lambda pair: pair[1], reverse=True)
    scored = scored[:limit]

    results = [hydrate_event(eligible[eid], score=score) for eid, score in scored]

    return {
        "anchor": hydrate_event(anchor),
        "results": results,
        "similarity_mode": similarity_mode,
        "candidate_truncated": candidate_truncated,
    }


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

    if tool_name == "find_similar_objects":
        result = await _execute_find_similar_objects(
            request, arguments, allowed_cameras
        )
        status_code = 200 if "error" not in result else 400
        return JSONResponse(content=result, status_code=status_code)

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
    # Reject wildcards explicitly so models retry with a real camera name
    # instead of silently fanning out across every camera.
    if camera in ("*", "all"):
        return {
            "error": (
                "get_live_context requires a single camera name; wildcards "
                "are not supported. Call this tool once per camera."
            ),
            "available_cameras": allowed_cameras,
        }

    if camera not in allowed_cameras:
        return {
            "error": f"Camera '{camera}' not found or access denied",
            "available_cameras": allowed_cameras,
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

        # Grab live frame when the chat model supports vision
        image_url = await _get_live_frame_image_url(request, camera, allowed_cameras)
        if image_url:
            chat_client = request.app.genai_manager.chat_client
            if chat_client is not None and chat_client.supports_vision:
                # Pass image URL so it can be injected as a user message
                # (images can't be in tool results)
                result["_image_url"] = image_url

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
    elif tool_name == "find_similar_objects":
        return await _execute_find_similar_objects(request, arguments, allowed_cameras)
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
            return {
                "error": (
                    "get_live_context requires a single camera name; "
                    "wildcards and empty values are not supported. "
                    "Call this tool once per camera."
                ),
                "available_cameras": allowed_cameras,
            }
        return await _execute_get_live_context(request, camera, allowed_cameras)
    elif tool_name == "start_camera_watch":
        return await _execute_start_camera_watch(request, arguments)
    elif tool_name == "stop_camera_watch":
        return _execute_stop_camera_watch()
    elif tool_name == "get_profile_status":
        return _execute_get_profile_status(request)
    elif tool_name == "get_recap":
        return _execute_get_recap(arguments, allowed_cameras)
    else:
        logger.error(
            "Tool call failed: unknown tool %r. Expected one of: search_objects, find_similar_objects, "
            "get_live_context, start_camera_watch, stop_camera_watch, get_profile_status, get_recap. "
            "Arguments received: %s",
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

    await require_camera_access(camera, request=request)

    if zones:
        zones = _resolve_zones(zones, config, [camera])

    genai_manager = request.app.genai_manager
    chat_client = genai_manager.chat_client
    if chat_client is None or not chat_client.supports_vision:
        return {"error": "VLM watch requires a chat model with vision support."}

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


def _execute_get_profile_status(request: Request) -> Dict[str, Any]:
    """Return profile status including active profile and activation timestamps."""
    profile_manager = getattr(request.app, "profile_manager", None)
    if profile_manager is None:
        return {"error": "Profile manager is not available."}

    info = profile_manager.get_profile_info()

    # Convert timestamps to human-readable local times inline
    last_activated = {}
    for name, ts in info.get("last_activated", {}).items():
        try:
            dt = datetime.fromtimestamp(ts)
            last_activated[name] = dt.strftime("%Y-%m-%d %I:%M:%S %p")
        except (TypeError, ValueError, OSError):
            last_activated[name] = str(ts)

    return {
        "active_profile": info.get("active_profile"),
        "profiles": info.get("profiles", []),
        "last_activated": last_activated,
    }


def _execute_get_recap(
    arguments: Dict[str, Any],
    allowed_cameras: List[str],
) -> Dict[str, Any]:
    """Fetch review segments with GenAI metadata for a time period."""
    from functools import reduce

    from peewee import operator

    from frigate.models import ReviewSegment

    after_str = arguments.get("after")
    before_str = arguments.get("before")

    def _parse_as_local_timestamp(s: str):
        s = s.replace("Z", "").strip()[:19]
        dt = datetime.strptime(s, "%Y-%m-%dT%H:%M:%S")
        return time.mktime(dt.timetuple())

    try:
        after = _parse_as_local_timestamp(after_str)
    except (ValueError, AttributeError, TypeError):
        return {"error": f"Invalid 'after' timestamp: {after_str}"}

    try:
        before = _parse_as_local_timestamp(before_str)
    except (ValueError, AttributeError, TypeError):
        return {"error": f"Invalid 'before' timestamp: {before_str}"}

    cameras = arguments.get("cameras", "all")
    if cameras != "all":
        requested = set(cameras.split(","))
        camera_list = list(requested.intersection(allowed_cameras))
        if not camera_list:
            return {"events": [], "message": "No accessible cameras matched."}
    else:
        camera_list = allowed_cameras

    clauses = [
        (ReviewSegment.start_time < before)
        & ((ReviewSegment.end_time.is_null(True)) | (ReviewSegment.end_time > after)),
        (ReviewSegment.camera << camera_list),
    ]

    severity_filter = arguments.get("severity")
    if severity_filter:
        clauses.append(ReviewSegment.severity == severity_filter)

    try:
        rows = (
            ReviewSegment.select(
                ReviewSegment.camera,
                ReviewSegment.start_time,
                ReviewSegment.end_time,
                ReviewSegment.severity,
                ReviewSegment.data,
            )
            .where(reduce(operator.and_, clauses))
            .order_by(ReviewSegment.start_time.asc())
            .limit(100)
            .dicts()
            .iterator()
        )

        events: List[Dict[str, Any]] = []

        for row in rows:
            data = row.get("data") or {}
            if isinstance(data, str):
                try:
                    data = json.loads(data)
                except json.JSONDecodeError:
                    data = {}

            camera = row["camera"]
            event: Dict[str, Any] = {
                "camera": camera.replace("_", " ").title(),
                "severity": row.get("severity", "detection"),
            }

            # Include GenAI metadata when available
            metadata = data.get("metadata")
            if metadata and isinstance(metadata, dict):
                if metadata.get("title"):
                    event["title"] = metadata["title"]
                if metadata.get("scene"):
                    event["description"] = metadata["scene"]
                threat = metadata.get("potential_threat_level")
                if threat is not None:
                    threat_labels = {
                        0: "normal",
                        1: "needs_review",
                        2: "security_concern",
                    }
                    event["threat_level"] = threat_labels.get(threat, str(threat))

            # Only include objects/zones/audio when there's no GenAI description
            # to keep the payload concise — the description already covers these
            if "description" not in event:
                objects = data.get("objects", [])
                if objects:
                    event["objects"] = objects
                zones = data.get("zones", [])
                if zones:
                    event["zones"] = zones
                audio = data.get("audio", [])
                if audio:
                    event["audio"] = audio

            start_ts = row.get("start_time")
            end_ts = row.get("end_time")
            if start_ts is not None:
                try:
                    event["time"] = datetime.fromtimestamp(start_ts).strftime(
                        "%I:%M %p"
                    )
                except (TypeError, ValueError, OSError):
                    pass
            if end_ts is not None and start_ts is not None:
                try:
                    event["duration_seconds"] = round(end_ts - start_ts)
                except (TypeError, ValueError):
                    pass

            events.append(event)

        if not events:
            return {
                "events": [],
                "message": "No activity was found during this time period.",
            }

        return {"events": events}
    except Exception as e:
        logger.error("Error executing get_recap: %s", e, exc_info=True)
        return {"error": "Failed to fetch recap data."}


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
                tool_result = format_events_with_local_time(tool_result)
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
    genai_client = request.app.genai_manager.chat_client
    if not genai_client:
        return JSONResponse(
            content={
                "error": "GenAI is not configured. Please configure a GenAI provider in your Frigate config.",
            },
            status_code=400,
        )

    config = request.app.frigate_config
    semantic_search_enabled = bool(getattr(config.semantic_search, "enabled", False))
    attribute_classifications = get_attribute_classifications(config)
    tools = get_tool_definitions(
        semantic_search_enabled=semantic_search_enabled,
        attribute_classifications=attribute_classifications,
    )
    conversation = []

    system_prompt = build_chat_system_prompt(
        config=config,
        allowed_cameras=allowed_cameras,
        semantic_search_enabled=semantic_search_enabled,
        attribute_classifications=attribute_classifications,
    )

    conversation.append(
        {
            "role": "system",
            "content": system_prompt,
        }
    )

    for msg in body.messages:
        msg_dict: Dict[str, Any] = {
            "role": msg.role,
            "content": msg.content,
        }
        if msg.tool_call_id:
            msg_dict["tool_call_id"] = msg.tool_call_id
        if msg.name:
            msg_dict["name"] = msg.name
        # Replayed assistant turns carry their original tool_calls so the
        # rendered prefix matches the prior turn exactly (prompt caching).
        if msg.tool_calls is not None:
            msg_dict["tool_calls"] = msg.tool_calls

        conversation.append(msg_dict)

    # Everything appended from here on belongs to the assistant turn we are
    # about to generate. We hand this slice back to the client so it can replay
    # it verbatim on the next turn, keeping the cached prompt prefix intact.
    turn_start_len = len(conversation)

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

            def _emit_replay_messages(extra: Optional[List[Dict[str, Any]]] = None):
                # Hand the client the exact messages appended for this assistant
                # turn (assistant tool-call turns, tool results, injected image
                # messages, and the final assistant message) so it can replay
                # them verbatim next turn and keep the prompt cache warm.
                turn_messages = conversation[turn_start_len:] + (extra or [])
                return (
                    json.dumps({"type": "messages", "messages": turn_messages}).encode(
                        "utf-8"
                    )
                    + b"\n"
                )

            while stream_iterations < max_iterations:
                if await request.is_disconnected():
                    logger.debug("Client disconnected, stopping chat stream")
                    return
                logger.debug(
                    f"Streaming LLM (iteration {stream_iterations + 1}/{max_iterations}) "
                    f"with {len(conversation)} message(s)"
                )
                async for event in genai_client.chat_with_tools_stream(
                    messages=conversation,
                    tools=tools if tools else None,
                    tool_choice="auto",
                    enable_thinking=body.enable_thinking,
                ):
                    if await request.is_disconnected():
                        logger.debug("Client disconnected, stopping chat stream")
                        return
                    kind, value = event
                    if kind == "content_delta":
                        yield (
                            json.dumps({"type": "content", "delta": value}).encode(
                                "utf-8"
                            )
                            + b"\n"
                        )
                    elif kind == "reasoning_delta":
                        yield (
                            json.dumps({"type": "reasoning", "delta": value}).encode(
                                "utf-8"
                            )
                            + b"\n"
                        )
                    elif kind == "stats":
                        yield (
                            json.dumps({"type": "stats", **value}).encode("utf-8")
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
                            if await request.is_disconnected():
                                logger.debug(
                                    "Client disconnected before tool execution"
                                )
                                return
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
                            # Final answer: the streaming loop never appends the
                            # last assistant message to `conversation`, so add it
                            # to the replay slice explicitly.
                            final_assistant = {
                                "role": "assistant",
                                "content": msg.get("content"),
                            }
                            yield _emit_replay_messages(extra=[final_assistant])
                            yield (json.dumps({"type": "done"}).encode("utf-8") + b"\n")
                            return
            else:
                # Max iterations reached: replay whatever we accumulated so the
                # next turn still starts from a cache-friendly prefix.
                yield _emit_replay_messages()
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
                enable_thinking=body.enable_thinking,
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
                    final_reasoning = response.get("reasoning")

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
                        # Emit the full reasoning trace up front when the
                        # underlying client did not stream it
                        if final_reasoning:
                            yield (
                                json.dumps(
                                    {"type": "reasoning", "delta": final_reasoning}
                                ).encode("utf-8")
                                + b"\n"
                            )
                        # Stream content in word-sized chunks for smooth UX
                        for part in chunk_content(final_content):
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
                            reasoning=response.get("reasoning"),
                            tool_calls=None,
                        ),
                        finish_reason=response.get("finish_reason", "stop"),
                        tool_iterations=tool_iterations,
                        tool_calls=tool_calls,
                        messages=conversation[turn_start_len:],
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
                messages=conversation[turn_start_len:],
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

    await require_camera_access(body.camera, request=request)

    chat_client = genai_manager.chat_client
    if chat_client is None or not chat_client.supports_vision:
        return JSONResponse(
            content={
                "success": False,
                "message": "VLM watch requires a chat model with vision support.",
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
            username=request.headers.get("remote-user", ""),
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
async def get_vlm_monitor(request: Request) -> JSONResponse:
    job = get_vlm_watch_job()
    if job is None:
        return JSONResponse(content={"active": False}, status_code=200)

    role = request.headers.get("remote-role", "viewer")
    username = request.headers.get("remote-user", "")

    # Admin and the job's creator always see the job. Other users only see it
    # if they have access to the camera being watched; otherwise hide it.
    if role != "admin" and username != job.username:
        try:
            await require_camera_access(job.camera, request=request)
        except HTTPException:
            return JSONResponse(content={"active": False}, status_code=200)

    return JSONResponse(content={"active": True, **job.to_dict()}, status_code=200)


@router.delete(
    "/vlm/monitor",
    dependencies=[Depends(allow_any_authenticated())],
    summary="Cancel the current VLM watch job",
    description="Cancels the running watch job if one exists.",
)
async def cancel_vlm_monitor(request: Request) -> JSONResponse:
    job = get_vlm_watch_job()
    if job is None:
        return JSONResponse(
            content={"success": False, "message": "No active watch job to cancel."},
            status_code=404,
        )

    role = request.headers.get("remote-role", "viewer")
    username = request.headers.get("remote-user", "")

    # Admin can cancel any job; other users can only cancel jobs they started.
    if role != "admin" and username != job.username:
        return JSONResponse(
            content={
                "success": False,
                "message": "Not authorized to cancel this watch job.",
            },
            status_code=403,
        )

    cancelled = stop_vlm_watch_job()
    if not cancelled:
        return JSONResponse(
            content={"success": False, "message": "No active watch job to cancel."},
            status_code=404,
        )
    return JSONResponse(content={"success": True}, status_code=200)
