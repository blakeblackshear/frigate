"""Event apis."""

import base64
import datetime
import logging
import os
import random
import string
from functools import reduce
from pathlib import Path
from urllib.parse import unquote

import cv2
import numpy as np
from fastapi import APIRouter, Request
from fastapi.params import Depends
from fastapi.responses import JSONResponse
from peewee import JOIN, DoesNotExist, fn, operator
from playhouse.shortcuts import model_to_dict

from frigate.api.auth import require_role
from frigate.api.defs.query.events_query_parameters import (
    DEFAULT_TIME_RANGE,
    EventsQueryParams,
    EventsSearchQueryParams,
    EventsSummaryQueryParams,
)
from frigate.api.defs.query.regenerate_query_parameters import (
    RegenerateQueryParameters,
)
from frigate.api.defs.request.events_body import (
    EventsCreateBody,
    EventsDeleteBody,
    EventsDescriptionBody,
    EventsEndBody,
    EventsLPRBody,
    EventsSubLabelBody,
    SubmitPlusBody,
    TriggerEmbeddingBody,
)
from frigate.api.defs.response.event_response import (
    EventCreateResponse,
    EventMultiDeleteResponse,
    EventResponse,
    EventUploadPlusResponse,
)
from frigate.api.defs.response.generic_response import GenericResponse
from frigate.api.defs.tags import Tags
from frigate.comms.event_metadata_updater import EventMetadataTypeEnum
from frigate.const import CLIPS_DIR, TRIGGER_DIR
from frigate.embeddings import EmbeddingsContext
from frigate.models import Event, ReviewSegment, Timeline, Trigger
from frigate.track.object_processing import TrackedObject
from frigate.util.builtin import get_tz_modifiers
from frigate.util.path import get_event_thumbnail_bytes

logger = logging.getLogger(__name__)

router = APIRouter(tags=[Tags.events])


@router.get("/events", response_model=list[EventResponse])
def events(params: EventsQueryParams = Depends()):
    camera = params.camera
    cameras = params.cameras

    # handle old camera arg
    if cameras == "all" and camera != "all":
        cameras = camera

    label = unquote(params.label)
    labels = params.labels

    # handle old label arg
    if labels == "all" and label != "all":
        labels = label

    sub_label = params.sub_label
    sub_labels = params.sub_labels

    # handle old sub_label arg
    if sub_labels == "all" and sub_label != "all":
        sub_labels = sub_label

    zone = params.zone
    zones = params.zones

    # handle old label arg
    if zones == "all" and zone != "all":
        zones = zone

    limit = params.limit
    after = params.after
    before = params.before
    time_range = params.time_range
    has_clip = params.has_clip
    has_snapshot = params.has_snapshot
    in_progress = params.in_progress
    include_thumbnails = params.include_thumbnails
    favorites = params.favorites
    min_score = params.min_score
    max_score = params.max_score
    min_speed = params.min_speed
    max_speed = params.max_speed
    is_submitted = params.is_submitted
    min_length = params.min_length
    max_length = params.max_length
    event_id = params.event_id
    recognized_license_plate = params.recognized_license_plate

    sort = params.sort

    clauses = []

    selected_columns = [
        Event.id,
        Event.camera,
        Event.label,
        Event.zones,
        Event.start_time,
        Event.end_time,
        Event.has_clip,
        Event.has_snapshot,
        Event.plus_id,
        Event.retain_indefinitely,
        Event.sub_label,
        Event.top_score,
        Event.false_positive,
        Event.box,
        Event.data,
    ]

    if camera != "all":
        clauses.append((Event.camera == camera))

    if cameras != "all":
        camera_list = cameras.split(",")
        clauses.append((Event.camera << camera_list))

    if labels != "all":
        label_list = labels.split(",")
        clauses.append((Event.label << label_list))

    if sub_labels != "all":
        # use matching so joined sub labels are included
        # for example a sub label 'bob' would get events
        # with sub labels 'bob' and 'bob, john'
        sub_label_clauses = []
        filtered_sub_labels = sub_labels.split(",")

        if "None" in filtered_sub_labels:
            filtered_sub_labels.remove("None")
            sub_label_clauses.append((Event.sub_label.is_null()))

        for label in filtered_sub_labels:
            sub_label_clauses.append(
                (Event.sub_label.cast("text") == label)
            )  # include exact matches

            # include this label when part of a list
            sub_label_clauses.append((Event.sub_label.cast("text") % f"*{label},*"))
            sub_label_clauses.append((Event.sub_label.cast("text") % f"*, {label}*"))

        sub_label_clause = reduce(operator.or_, sub_label_clauses)
        clauses.append((sub_label_clause))

    if recognized_license_plate != "all":
        # use matching so joined recognized_license_plates are included
        # for example a recognized license plate 'ABC123' would get events
        # with recognized license plates 'ABC123' and 'ABC123, XYZ789'
        recognized_license_plate_clauses = []
        filtered_recognized_license_plates = recognized_license_plate.split(",")

        if "None" in filtered_recognized_license_plates:
            filtered_recognized_license_plates.remove("None")
            recognized_license_plate_clauses.append(
                (Event.data["recognized_license_plate"].is_null())
            )

        for recognized_license_plate in filtered_recognized_license_plates:
            # Exact matching plus list inclusion
            recognized_license_plate_clauses.append(
                (
                    Event.data["recognized_license_plate"].cast("text")
                    == recognized_license_plate
                )
            )
            recognized_license_plate_clauses.append(
                (
                    Event.data["recognized_license_plate"].cast("text")
                    % f"*{recognized_license_plate},*"
                )
            )
            recognized_license_plate_clauses.append(
                (
                    Event.data["recognized_license_plate"].cast("text")
                    % f"*, {recognized_license_plate}*"
                )
            )

        recognized_license_plate_clause = reduce(
            operator.or_, recognized_license_plate_clauses
        )
        clauses.append((recognized_license_plate_clause))

    if zones != "all":
        # use matching so events with multiple zones
        # still match on a search where any zone matches
        zone_clauses = []
        filtered_zones = zones.split(",")

        if "None" in filtered_zones:
            filtered_zones.remove("None")
            zone_clauses.append((Event.zones.length() == 0))

        for zone in filtered_zones:
            zone_clauses.append((Event.zones.cast("text") % f'*"{zone}"*'))

        zone_clause = reduce(operator.or_, zone_clauses)
        clauses.append((zone_clause))

    if after:
        clauses.append((Event.start_time > after))

    if before:
        clauses.append((Event.start_time < before))

    if time_range != DEFAULT_TIME_RANGE:
        # get timezone arg to ensure browser times are used
        tz_name = params.timezone
        hour_modifier, minute_modifier, _ = get_tz_modifiers(tz_name)

        times = time_range.split(",")
        time_after = times[0]
        time_before = times[1]

        start_hour_fun = fn.strftime(
            "%H:%M",
            fn.datetime(Event.start_time, "unixepoch", hour_modifier, minute_modifier),
        )

        # cases where user wants events overnight, ex: from 20:00 to 06:00
        # should use or operator
        if time_after > time_before:
            clauses.append(
                (
                    reduce(
                        operator.or_,
                        [(start_hour_fun > time_after), (start_hour_fun < time_before)],
                    )
                )
            )
        # all other cases should be and operator
        else:
            clauses.append((start_hour_fun > time_after))
            clauses.append((start_hour_fun < time_before))

    if has_clip is not None:
        clauses.append((Event.has_clip == has_clip))

    if has_snapshot is not None:
        clauses.append((Event.has_snapshot == has_snapshot))

    if in_progress is not None:
        clauses.append((Event.end_time.is_null(in_progress)))

    if include_thumbnails:
        selected_columns.append(Event.thumbnail)

    if favorites:
        clauses.append((Event.retain_indefinitely == favorites))

    if max_score is not None:
        clauses.append((Event.data["score"] <= max_score))

    if min_score is not None:
        clauses.append((Event.data["score"] >= min_score))

    if max_speed is not None:
        clauses.append((Event.data["average_estimated_speed"] <= max_speed))

    if min_speed is not None:
        clauses.append((Event.data["average_estimated_speed"] >= min_speed))

    if min_length is not None:
        clauses.append(((Event.end_time - Event.start_time) >= min_length))

    if max_length is not None:
        clauses.append(((Event.end_time - Event.start_time) <= max_length))

    if is_submitted is not None:
        if is_submitted == 0:
            clauses.append((Event.plus_id.is_null()))
        elif is_submitted > 0:
            clauses.append((Event.plus_id != ""))

    if event_id is not None:
        clauses.append((Event.id == event_id))

    if len(clauses) == 0:
        clauses.append((True))

    if sort:
        if sort == "score_asc":
            order_by = Event.data["score"].asc()
        elif sort == "score_desc":
            order_by = Event.data["score"].desc()
        elif sort == "speed_asc":
            order_by = Event.data["average_estimated_speed"].asc()
        elif sort == "speed_desc":
            order_by = Event.data["average_estimated_speed"].desc()
        elif sort == "date_asc":
            order_by = Event.start_time.asc()
        elif sort == "date_desc":
            order_by = Event.start_time.desc()
        else:
            order_by = Event.start_time.desc()
    else:
        order_by = Event.start_time.desc()

    events = (
        Event.select(*selected_columns)
        .where(reduce(operator.and_, clauses))
        .order_by(order_by)
        .limit(limit)
        .dicts()
        .iterator()
    )

    return JSONResponse(content=list(events))


