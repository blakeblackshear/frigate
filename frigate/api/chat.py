"""Chat and LLM tool calling APIs."""

import base64
import json
import logging
import operator
import time
from datetime import datetime
from functools import reduce
from typing import Any, Literal

import cv2
import numpy as np
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
    format_local_time,
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
    ToolCallInvocation,
)
from frigate.api.defs.tags import Tags
from frigate.api.event import _build_attribute_filter_clause, events
from frigate.api.export import _build_export_job, _validate_export_source
from frigate.config import FrigateConfig
from frigate.config.classification import SemanticSearchModelEnum
from frigate.genai.prompts import (
    build_chat_system_prompt,
    get_attribute_classifications,
    get_tool_definitions,
    get_write_tool_names,
    strip_tool_access,
)
from frigate.genai.utils import (
    build_assistant_message_for_conversation,
    parse_tool_calls_from_message,
)
from frigate.jobs.export import ExportQueueFullError, start_export_job
from frigate.jobs.vlm_watch import (
    get_vlm_watch_job,
    start_vlm_watch_job,
    stop_vlm_watch_job,
)
from frigate.models import Event, Export, ExportCase
from frigate.record.export import PlaybackSourceEnum
from frigate.util.file import get_event_thumbnail_bytes, load_event_snapshot_image
from frigate.util.object_names import get_categorized_object_names

logger = logging.getLogger(__name__)

router = APIRouter(tags=[Tags.chat])

# Tool result recorded for a rejected write tool call. Providers require a
# result for every requested call; the user's intent is conveyed in a
# follow-up user message built by _rejection_message.
TOOL_REJECTED_RESULT: dict[str, str] = {"error": "user_rejected"}


class ToolExecuteRequest(BaseModel):
    """Request model for tool execution."""

    tool_name: str
    arguments: dict[str, Any]


class VLMMonitorRequest(BaseModel):
    """Request model for starting a VLM watch job."""

    camera: str
    condition: str
    max_duration_minutes: int = 60
    labels: list[str] = []
    zones: list[str] = []


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
        embeddings_language=_embeddings_language(config),
    )
    return JSONResponse(content={"tools": tools})


def _embeddings_language(config: FrigateConfig) -> Literal["english", "multi"]:
    """Return the language capability of the configured embeddings model.

    JinaV1 is English-only; every other option (JinaV2 or a GenAI embeddings
    provider) handles multiple languages.
    """
    if config.semantic_search.model == SemanticSearchModelEnum.jinav1:
        return "english"

    return "multi"


def _resolve_zones(
    zones: list[str],
    config: FrigateConfig,
    target_cameras: list[str],
) -> list[str]:
    """Map zone names to their canonical config keys, case-insensitively.

    LLMs frequently echo a user's casing ("Front Yard") instead of the
    configured key ("front_yard"), or fall back to a zone's friendly name
    ("Front Walkway") instead of its ID ("front_walk"). The downstream zone
    filter is a SQLite GLOB over the JSON-encoded zones column, which stores
    config keys and is case-sensitive — so an unnormalized name silently
    returns zero matches. Build a lookup over the relevant cameras' configured
    zones, keyed by both the config key and the friendly name, and substitute
    when we find a match; unknown names pass through so behavior matches what
    the model asked for.
    """
    if not zones:
        return zones

    lookup: dict[str, str] = {}
    for camera_id in target_cameras:
        camera_config = config.cameras.get(camera_id)
        if camera_config is None:
            continue
        for zone_name, zone_config in camera_config.zones.items():
            lookup.setdefault(zone_name.lower(), zone_name)
            lookup.setdefault(
                zone_config.get_formatted_name(zone_name).lower(), zone_name
            )

    return [lookup.get(z.lower(), z) for z in zones]