@router.get("/events/explore", response_model=list[EventResponse])
def events_explore(limit: int = 10):
    # get distinct labels for all events
    distinct_labels = Event.select(Event.label).distinct().order_by(Event.label)

    label_counts = {}

    def event_generator():
        for label_obj in distinct_labels.iterator():
            label = label_obj.label

            # get most recent events for this label
            label_events = (
                Event.select()
                .where(Event.label == label)
                .order_by(Event.start_time.desc())
                .limit(limit)
                .iterator()
            )

            # count total events for this label
            label_counts[label] = Event.select().where(Event.label == label).count()

            yield from label_events

    def process_events():
        for event in event_generator():
            processed_event = {
                "id": event.id,
                "camera": event.camera,
                "label": event.label,
                "zones": event.zones,
                "start_time": event.start_time,
                "end_time": event.end_time,
                "has_clip": event.has_clip,
                "has_snapshot": event.has_snapshot,
                "plus_id": event.plus_id,
                "retain_indefinitely": event.retain_indefinitely,
                "sub_label": event.sub_label,
                "top_score": event.top_score,
                "false_positive": event.false_positive,
                "box": event.box,
                "data": {
                    k: v
                    for k, v in event.data.items()
                    if k
                    in [
                        "type",
                        "score",
                        "top_score",
                        "description",
                        "sub_label_score",
                        "average_estimated_speed",
                        "velocity_angle",
                        "path_data",
                        "recognized_license_plate",
                        "recognized_license_plate_score",
                    ]
                },
                "event_count": label_counts[event.label],
            }
            yield processed_event

    # convert iterator to list and sort
    processed_events = sorted(
        process_events(),
        key=lambda x: (x["event_count"], x["start_time"]),
        reverse=True,
    )

    return JSONResponse(content=processed_events)


@router.get("/event_ids", response_model=list[EventResponse])
def event_ids(ids: str):
    ids = ids.split(",")

    if not ids:
        return JSONResponse(
            content=({"success": False, "message": "Valid list of ids must be sent"}),
            status_code=400,
        )

    try:
        events = Event.select().where(Event.id << ids).dicts().iterator()
        return JSONResponse(list(events))
    except Exception:
        return JSONResponse(
            content=({"success": False, "message": "Events not found"}), status_code=400
        )


@router.get("/events/search")
def events_search(request: Request, params: EventsSearchQueryParams = Depends()):
    query = params.query
    search_type = params.search_type
    include_thumbnails = params.include_thumbnails
    limit = params.limit
    sort = params.sort

    # Filters
    cameras = params.cameras
    labels = params.labels
    zones = params.zones
    after = params.after
    before = params.before
    min_score = params.min_score
    max_score = params.max_score
    min_speed = params.min_speed
    max_speed = params.max_speed
    time_range = params.time_range
    has_clip = params.has_clip
    has_snapshot = params.has_snapshot
    is_submitted = params.is_submitted
    recognized_license_plate = params.recognized_license_plate

    # for similarity search
    event_id = params.event_id

    if not query and not event_id:
        return JSONResponse(
            content=(
                {
                    "success": False,
                    "message": "A search query must be supplied",
                }
            ),
            status_code=400,
        )

    if not request.app.frigate_config.semantic_search.enabled:
        return JSONResponse(
            content=(
                {
                    "success": False,
                    "message": "Semantic search is not enabled",
                }
            ),
            status_code=400,
        )

    context: EmbeddingsContext = request.app.embeddings

    selected_columns = [
        Event.id,
        Event.camera,
        Event.label,
        Event.sub_label,
        Event.zones,
        Event.start_time,
        Event.end_time,
        Event.has_clip,
        Event.has_snapshot,
        Event.top_score,
        Event.data,
        Event.plus_id,
        ReviewSegment.thumb_path,
    ]

    if include_thumbnails:
        selected_columns.append(Event.thumbnail)

    # Build the initial SQLite query filters
    event_filters = []

    if cameras != "all":
        event_filters.append((Event.camera << cameras.split(",")))

    if labels != "all":
        event_filters.append((Event.label << labels.split(",")))

    if zones != "all":
        zone_clauses = []
        filtered_zones = zones.split(",")

        if "None" in filtered_zones:
            filtered_zones.remove("None")
            zone_clauses.append((Event.zones.length() == 0))

        for zone in filtered_zones:
            zone_clauses.append((Event.zones.cast("text") % f'*"{zone}"*'))

        event_filters.append((reduce(operator.or_, zone_clauses)))

    if recognized_license_plate != "all":
        # use matching so joined recognized_license_plates are included
        # for example an recognized_license_plate 'ABC123' would get events
        # with recognized_license_plates 'ABC123' and 'ABC123, XYZ789'
        recognized_license_plate_clauses = []
        filtered_recognized_license_plates = recognized_license_plate.split(",")

        if "None" in filtered_recognized_license_plates:
            filtered_recognized_license_plates.remove("None")
            recognized_license_plate_clauses.append(
                (Event.data["recognized_license_plate"].is_null())
            )

        for recognized_license_plate in filtered_recognized_license_plates:
            # Exact matching plus list inclusion
            recognized_license_plate_clauses.append(
                (
                    Event.data["recognized_license_plate"].cast("text")
                    == recognized_license_plate
                )
            )
            recognized_license_plate_clauses.append(
                (
                    Event.data["recognized_license_plate"].cast("text")
                    % f"*{recognized_license_plate},*"
                )
            )
            recognized_license_plate_clauses.append(
                (
                    Event.data["recognized_license_plate"].cast("text")
                    % f"*, {recognized_license_plate}*"
                )
            )

        recognized_license_plate_clause = reduce(
            operator.or_, recognized_license_plate_clauses
        )
        event_filters.append((recognized_license_plate_clause))

    if after:
        event_filters.append((Event.start_time > after))

    if before:
        event_filters.append((Event.start_time < before))

    if has_clip is not None:
        event_filters.append((Event.has_clip == has_clip))

    if has_snapshot is not None:
        event_filters.append((Event.has_snapshot == has_snapshot))

    if is_submitted is not None:
        if is_submitted == 0:
            event_filters.append((Event.plus_id.is_null()))
        elif is_submitted > 0:
            event_filters.append((Event.plus_id != ""))

    if min_score is not None and max_score is not None:
        event_filters.append((Event.data["score"].between(min_score, max_score)))
    else:
        if min_score is not None:
            event_filters.append((Event.data["score"] >= min_score))
        if max_score is not None:
            event_filters.append((Event.data["score"] <= max_score))

    if min_speed is not None and max_speed is not None:
        event_filters.append(
            (Event.data["average_estimated_speed"].between(min_speed, max_speed))
        )
    else:
        if min_speed is not None:
            event_filters.append((Event.data["average_estimated_speed"] >= min_speed))
        if max_speed is not None:
            event_filters.append((Event.data["average_estimated_speed"] <= max_speed))

    if time_range != DEFAULT_TIME_RANGE:
        tz_name = params.timezone
        hour_modifier, minute_modifier, _ = get_tz_modifiers(tz_name)

        times = time_range.split(",")
        time_after, time_before = times

        start_hour_fun = fn.strftime(
            "%H:%M",
            fn.datetime(Event.start_time, "unixepoch", hour_modifier, minute_modifier),
        )

        # cases where user wants events overnight, ex: from 20:00 to 06:00
        # should use or operator
        if time_after > time_before:
            event_filters.append(
                (
                    reduce(
                        operator.or_,
                        [(start_hour_fun > time_after), (start_hour_fun < time_before)],
                    )
                )
            )
        # all other cases should be and operator
        else:
            event_filters.append((start_hour_fun > time_after))
            event_filters.append((start_hour_fun < time_before))

    # Perform semantic search
    search_results = {}
    if search_type == "similarity":
        try:
            search_event: Event = Event.get(Event.id == event_id)
        except DoesNotExist:
            return JSONResponse(
                content={
                    "success": False,
                    "message": "Event not found",
                },
                status_code=404,
            )

        thumb_result = context.search_thumbnail(search_event)
        thumb_ids = {result[0]: result[1] for result in thumb_result}
        search_results = {
            event_id: {"distance": distance, "source": "thumbnail"}
            for event_id, distance in thumb_ids.items()
        }
    else:
        search_types = search_type.split(",")

        # only save stats for multi-modal searches
        save_stats = "thumbnail" in search_types and "description" in search_types

        if "thumbnail" in search_types:
            thumb_result = context.search_thumbnail(query)

            thumb_distances = context.thumb_stats.normalize(
                [result[1] for result in thumb_result], save_stats
            )

            thumb_ids = dict(
                zip([result[0] for result in thumb_result], thumb_distances)
            )
            search_results.update(
                {
                    event_id: {"distance": distance, "source": "thumbnail"}
                    for event_id, distance in thumb_ids.items()
                }
            )

        if "description" in search_types:
            desc_result = context.search_description(query)

            desc_distances = context.desc_stats.normalize(
                [result[1] for result in desc_result], save_stats
            )

            desc_ids = dict(zip([result[0] for result in desc_result], desc_distances))

            for event_id, distance in desc_ids.items():
                if (
                    event_id not in search_results
                    or distance < search_results[event_id]["distance"]
                ):
                    search_results[event_id] = {
                        "distance": distance,
                        "source": "description",
                    }

    if not search_results:
        return JSONResponse(content=[])

    # Fetch events in a single query
    events_query = Event.select(*selected_columns).join(
        ReviewSegment,
        JOIN.LEFT_OUTER,
        on=(fn.json_extract(ReviewSegment.data, "$.detections").contains(Event.id)),
    )

    # Apply filters, if any
    if event_filters:
        events_query = events_query.where(reduce(operator.and_, event_filters))

    # If we did a similarity search, limit events to those in search_results
    if search_results:
        events_query = events_query.where(Event.id << list(search_results.keys()))

    # Fetch events and process them in a single pass
    processed_events = []
    for event in events_query.dicts():
        processed_event = {k: v for k, v in event.items() if k != "data"}
        processed_event["data"] = {
            k: v
            for k, v in event["data"].items()
            if k
            in [
                "attributes",
                "type",
                "score",
                "top_score",
                "description",
                "sub_label_score",
                "average_estimated_speed",
                "velocity_angle",
                "path_data",
                "recognized_license_plate",
                "recognized_license_plate_score",
            ]
        }

        if event["id"] in search_results:
            processed_event["search_distance"] = search_results[event["id"]]["distance"]
            processed_event["search_source"] = search_results[event["id"]]["source"]

        processed_events.append(processed_event)

    if (sort is None or sort == "relevance") and search_results:
        processed_events.sort(key=lambda x: x.get("search_distance", float("inf")))
    elif min_score is not None and max_score is not None and sort == "score_asc":
        processed_events.sort(key=lambda x: x["data"]["score"])
    elif min_score is not None and max_score is not None and sort == "score_desc":
        processed_events.sort(key=lambda x: x["data"]["score"], reverse=True)
    elif min_speed is not None and max_speed is not None and sort == "speed_asc":
        processed_events.sort(key=lambda x: x["data"]["average_estimated_speed"])
    elif min_speed is not None and max_speed is not None and sort == "speed_desc":
        processed_events.sort(
            key=lambda x: x["data"]["average_estimated_speed"], reverse=True
        )
    elif sort == "date_asc":
        processed_events.sort(key=lambda x: x["start_time"])
    else:
        # "date_desc" default
        processed_events.sort(key=lambda x: x["start_time"], reverse=True)

    # Limit the number of events returned
    processed_events = processed_events[:limit]

    return JSONResponse(content=processed_events)