async def _execute_search_objects(
    request: Request,
    arguments: dict[str, Any],
    allowed_cameras: list[str],
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
        logger.exception(f"Error executing search_objects: {e}")
        return JSONResponse(
            content={
                "success": False,
                "message": "Error searching objects",
            },
            status_code=500,
        )


async def _execute_search_objects_semantic(
    request: Request,
    arguments: dict[str, Any],
    allowed_cameras: list[str],
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

    visual_distances: dict[str, float] = {}
    description_distances: dict[str, float] = {}
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

    scored: list[tuple[str, float]] = []
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
    arguments: dict[str, Any],
    allowed_cameras: list[str],
) -> dict[str, Any]:
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
    visual_distances: dict[str, float] = {}
    description_distances: dict[str, float] = {}

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
    scored: list[tuple[str, float]] = []
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
    allowed_cameras: list[str] = Depends(get_allowed_cameras_for_filter),
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

    if tool_name == "get_categorized_object_names":
        return JSONResponse(
            content=_execute_get_categorized_object_names(request, allowed_cameras)
        )

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
    allowed_cameras: list[str],
) -> dict[str, Any]:
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
        camera_state = frame_processor.get_camera_state(camera)

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

        result: dict[str, Any] = {
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
        logger.exception(f"Error executing get_live_context: {e}")
        return {
            "error": "Error getting live context",
        }


async def _get_live_frame_image_url(
    request: Request,
    camera: str,
    allowed_cameras: list[str],
) -> str | None:
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
        if frame_processor.get_camera_state(camera) is None:
            return None
        frame = frame_processor.get_current_frame(camera, {})
        if frame is None:
            return None
        return _encode_frame_data_url(frame)
    except Exception as e:
        logger.debug("Failed to get live frame for %s: %s", camera, e)
        return None


def _encode_frame_data_url(frame: np.ndarray, target_height: int = 480) -> str:
    """Downscale a BGR frame and encode it as a JPEG data URL for the model."""
    height, width = frame.shape[:2]
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


def _request_roles(request: Request) -> list[str]:
    """Roles from the auth proxy header, split on the configured separator."""
    separator = request.app.frigate_config.proxy.separator
    header = request.headers.get("remote-role", "")
    return [r.strip() for r in header.split(separator) if r.strip()]


async def _execute_set_camera_state(
    request: Request,
    arguments: dict[str, Any],
) -> dict[str, Any]:
    if "admin" not in _request_roles(request):
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


def _execute_get_categorized_object_names(
    request: Request,
    allowed_cameras: list[str],
) -> dict[str, Any]:
    names = get_categorized_object_names(request.app.frigate_config, allowed_cameras)

    if not names:
        return {
            "names": {},
            "message": "No names configured; search by label or semantic_query.",
        }

    return {"names": names}


def _execute_get_export_cases(allowed_cameras: list[str]) -> dict[str, Any]:
    """List export cases with how many accessible exports each one holds."""
    from peewee import fn

    count_rows = (
        Export.select(Export.export_case, fn.COUNT(Export.id))
        .where(Export.camera << allowed_cameras, Export.export_case.is_null(False))
        .group_by(Export.export_case)
        .tuples()
    )
    counts = {case_id: count for case_id, count in count_rows}

    cases: list[dict[str, Any]] = []
    for case in ExportCase.select().order_by(ExportCase.created_at.desc()):
        created_at = case.created_at
        cases.append(
            {
                "id": case.id,
                "name": case.name,
                "description": case.description,
                "created_at_local": format_local_time(created_at.timestamp())
                if isinstance(created_at, datetime)
                else str(created_at),
                "export_count": counts.get(case.id, 0),
            }
        )

    if not cases:
        return {"cases": [], "message": "No export cases exist yet."}

    return {"cases": cases}


async def _execute_create_export(
    request: Request,
    arguments: dict[str, Any],
    allowed_cameras: list[str],
) -> dict[str, Any]:
    """Queue a recording export, optionally attached to an existing case."""
    config = request.app.frigate_config
    camera = (arguments.get("camera") or "").strip()
    start_time = parse_iso_to_timestamp(arguments.get("start_time"))
    end_time = parse_iso_to_timestamp(arguments.get("end_time"))
    name = (arguments.get("name") or "").strip() or None

    if not camera or start_time is None or end_time is None:
        return {"error": "camera, start_time, and end_time are all required."}

    if camera not in config.cameras:
        return {"error": f"Camera '{camera}' not found."}

    if camera not in allowed_cameras:
        return {"error": f"Camera '{camera}' not found or access denied"}

    if end_time <= start_time:
        return {"error": "end_time must be after start_time."}

    try:
        playback_source = PlaybackSourceEnum(arguments.get("source") or "recordings")
    except ValueError:
        return {"error": "source must be 'recordings' or 'preview'."}

    # Mirror the export API: attaching to an existing case is admin-only
    # until case-level ACLs exist.
    export_case_id = (arguments.get("export_case_id") or "").strip() or None
    if export_case_id is not None:
        if "admin" not in _request_roles(request):
            return {"error": "Only admins can attach exports to an existing case."}
        try:
            ExportCase.get(ExportCase.id == export_case_id)
        except ExportCase.DoesNotExist:
            return {"error": f"Export case '{export_case_id}' not found."}

    source_error = _validate_export_source(
        camera, start_time, end_time, playback_source
    )
    if source_error is not None:
        return {"error": source_error}

    export_job = _build_export_job(
        camera,
        start_time,
        end_time,
        name,
        None,
        playback_source,
        export_case_id,
        chapters=config.cameras[camera].record.export.chapters,
    )
    try:
        start_export_job(config, export_job)
    except ExportQueueFullError:
        return {"error": "Export queue is full. Try again once current exports finish."}

    return {
        "success": True,
        "export_id": export_job.id,
        "status": "queued",
        "camera": camera,
        "name": name,
        "source": playback_source.value,
        "start_time_local": format_local_time(start_time),
        "end_time_local": format_local_time(end_time),
        "export_case_id": export_case_id,
        "message": "Export queued. It will appear on the Export page when finished.",
    }


async def _execute_get_event_image(
    request: Request,
    arguments: dict[str, Any],
    allowed_cameras: list[str],
) -> dict[str, Any]:
    """Attach an event's thumbnail or snapshot for a vision model to view."""
    event_id = (arguments.get("event_id") or "").strip()
    if not event_id:
        return {"error": "event_id is required."}

    image_type = arguments.get("image") or "thumbnail"
    if image_type not in ("thumbnail", "snapshot"):
        return {"error": "image must be 'thumbnail' or 'snapshot'."}

    try:
        event = Event.get(Event.id == event_id)
    except Event.DoesNotExist:
        return {"error": f"Could not find event {event_id}."}

    if event.camera not in allowed_cameras:
        return {"error": f"Event {event_id} not found or access denied"}

    chat_client = request.app.genai_manager.chat_client
    if chat_client is None or not chat_client.supports_vision:
        return {
            "error": (
                "The configured chat model does not support vision, so images "
                "cannot be viewed."
            )
        }

    note = None
    frame = None
    if image_type == "snapshot":
        if event.has_snapshot:
            frame, _ = load_event_snapshot_image(event)
        if frame is None:
            note = "Snapshot not available; returning the thumbnail instead."
            image_type = "thumbnail"

    if frame is None:
        thumbnail = get_event_thumbnail_bytes(event)
        if thumbnail:
            frame = cv2.imdecode(
                np.frombuffer(thumbnail, dtype=np.uint8), cv2.IMREAD_COLOR
            )

    if frame is None:
        return {"error": f"No image is available for event {event_id}."}

    result: dict[str, Any] = {
        "id": event.id,
        "camera": event.camera,
        "label": event.label,
        "sub_label": event.sub_label,
        "zones": event.zones,
        "start_time_local": format_local_time(event.start_time),
        "image": image_type,
    }
    if event.end_time is not None:
        result["end_time_local"] = format_local_time(event.end_time)
    description = (event.data or {}).get("description")
    if description:
        result["description"] = description
    if note:
        result["note"] = note

    result["_image_url"] = _encode_frame_data_url(frame)
    result["_image_text"] = (
        f"Here is the {image_type} for event {event.id} "
        f"({event.sub_label or event.label} on {event.camera})."
    )
    return result


async def _execute_tool_internal(
    tool_name: str,
    arguments: dict[str, Any],
    request: Request,
    allowed_cameras: list[str],
) -> dict[str, Any]:
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
    elif tool_name == "get_categorized_object_names":
        return _execute_get_categorized_object_names(request, allowed_cameras)
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
    elif tool_name == "get_export_cases":
        return _execute_get_export_cases(allowed_cameras)
    elif tool_name == "create_export":
        return await _execute_create_export(request, arguments, allowed_cameras)
    elif tool_name == "get_event_image":
        return await _execute_get_event_image(request, arguments, allowed_cameras)
    else:
        logger.error(
            "Tool call failed: unknown tool %r. Expected one of: search_objects, find_similar_objects, "
            "get_categorized_object_names, get_live_context, start_camera_watch, stop_camera_watch, "
            "get_profile_status, get_recap, get_export_cases, create_export, get_event_image. "
            "Arguments received: %s",
            tool_name,
            json.dumps(arguments),
        )
        return {"error": f"Unknown tool: {tool_name}"}


async def _execute_start_camera_watch(
    request: Request,
    arguments: dict[str, Any],
) -> dict[str, Any]:
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
        logger.exception("Failed to start VLM watch job: %s", e)
        return {"error": "Failed to start VLM watch job."}

    return {
        "success": True,
        "job_id": job_id,
        "message": (
            f"Now watching '{camera}' for: {condition}. "
            f"You'll receive a notification when the condition is met (timeout: {max_duration_minutes} min)."
        ),
    }


def _execute_stop_camera_watch() -> dict[str, Any]:
    cancelled = stop_vlm_watch_job()
    if cancelled:
        return {"success": True, "message": "Watch job cancelled."}
    return {"success": False, "message": "No active watch job to cancel."}


def _execute_get_profile_status(request: Request) -> dict[str, Any]:
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
    arguments: dict[str, Any],
    allowed_cameras: list[str],
) -> dict[str, Any]:
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

        events: list[dict[str, Any]] = []

        for row in rows:
            data = row.get("data") or {}
            if isinstance(data, str):
                try:
                    data = json.loads(data)
                except json.JSONDecodeError:
                    data = {}

            camera = row["camera"]
            event: dict[str, Any] = {
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
        logger.exception("Error executing get_recap: %s", e)
        return {"error": "Failed to fetch recap data."}


def _pending_tool_calls_from_tail(
    conversation: list[dict[str, Any]],
) -> list[dict[str, Any]] | None:
    """Return the tool calls of a trailing assistant message, if any.

    A conversation that ends with an assistant message requesting tools is a
    resume after an approval pause: the client sends the chain back with its
    decisions and the loop runs those calls before asking the model again.
    """
    if not conversation:
        return None
    tail = conversation[-1]
    if tail.get("role") != "assistant" or not tail.get("tool_calls"):
        return None
    return parse_tool_calls_from_message(tail)


def _tool_calls_awaiting_approval(
    pending_tool_calls: list[dict[str, Any]],
    body: ChatCompletionRequest,
    write_tools: set[str],
) -> list[dict[str, Any]]:
    """Return the write tool calls the user still has to decide on."""
    return [
        {
            "id": tc["id"],
            "name": tc["name"],
            "arguments": tc.get("arguments") or {},
        }
        for tc in pending_tool_calls
        if tc["name"] in write_tools and tc["id"] not in body.tool_decisions
    ]


def _rejection_message(tool_names: list[str]) -> dict[str, Any]:
    """User message telling the model a rejected call should not proceed.

    Uses list-form content so the UI, which only renders string user
    content, does not show it as something the user typed.
    """
    names = ", ".join(name.replace("_", " ") for name in tool_names)
    return {
        "role": "user",
        "content": [
            {
                "type": "text",
                "text": (
                    f"I do not want to proceed with the {names} call. Ask me for "
                    "clarification or suggest adjustments instead of running it."
                ),
            }
        ],
    }


async def _execute_pending_tools(
    pending_tool_calls: list[dict[str, Any]],
    request: Request,
    allowed_cameras: list[str],
    decisions: dict[str, str] | None = None,
) -> tuple[list[ToolCall], list[dict[str, Any]], list[dict[str, Any]]]:
    """
    Execute a list of tool calls.

    Calls the user rejected (per `decisions`) are not executed; they get a
    placeholder result and a user message saying not to proceed is appended
    after the tool results.

    Returns:
        (ToolCall list for API response,
         tool result dicts for conversation,
         extra messages to inject after tool results — e.g. user messages with images)
    """
    tool_calls_out: list[ToolCall] = []
    tool_results: list[dict[str, Any]] = []
    extra_messages: list[dict[str, Any]] = []
    rejected_tools: list[str] = []
    for tool_call in pending_tool_calls:
        tool_name = tool_call["name"]
        tool_args = tool_call.get("arguments") or {}
        tool_call_id = tool_call["id"]
        if decisions and decisions.get(tool_call_id) == "reject":
            logger.debug(
                "Tool %s (id: %s) was rejected by the user", tool_name, tool_call_id
            )
            rejected_tools.append(tool_name)
            rejected_content = json.dumps(TOOL_REJECTED_RESULT)
            tool_calls_out.append(
                ToolCall(name=tool_name, arguments=tool_args, response=rejected_content)
            )
            tool_results.append(
                {
                    "role": "tool",
                    "tool_call_id": tool_call_id,
                    "content": rejected_content,
                }
            )
            continue
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

            # Extract _image_url from tool results — images can only be sent
            # in user messages, not tool results
            if isinstance(tool_result, dict) and "_image_url" in tool_result:
                image_url = tool_result.pop("_image_url")
                image_text = tool_result.pop("_image_text", None) or (
                    "Here is the current live image from camera "
                    f"'{tool_result.get('camera', 'unknown')}'."
                )
                extra_messages.append(
                    {
                        "role": "user",
                        "content": [
                            {
                                "type": "text",
                                "text": image_text,
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
            logger.exception(
                "Error executing tool %s (id: %s): %s. Arguments: %s",
                tool_name,
                tool_call_id,
                e,
                json.dumps(tool_args),
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
    if rejected_tools:
        extra_messages.append(_rejection_message(rejected_tools))
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
    allowed_cameras: list[str] = Depends(get_allowed_cameras_for_filter),
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
        embeddings_language=_embeddings_language(config),
    )
    write_tools = get_write_tool_names(tools)
    llm_tools = strip_tool_access(tools)
    conversation = []

    # Build the system message only when the client hasn't already pinned one.
    # The first turn has no system message; we generate it (with the current
    # timestamp) and return the whole chain so the client persists it. Later
    # turns send it back verbatim, freezing the timestamp so the prompt prefix
    # stays byte-identical and the model server's prompt cache keeps hitting.
    if not body.messages or body.messages[0].role != "system":
        conversation.append(
            {
                "role": "system",
                "content": build_chat_system_prompt(
                    config=config,
                    allowed_cameras=allowed_cameras,
                    semantic_search_enabled=semantic_search_enabled,
                    attribute_classifications=attribute_classifications,
                ),
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
        if msg.tool_calls is not None:
            msg_dict["tool_calls"] = msg.tool_calls

        conversation.append(msg_dict)

    tool_iterations = 0
    tool_calls: list[ToolCall] = []
    max_iterations = body.max_tool_iterations

    # Resume after an approval pause: run the tail's tool calls (honoring the
    # client's decisions) before asking the model for anything new.
    resume_pending = _pending_tool_calls_from_tail(conversation)

    logger.debug(
        f"Starting chat completion with {len(conversation)} message(s), "
        f"{len(tools)} tool(s) available, max_iterations={max_iterations}"
    )

    # True LLM streaming when client supports it and stream requested
    if body.stream and hasattr(genai_client, "chat_with_tools_stream"):
        stream_iterations = 0

        async def stream_body_llm():
            nonlocal conversation, stream_iterations
            pending: list[dict[str, Any]] | None = resume_pending

            def _emit(payload: dict[str, Any]) -> bytes:
                return json.dumps(payload).encode("utf-8") + b"\n"

            def _emit_chain(extra: list[dict[str, Any]] | None = None) -> bytes:
                # Return the full conversation (including the system message) so
                # the client persists and replays it verbatim next turn.
                return _emit(
                    {"type": "messages", "messages": conversation + (extra or [])}
                )

            while stream_iterations < max_iterations:
                if await request.is_disconnected():
                    logger.debug("Client disconnected, stopping chat stream")
                    return

                if pending is None:
                    logger.debug(
                        f"Streaming LLM (iteration {stream_iterations + 1}/{max_iterations}) "
                        f"with {len(conversation)} message(s)"
                    )
                    async for event in genai_client.chat_with_tools_stream(
                        messages=conversation,
                        tools=llm_tools if llm_tools else None,
                        tool_choice="auto",
                        enable_thinking=body.enable_thinking,
                    ):
                        if await request.is_disconnected():
                            logger.debug("Client disconnected, stopping chat stream")
                            return
                        kind, value = event
                        if kind == "content_delta":
                            yield _emit({"type": "content", "delta": value})
                        elif kind == "reasoning_delta":
                            yield _emit({"type": "reasoning", "delta": value})
                        elif kind == "stats":
                            yield _emit({"type": "stats", **value})
                        elif kind == "message":
                            msg = value
                            if msg.get("finish_reason") == "error":
                                yield _emit(
                                    {
                                        "type": "error",
                                        "error": "An error occurred while processing your request.",
                                    }
                                )
                                return
                            requested = msg.get("tool_calls")
                            if requested:
                                stream_iterations += 1
                                conversation.append(
                                    build_assistant_message_for_conversation(
                                        msg.get("content"), requested
                                    )
                                )
                                pending = requested
                                break
                            # Streaming never appends the final assistant message
                            # to the conversation, so add it to the chain.
                            yield _emit_chain(
                                extra=[
                                    {
                                        "role": "assistant",
                                        "content": msg.get("content"),
                                    }
                                ]
                            )
                            yield _emit({"type": "done"})
                            return
                    if pending is None:
                        # The stream ended without a final message; nothing
                        # more to run.
                        break

                awaiting = _tool_calls_awaiting_approval(pending, body, write_tools)
                if awaiting:
                    # Pause before running write tools. The client shows the
                    # calls, collects decisions, and resends the chain.
                    yield _emit_chain()
                    yield _emit({"type": "approval_required", "tool_calls": awaiting})
                    yield _emit({"type": "done"})
                    return

                if await request.is_disconnected():
                    logger.debug("Client disconnected before tool execution")
                    return
                (
                    _executed_calls,
                    tool_results,
                    extra_msgs,
                ) = await _execute_pending_tools(
                    pending, request, allowed_cameras, decisions=body.tool_decisions
                )
                conversation.extend(tool_results)
                conversation.extend(extra_msgs)
                pending = None
                # Emit the running chain so the client can render tool
                # calls live and replay them verbatim next turn.
                yield _emit_chain()

            yield _emit_chain()
            yield _emit({"type": "done"})

        return StreamingResponse(
            stream_body_llm(),
            media_type="application/x-ndjson",
            headers={"X-Accel-Buffering": "no"},
        )

    try:
        pending_tool_calls = resume_pending
        while tool_iterations < max_iterations:
            if pending_tool_calls is None:
                logger.debug(
                    f"Calling LLM (iteration {tool_iterations + 1}/{max_iterations}) "
                    f"with {len(conversation)} message(s) in conversation"
                )
                response = genai_client.chat_with_tools(
                    messages=conversation,
                    tools=llm_tools if llm_tools else None,
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

                        chain = list(conversation)

                        async def stream_body() -> Any:
                            yield (
                                json.dumps(
                                    {"type": "messages", "messages": chain}
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
                                    json.dumps(
                                        {"type": "content", "delta": part}
                                    ).encode("utf-8")
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
                            messages=list(conversation),
                        ).model_dump(),
                    )

                tool_iterations += 1
                logger.debug(
                    f"Tool calls detected (iteration {tool_iterations}/{max_iterations}): "
                    f"{len(pending_tool_calls)} tool(s) to execute"
                )

            awaiting = _tool_calls_awaiting_approval(
                pending_tool_calls, body, write_tools
            )
            if awaiting:
                # Pause before running write tools; the client resends the
                # returned chain with its decisions to continue.
                return JSONResponse(
                    content=ChatCompletionResponse(
                        message=ChatMessageResponse(
                            role="assistant",
                            content=None,
                            tool_calls=[ToolCallInvocation(**tc) for tc in awaiting],
                        ),
                        finish_reason="approval_required",
                        tool_iterations=tool_iterations,
                        tool_calls=tool_calls,
                        messages=list(conversation),
                    ).model_dump(),
                )

            executed_calls, tool_results, extra_msgs = await _execute_pending_tools(
                pending_tool_calls,
                request,
                allowed_cameras,
                decisions=body.tool_decisions,
            )
            tool_calls.extend(executed_calls)
            conversation.extend(tool_results)
            conversation.extend(extra_msgs)
            pending_tool_calls = None
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
                messages=list(conversation),
            ).model_dump(),
        )

    except Exception as e:
        logger.exception(f"Error in chat completion: {e}")
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
        logger.exception("Failed to start VLM watch job: %s", e)
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