@router.get("/events/summary")
def events_summary(params: EventsSummaryQueryParams = Depends()):
    tz_name = params.timezone
    hour_modifier, minute_modifier, seconds_offset = get_tz_modifiers(tz_name)
    has_clip = params.has_clip
    has_snapshot = params.has_snapshot

    clauses = []

    if has_clip is not None:
        clauses.append((Event.has_clip == has_clip))

    if has_snapshot is not None:
        clauses.append((Event.has_snapshot == has_snapshot))

    if len(clauses) == 0:
        clauses.append((True))

    groups = (
        Event.select(
            Event.camera,
            Event.label,
            Event.sub_label,
            Event.data,
            fn.strftime(
                "%Y-%m-%d",
                fn.datetime(
                    Event.start_time, "unixepoch", hour_modifier, minute_modifier
                ),
            ).alias("day"),
            Event.zones,
            fn.COUNT(Event.id).alias("count"),
        )
        .where(reduce(operator.and_, clauses))
        .group_by(
            Event.camera,
            Event.label,
            Event.sub_label,
            Event.data,
            (Event.start_time + seconds_offset).cast("int") / (3600 * 24),
            Event.zones,
        )
    )

    return JSONResponse(content=[e for e in groups.dicts()])


@router.get("/events/{event_id}", response_model=EventResponse)
def event(event_id: str):
    try:
        return model_to_dict(Event.get(Event.id == event_id))
    except DoesNotExist:
        return JSONResponse(content="Event not found", status_code=404)


@router.post(
    "/events/{event_id}/retain",
    response_model=GenericResponse,
    dependencies=[Depends(require_role(["admin"]))],
)
def set_retain(event_id: str):
    try:
        event = Event.get(Event.id == event_id)
    except DoesNotExist:
        return JSONResponse(
            content=({"success": False, "message": "Event " + event_id + " not found"}),
            status_code=404,
        )

    event.retain_indefinitely = True
    event.save()

    return JSONResponse(
        content=({"success": True, "message": "Event " + event_id + " retained"}),
        status_code=200,
    )


@router.post("/events/{event_id}/plus", response_model=EventUploadPlusResponse)
def send_to_plus(request: Request, event_id: str, body: SubmitPlusBody = None):
    if not request.app.frigate_config.plus_api.is_active():
        message = "PLUS_API_KEY environment variable is not set"
        logger.error(message)
        return JSONResponse(
            content=(
                {
                    "success": False,
                    "message": message,
                }
            ),
            status_code=400,
        )

    include_annotation = body.include_annotation if body is not None else None

    try:
        event = Event.get(Event.id == event_id)
    except DoesNotExist:
        message = f"Event {event_id} not found"
        logger.error(message)
        return JSONResponse(
            content=({"success": False, "message": message}), status_code=404
        )

    # events from before the conversion to relative dimensions cant include annotations
    if event.data.get("box") is None:
        include_annotation = None

    if event.end_time is None:
        logger.error(f"Unable to load clean png for in-progress event: {event.id}")
        return JSONResponse(
            content=(
                {
                    "success": False,
                    "message": "Unable to load clean png for in-progress event",
                }
            ),
            status_code=400,
        )

    if event.plus_id:
        message = "Already submitted to plus"
        logger.error(message)
        return JSONResponse(
            content=({"success": False, "message": message}), status_code=400
        )

    # load clean.png
    try:
        filename = f"{event.camera}-{event.id}-clean.png"
        image = cv2.imread(os.path.join(CLIPS_DIR, filename))
    except Exception:
        logger.error(f"Unable to load clean png for event: {event.id}")
        return JSONResponse(
            content=(
                {"success": False, "message": "Unable to load clean png for event"}
            ),
            status_code=400,
        )

    if image is None or image.size == 0:
        logger.error(f"Unable to load clean png for event: {event.id}")
        return JSONResponse(
            content=(
                {"success": False, "message": "Unable to load clean png for event"}
            ),
            status_code=400,
        )

    try:
        plus_id = request.app.frigate_config.plus_api.upload_image(image, event.camera)
    except Exception as ex:
        logger.exception(ex)
        return JSONResponse(
            content=({"success": False, "message": "Error uploading image"}),
            status_code=400,
        )

    # store image id in the database
    event.plus_id = plus_id
    event.save()

    if include_annotation is not None:
        box = event.data["box"]

        try:
            request.app.frigate_config.plus_api.add_annotation(
                event.plus_id,
                box,
                event.label,
            )
        except ValueError:
            message = "Error uploading annotation, unsupported label provided."
            logger.error(message)
            return JSONResponse(
                content=({"success": False, "message": message}),
                status_code=400,
            )
        except Exception as ex:
            logger.exception(ex)
            return JSONResponse(
                content=({"success": False, "message": "Error uploading annotation"}),
                status_code=400,
            )

    return JSONResponse(
        content=({"success": True, "plus_id": plus_id}), status_code=200
    )


@router.put("/events/{event_id}/false_positive", response_model=EventUploadPlusResponse)
def false_positive(request: Request, event_id: str):
    if not request.app.frigate_config.plus_api.is_active():
        message = "PLUS_API_KEY environment variable is not set"
        logger.error(message)
        return JSONResponse(
            content=(
                {
                    "success": False,
                    "message": message,
                }
            ),
            status_code=400,
        )

    try:
        event = Event.get(Event.id == event_id)
    except DoesNotExist:
        message = f"Event {event_id} not found"
        logger.error(message)
        return JSONResponse(
            content=({"success": False, "message": message}), status_code=404
        )

    # events from before the conversion to relative dimensions cant include annotations
    if event.data.get("box") is None:
        message = "Events prior to 0.13 cannot be submitted as false positives"
        logger.error(message)
        return JSONResponse(
            content=({"success": False, "message": message}), status_code=400
        )

    if event.false_positive:
        message = "False positive already submitted to Frigate+"
        logger.error(message)
        return JSONResponse(
            content=({"success": False, "message": message}), status_code=400
        )

    if not event.plus_id:
        plus_response = send_to_plus(request, event_id)
        if plus_response.status_code != 200:
            return plus_response
        # need to refetch the event now that it has a plus_id
        event = Event.get(Event.id == event_id)

    region = event.data["region"]
    box = event.data["box"]

    # provide top score if score is unavailable
    score = (
        (event.data["top_score"] if event.data["top_score"] else event.top_score)
        if event.data["score"] is None
        else event.data["score"]
    )

    try:
        request.app.frigate_config.plus_api.add_false_positive(
            event.plus_id,
            region,
            box,
            score,
            event.label,
            event.model_hash,
            event.model_type,
            event.detector_type,
        )
    except ValueError:
        message = "Error uploading false positive, unsupported label provided."
        logger.error(message)
        return JSONResponse(
            content=({"success": False, "message": message}),
            status_code=400,
        )
    except Exception as ex:
        logger.exception(ex)
        return JSONResponse(
            content=({"success": False, "message": "Error uploading false positive"}),
            status_code=400,
        )

    event.false_positive = True
    event.save()

    return JSONResponse(
        content=({"success": True, "plus_id": event.plus_id}), status_code=200
    )


@router.delete(
    "/events/{event_id}/retain",
    response_model=GenericResponse,
    dependencies=[Depends(require_role(["admin"]))],
)
def delete_retain(event_id: str):
    try:
        event = Event.get(Event.id == event_id)
    except DoesNotExist:
        return JSONResponse(
            content=({"success": False, "message": "Event " + event_id + " not found"}),
            status_code=404,
        )

    event.retain_indefinitely = False
    event.save()

    return JSONResponse(
        content=({"success": True, "message": "Event " + event_id + " un-retained"}),
        status_code=200,
    )


@router.post(
    "/events/{event_id}/sub_label",
    response_model=GenericResponse,
    dependencies=[Depends(require_role(["admin"]))],
)
def set_sub_label(
    request: Request,
    event_id: str,
    body: EventsSubLabelBody,
):
    try:
        event: Event = Event.get(Event.id == event_id)
    except DoesNotExist:
        event = None

    if request.app.detected_frames_processor:
        tracked_obj: TrackedObject = None

        for state in request.app.detected_frames_processor.camera_states.values():
            tracked_obj = state.tracked_objects.get(event_id)

            if tracked_obj is not None:
                break
    else:
        tracked_obj = None

    if not event and not tracked_obj:
        return JSONResponse(
            content=(
                {"success": False, "message": "Event " + event_id + " not found."}
            ),
            status_code=404,
        )

    new_sub_label = body.subLabel
    new_score = body.subLabelScore

    if new_sub_label == "":
        new_sub_label = None
        new_score = None

    request.app.event_metadata_updater.publish(
        EventMetadataTypeEnum.sub_label, (event_id, new_sub_label, new_score)
    )

    return JSONResponse(
        content={
            "success": True,
            "message": f"Event {event_id} sub label set to {new_sub_label if new_sub_label is not None else 'None'}",
        },
        status_code=200,
    )


@router.post(
    "/events/{event_id}/recognized_license_plate",
    response_model=GenericResponse,
    dependencies=[Depends(require_role(["admin"]))],
)
def set_plate(
    request: Request,
    event_id: str,
    body: EventsLPRBody,
):
    try:
        event: Event = Event.get(Event.id == event_id)
    except DoesNotExist:
        event = None

    if request.app.detected_frames_processor:
        tracked_obj: TrackedObject = None

        for state in request.app.detected_frames_processor.camera_states.values():
            tracked_obj = state.tracked_objects.get(event_id)

            if tracked_obj is not None:
                break
    else:
        tracked_obj = None

    if not event and not tracked_obj:
        return JSONResponse(
            content=(
                {"success": False, "message": "Event " + event_id + " not found."}
            ),
            status_code=404,
        )

    new_plate = body.recognizedLicensePlate
    new_score = body.recognizedLicensePlateScore

    if new_plate == "":
        new_plate = None
        new_score = None

    request.app.event_metadata_updater.publish(
        EventMetadataTypeEnum.recognized_license_plate, (event_id, new_plate, new_score)
    )

    return JSONResponse(
        content={
            "success": True,
            "message": f"Event {event_id} license plate set to {new_plate if new_plate is not None else 'None'}",
        },
        status_code=200,
    )


@router.post(
    "/events/{event_id}/description",
    response_model=GenericResponse,
    dependencies=[Depends(require_role(["admin"]))],
)
def set_description(
    request: Request,
    event_id: str,
    body: EventsDescriptionBody,
):
    try:
        event: Event = Event.get(Event.id == event_id)
    except DoesNotExist:
        return JSONResponse(
            content=({"success": False, "message": "Event " + event_id + " not found"}),
            status_code=404,
        )

    new_description = body.description

    event.data["description"] = new_description
    event.save()

    # If semantic search is enabled, update the index
    if request.app.frigate_config.semantic_search.enabled:
        context: EmbeddingsContext = request.app.embeddings
        if len(new_description) > 0:
            context.update_description(
                event_id,
                new_description,
            )
        else:
            context.db.delete_embeddings_description(event_ids=[event_id])

    response_message = (
        f"Event {event_id} description is now blank"
        if new_description is None or len(new_description) == 0
        else f"Event {event_id} description set to {new_description}"
    )

    return JSONResponse(
        content=(
            {
                "success": True,
                "message": response_message,
            }
        ),
        status_code=200,
    )


@router.put(
    "/events/{event_id}/description/regenerate",
    response_model=GenericResponse,
    dependencies=[Depends(require_role(["admin"]))],
)
def regenerate_description(
    request: Request, event_id: str, params: RegenerateQueryParameters = Depends()
):
    try:
        event: Event = Event.get(Event.id == event_id)
    except DoesNotExist:
        return JSONResponse(
            content=({"success": False, "message": "Event " + event_id + " not found"}),
            status_code=404,
        )

    camera_config = request.app.frigate_config.cameras[event.camera]

    if camera_config.genai.enabled or params.force:
        request.app.event_metadata_updater.publish(
            EventMetadataTypeEnum.regenerate_description,
            (event.id, params.source, params.force),
        )

        return JSONResponse(
            content=(
                {
                    "success": True,
                    "message": "Event "
                    + event_id
                    + " description regeneration has been requested using "
                    + params.source,
                }
            ),
            status_code=200,
        )

    return JSONResponse(
        content=(
            {
                "success": False,
                "message": "Semantic Search and Generative AI must be enabled to regenerate a description",
            }
        ),
        status_code=400,
    )


@router.post(
    "/description/generate",
    response_model=GenericResponse,
    # dependencies=[Depends(require_role(["admin"]))],
)
def generate_description_embedding(
    request: Request,
    body: EventsDescriptionBody,
):
    new_description = body.description

    # If semantic search is enabled, update the index
    if request.app.frigate_config.semantic_search.enabled:
        context: EmbeddingsContext = request.app.embeddings
        if len(new_description) > 0:
            result = context.generate_description_embedding(
                new_description,
            )

    return JSONResponse(
        content=(
            {
                "success": True,
                "message": f"Embedding for description is {result}"
                if result
                else "Failed to generate embedding",
            }
        ),
        status_code=200,
    )


def delete_single_event(event_id: str, request: Request) -> dict:
    try:
        event = Event.get(Event.id == event_id)
    except DoesNotExist:
        return {"success": False, "message": f"Event {event_id} not found"}

    media_name = f"{event.camera}-{event.id}"
    if event.has_snapshot:
        snapshot_paths = [
            Path(f"{os.path.join(CLIPS_DIR, media_name)}.jpg"),
            Path(f"{os.path.join(CLIPS_DIR, media_name)}-clean.png"),
        ]
        for media in snapshot_paths:
            media.unlink(missing_ok=True)

    event.delete_instance()
    Timeline.delete().where(Timeline.source_id == event_id).execute()

    # If semantic search is enabled, update the index
    if request.app.frigate_config.semantic_search.enabled:
        context: EmbeddingsContext = request.app.embeddings
        context.db.delete_embeddings_thumbnail(event_ids=[event_id])
        context.db.delete_embeddings_description(event_ids=[event_id])

    return {"success": True, "message": f"Event {event_id} deleted"}


@router.delete(
    "/events/{event_id}",
    response_model=GenericResponse,
    dependencies=[Depends(require_role(["admin"]))],
)
def delete_event(request: Request, event_id: str):
    result = delete_single_event(event_id, request)
    status_code = 200 if result["success"] else 404
    return JSONResponse(content=result, status_code=status_code)


@router.delete(
    "/events/",
    response_model=EventMultiDeleteResponse,
    dependencies=[Depends(require_role(["admin"]))],
)
def delete_events(request: Request, body: EventsDeleteBody):
    if not body.event_ids:
        return JSONResponse(
            content=({"success": False, "message": "No event IDs provided."}),
            status_code=404,
        )

    deleted_events = []
    not_found_events = []

    for event_id in body.event_ids:
        result = delete_single_event(event_id, request)
        if result["success"]:
            deleted_events.append(event_id)
        else:
            not_found_events.append(event_id)

    response = {
        "success": True,
        "deleted_events": deleted_events,
        "not_found_events": not_found_events,
    }
    return JSONResponse(content=response, status_code=200)


@router.post(
    "/events/{camera_name}/{label}/create",
    response_model=EventCreateResponse,
    dependencies=[Depends(require_role(["admin"]))],
)
def create_event(
    request: Request,
    camera_name: str,
    label: str,
    body: EventsCreateBody = EventsCreateBody(),
):
    if not camera_name or not request.app.frigate_config.cameras.get(camera_name):
        return JSONResponse(
            content=(
                {"success": False, "message": f"{camera_name} is not a valid camera."}
            ),
            status_code=404,
        )

    if not label:
        return JSONResponse(
            content=({"success": False, "message": f"{label} must be set."}),
            status_code=404,
        )

    now = datetime.datetime.now().timestamp()
    rand_id = "".join(random.choices(string.ascii_lowercase + string.digits, k=6))
    event_id = f"{now}-{rand_id}"

    request.app.event_metadata_updater.publish(
        EventMetadataTypeEnum.manual_event_create,
        (
            now,
            camera_name,
            label,
            event_id,
            body.include_recording,
            body.score,
            body.sub_label,
            body.duration,
            body.source_type,
            body.draw,
        ),
    )

    return JSONResponse(
        content=(
            {
                "success": True,
                "message": "Successfully created event.",
                "event_id": event_id,
            }
        ),
        status_code=200,
    )


@router.put(
    "/events/{event_id}/end",
    response_model=GenericResponse,
    dependencies=[Depends(require_role(["admin"]))],
)
def end_event(request: Request, event_id: str, body: EventsEndBody):
    try:
        end_time = body.end_time or datetime.datetime.now().timestamp()
        request.app.event_metadata_updater.publish(
            EventMetadataTypeEnum.manual_event_end, (event_id, end_time)
        )
    except Exception:
        return JSONResponse(
            content=(
                {"success": False, "message": f"{event_id} must be set and valid."}
            ),
            status_code=404,
        )

    return JSONResponse(
        content=({"success": True, "message": "Event successfully ended."}),
        status_code=200,
    )


@router.post(
    "/trigger/embedding",
    response_model=dict,
    dependencies=[Depends(require_role(["admin"]))],
)
def create_trigger_embedding(
    request: Request,
    body: TriggerEmbeddingBody,
    camera: str,
    name: str,
):
    try:
        if not request.app.frigate_config.semantic_search.enabled:
            return JSONResponse(
                content={
                    "success": False,
                    "message": "Semantic search is not enabled",
                },
                status_code=400,
            )

        # Check if trigger already exists
        if (
            Trigger.select()
            .where(Trigger.camera == camera, Trigger.name == name)
            .exists()
        ):
            return JSONResponse(
                content={
                    "success": False,
                    "message": f"Trigger {camera}:{name} already exists",
                },
                status_code=400,
            )

        context: EmbeddingsContext = request.app.embeddings
        # Generate embedding based on type
        embedding = None
        if body.type == "description":
            embedding = context.generate_description_embedding(body.data)
        elif body.type == "thumbnail":
            try:
                event: Event = Event.get(Event.id == body.data)
            except DoesNotExist:
                # TODO: check triggers directory for image
                return JSONResponse(
                    content={
                        "success": False,
                        "message": f"Failed to fetch event for {body.type} trigger",
                    },
                    status_code=400,
                )

            # Skip the event if not an object
            if event.data.get("type") != "object":
                return

            if thumbnail := get_event_thumbnail_bytes(event):
                cursor = context.db.execute_sql(
                    """
                    SELECT thumbnail_embedding FROM vec_thumbnails WHERE id = ?
                    """,
                    [body.data],
                )

                row = cursor.fetchone() if cursor else None

                if row:
                    query_embedding = row[0]
                    embedding = np.frombuffer(query_embedding, dtype=np.float32)
            else:
                # Extract valid thumbnail
                thumbnail = get_event_thumbnail_bytes(event)

                if thumbnail is None:
                    return JSONResponse(
                        content={
                            "success": False,
                            "message": f"Failed to get thumbnail for {body.data} for {body.type} trigger",
                        },
                        status_code=400,
                    )

                embedding = context.generate_image_embedding(
                    body.data, (base64.b64encode(thumbnail).decode("ASCII"))
                )

        if embedding is None:
            return JSONResponse(
                content={
                    "success": False,
                    "message": f"Failed to generate embedding for {body.type} trigger",
                },
                status_code=400,
            )

        if body.type == "thumbnail":
            # Save image to the triggers directory
            try:
                os.makedirs(os.path.join(TRIGGER_DIR, camera), exist_ok=True)
                with open(
                    os.path.join(TRIGGER_DIR, camera, f"{body.data}.webp"), "wb"
                ) as f:
                    f.write(thumbnail)
                logger.debug(
                    f"Writing thumbnail for trigger with data {body.data} in {camera}."
                )
            except Exception as e:
                logger.error(
                    f"Failed to write thumbnail for trigger with data {body.data} in {camera}: {e}"
                )

        Trigger.create(
            camera=camera,
            name=name,
            type=body.type,
            data=body.data,
            threshold=body.threshold,
            model=request.app.frigate_config.semantic_search.model,
            embedding=np.array(embedding, dtype=np.float32).tobytes(),
            triggering_event_id="",
            last_triggered=None,
        )

        return JSONResponse(
            content={
                "success": True,
                "message": f"Trigger created successfully for {camera}:{name}",
            },
            status_code=200,
        )

    except Exception as e:
        return JSONResponse(
            content={
                "success": False,
                "message": f"Error creating trigger embedding: {str(e)}",
            },
            status_code=500,
        )


@router.put(
    "/trigger/embedding/{camera}/{name}",
    response_model=dict,
    dependencies=[Depends(require_role(["admin"]))],
)
def update_trigger_embedding(
    request: Request,
    camera: str,
    name: str,
    body: TriggerEmbeddingBody,
):
    try:
        if not request.app.frigate_config.semantic_search.enabled:
            return JSONResponse(
                content={
                    "success": False,
                    "message": "Semantic search is not enabled",
                },
                status_code=400,
            )

        context: EmbeddingsContext = request.app.embeddings
        # Generate embedding based on type
        embedding = None
        if body.type == "description":
            embedding = context.generate_description_embedding(body.data)
        elif body.type == "thumbnail":
            webp_file = body.data + ".webp"
            webp_path = os.path.join(TRIGGER_DIR, camera, webp_file)

            try:
                event: Event = Event.get(Event.id == body.data)
                # Skip the event if not an object
                if event.data.get("type") != "object":
                    return JSONResponse(
                        content={
                            "success": False,
                            "message": f"Event {body.data} is not a tracked object for {body.type} trigger",
                        },
                        status_code=400,
                    )
                # Extract valid thumbnail
                thumbnail = get_event_thumbnail_bytes(event)

                with open(webp_path, "wb") as f:
                    f.write(thumbnail)
            except DoesNotExist:
                # check triggers directory for image
                if not os.path.exists(webp_path):
                    return JSONResponse(
                        content={
                            "success": False,
                            "message": f"Failed to fetch event for {body.type} trigger",
                        },
                        status_code=400,
                    )
                else:
                    # Load the image from the triggers directory
                    with open(webp_path, "rb") as f:
                        thumbnail = f.read()

            embedding = context.generate_image_embedding(
                body.data, (base64.b64encode(thumbnail).decode("ASCII"))
            )

        if embedding is None:
            return JSONResponse(
                content={
                    "success": False,
                    "message": f"Failed to generate embedding for {body.type} trigger",
                },
                status_code=400,
            )

        # Check if trigger exists for upsert
        trigger = Trigger.get_or_none(Trigger.camera == camera, Trigger.name == name)

        if trigger:
            # Update existing trigger
            if trigger.data != body.data:  # Delete old thumbnail only if data changes
                try:
                    os.remove(os.path.join(TRIGGER_DIR, camera, f"{trigger.data}.webp"))
                    logger.debug(
                        f"Deleted thumbnail for trigger with data {trigger.data} in {camera}."
                    )
                except Exception as e:
                    logger.error(
                        f"Failed to delete thumbnail for trigger with data {trigger.data} in {camera}: {e}"
                    )

            Trigger.update(
                data=body.data,
                model=request.app.frigate_config.semantic_search.model,
                embedding=np.array(embedding, dtype=np.float32).tobytes(),
                threshold=body.threshold,
                triggering_event_id="",
                last_triggered=None,
            ).where(Trigger.camera == camera, Trigger.name == name).execute()
        else:
            # Create new trigger (for rename case)
            Trigger.create(
                camera=camera,
                name=name,
                type=body.type,
                data=body.data,
                threshold=body.threshold,
                model=request.app.frigate_config.semantic_search.model,
                embedding=np.array(embedding, dtype=np.float32).tobytes(),
                triggering_event_id="",
                last_triggered=None,
            )

        if body.type == "thumbnail":
            # Save image to the triggers directory
            try:
                os.makedirs(os.path.join(TRIGGER_DIR, camera), exist_ok=True)
                with open(
                    os.path.join(TRIGGER_DIR, camera, f"{body.data}.webp"), "wb"
                ) as f:
                    f.write(thumbnail)
                logger.debug(
                    f"Writing thumbnail for trigger with data {body.data} in {camera}."
                )
            except Exception as e:
                logger.error(
                    f"Failed to write thumbnail for trigger with data {body.data} in {camera}: {e}"
                )

        return JSONResponse(
            content={
                "success": True,
                "message": f"Trigger updated successfully for {camera}:{name}",
            },
            status_code=200,
        )

    except Exception as e:
        return JSONResponse(
            content={
                "success": False,
                "message": f"Error updating trigger embedding: {str(e)}",
            },
            status_code=500,
        )


@router.delete(
    "/trigger/embedding/{camera}/{name}",
    response_model=dict,
    dependencies=[Depends(require_role(["admin"]))],
)
def delete_trigger_embedding(
    request: Request,
    camera: str,
    name: str,
):
    try:
        trigger = Trigger.get_or_none(Trigger.camera == camera, Trigger.name == name)
        if trigger is None:
            return JSONResponse(
                content={
                    "success": False,
                    "message": f"Trigger {camera}:{name} not found",
                },
                status_code=500,
            )

        deleted = (
            Trigger.delete()
            .where(Trigger.camera == camera, Trigger.name == name)
            .execute()
        )
        if deleted == 0:
            return JSONResponse(
                content={
                    "success": False,
                    "message": f"Error deleting trigger {camera}:{name}",
                },
                status_code=401,
            )

        try:
            os.remove(os.path.join(TRIGGER_DIR, camera, f"{trigger.data}.webp"))
            logger.debug(
                f"Deleted thumbnail for trigger with data {trigger.data} in {camera}."
            )
        except Exception as e:
            logger.error(
                f"Failed to delete thumbnail for trigger with data {trigger.data} in {camera}: {e}"
            )

        return JSONResponse(
            content={
                "success": True,
                "message": f"Trigger deleted successfully for {camera}:{name}",
            },
            status_code=200,
        )

    except Exception as e:
        return JSONResponse(
            content={
                "success": False,
                "message": f"Error deleting trigger embedding: {str(e)}",
            },
            status_code=500,
        )


@router.get(
    "/triggers/status/{camera_name}",
    response_model=dict,
    dependencies=[Depends(require_role(["admin"]))],
)
def get_triggers_status(
    camera_name: str,
):
    try:
        # Fetch all triggers for the specified camera
        triggers = Trigger.select().where(Trigger.camera == camera_name)

        # Prepare the response with trigger status
        status = {
            trigger.name: {
                "last_triggered": trigger.last_triggered.timestamp()
                if trigger.last_triggered
                else None,
                "triggering_event_id": trigger.triggering_event_id
                if trigger.triggering_event_id
                else None,
            }
            for trigger in triggers
        }

        if not status:
            return JSONResponse(
                content={
                    "success": False,
                    "message": f"No triggers found for camera {camera_name}",
                },
                status_code=404,
            )

        return {"success": True, "triggers": status}
    except Exception as ex:
        logger.exception(ex)
        return JSONResponse(
            content=({"success": False, "message": "Error fetching trigger status"}),
            status_code=400,
        )
