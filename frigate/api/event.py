"""Event apis."""

import datetime
import logging
import os
from functools import reduce
from pathlib import Path
from urllib.parse import unquote

import cv2
from fastapi import APIRouter, Request
from fastapi.params import Depends
from fastapi.responses import JSONResponse
from peewee import JOIN, DoesNotExist, fn, operator
from playhouse.shortcuts import model_to_dict

from frigate.api.defs.events_body import (
    EventsCreateBody,
    EventsDescriptionBody,
    EventsEndBody,
    EventsSubLabelBody,
    SubmitPlusBody,
)
from frigate.api.defs.events_query_parameters import (
    DEFAULT_TIME_RANGE,
    EventsQueryParams,
    EventsSearchQueryParams,
    EventsSummaryQueryParams,
)
from frigate.api.defs.regenerate_query_parameters import (
    RegenerateQueryParameters,
)
from frigate.api.defs.tags import Tags
from frigate.const import (
    CLIPS_DIR,
)
from frigate.embeddings import EmbeddingsContext
from frigate.models import Event, ReviewSegment, Timeline
from frigate.object_processing import TrackedObject
from frigate.util.builtin import get_tz_modifiers

logger = logging.getLogger(__name__)

router = APIRouter(tags=[Tags.events])


@router.get("/events")
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
    is_submitted = params.is_submitted
    min_length = params.min_length
    max_length = params.max_length

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

    if min_length is not None:
        clauses.append(((Event.end_time - Event.start_time) >= min_length))

    if max_length is not None:
        clauses.append(((Event.end_time - Event.start_time) <= max_length))

    if is_submitted is not None:
        if is_submitted == 0:
            clauses.append((Event.plus_id.is_null()))
        elif is_submitted > 0:
            clauses.append((Event.plus_id != ""))

    if len(clauses) == 0:
        clauses.append((True))

    if sort:
        if sort == "score_asc":
            order_by = Event.data["score"].asc()
        elif sort == "score_desc":
            order_by = Event.data["score"].desc()
        elif sort == "date_asc":
            order_by = Event.start_time.asc()
        elif sort == "date_desc":
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


@router.get("/events/explore")
def events_explore(limit: int = 10):
    subquery = Event.select(
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
        fn.rank()
        .over(partition_by=[Event.label], order_by=[Event.start_time.desc()])
        .alias("rank"),
        fn.COUNT(Event.id).over(partition_by=[Event.label]).alias("event_count"),
    ).alias("subquery")

    query = (
        Event.select(
            subquery.c.id,
            subquery.c.camera,
            subquery.c.label,
            subquery.c.zones,
            subquery.c.start_time,
            subquery.c.end_time,
            subquery.c.has_clip,
            subquery.c.has_snapshot,
            subquery.c.plus_id,
            subquery.c.retain_indefinitely,
            subquery.c.sub_label,
            subquery.c.top_score,
            subquery.c.false_positive,
            subquery.c.box,
            subquery.c.data,
            subquery.c.event_count,
        )
        .from_(subquery)
        .where(subquery.c.rank <= limit)
        .order_by(subquery.c.event_count.desc(), subquery.c.start_time.desc())
        .dicts()
    )

    events = list(query.iterator())

    processed_events = [
        {k: v for k, v in event.items() if k != "data"}
        | {
            "data": {
                k: v
                for k, v in event["data"].items()
                if k in ["type", "score", "top_score", "description"]
            }
        }
        for event in events
    ]

    return JSONResponse(content=processed_events)


@router.get("/event_ids")
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

    # Filters
    cameras = params.cameras
    labels = params.labels
    zones = params.zones
    after = params.after
    before = params.before
    time_range = params.time_range

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

    if after:
        event_filters.append((Event.start_time > after))

    if before:
        event_filters.append((Event.start_time < before))

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
            if k in ["type", "score", "top_score", "description"]
        }

        if event["id"] in search_results:
            processed_event["search_distance"] = search_results[event["id"]]["distance"]
            processed_event["search_source"] = search_results[event["id"]]["source"]

        processed_events.append(processed_event)

    # Sort by search distance if search_results are available, otherwise by start_time
    if search_results:
        processed_events.sort(key=lambda x: x.get("search_distance", float("inf")))
    else:
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
            (Event.start_time + seconds_offset).cast("int") / (3600 * 24),
            Event.zones,
        )
    )

    return JSONResponse(content=[e for e in groups.dicts()])


@router.get("/events/{event_id}")
def event(event_id: str):
    try:
        return model_to_dict(Event.get(Event.id == event_id))
    except DoesNotExist:
        return JSONResponse(content="Event not found", status_code=404)


@router.post("/events/{event_id}/retain")
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


@router.post("/events/{event_id}/plus")
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


@router.put("/events/{event_id}/false_positive")
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


@router.delete("/events/{event_id}/retain")
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


@router.post("/events/{event_id}/sub_label")
def set_sub_label(
    request: Request,
    event_id: str,
    body: EventsSubLabelBody,
):
    try:
        event: Event = Event.get(Event.id == event_id)
    except DoesNotExist:
        return JSONResponse(
            content=({"success": False, "message": "Event " + event_id + " not found"}),
            status_code=404,
        )

    new_sub_label = body.subLabel
    new_score = body.subLabelScore

    if not event.end_time:
        # update tracked object
        tracked_obj: TrackedObject = (
            request.app.detected_frames_processor.camera_states[
                event.camera
            ].tracked_objects.get(event.id)
        )

        if tracked_obj:
            tracked_obj.obj_data["sub_label"] = (new_sub_label, new_score)

        # update timeline items
        Timeline.update(
            data=Timeline.data.update({"sub_label": (new_sub_label, new_score)})
        ).where(Timeline.source_id == event_id).execute()

    event.sub_label = new_sub_label

    if new_score:
        data = event.data
        data["sub_label_score"] = new_score
        event.data = data

    event.save()
    return JSONResponse(
        content=(
            {
                "success": True,
                "message": "Event " + event_id + " sub label set to " + new_sub_label,
            }
        ),
        status_code=200,
    )


@router.post("/events/{event_id}/description")
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


@router.put("/events/{event_id}/description/regenerate")
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

    if (
        request.app.frigate_config.semantic_search.enabled
        and request.app.frigate_config.genai.enabled
    ):
        request.app.event_metadata_updater.publish((event.id, params.source))

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
                "message": "Semantic search and generative AI are not enabled",
            }
        ),
        status_code=400,
    )


@router.delete("/events/{event_id}")
def delete_event(request: Request, event_id: str):
    try:
        event = Event.get(Event.id == event_id)
    except DoesNotExist:
        return JSONResponse(
            content=({"success": False, "message": "Event " + event_id + " not found"}),
            status_code=404,
        )

    media_name = f"{event.camera}-{event.id}"
    if event.has_snapshot:
        media = Path(f"{os.path.join(CLIPS_DIR, media_name)}.jpg")
        media.unlink(missing_ok=True)
        media = Path(f"{os.path.join(CLIPS_DIR, media_name)}-clean.png")
        media.unlink(missing_ok=True)
    if event.has_clip:
        media = Path(f"{os.path.join(CLIPS_DIR, media_name)}.mp4")
        media.unlink(missing_ok=True)

    event.delete_instance()
    Timeline.delete().where(Timeline.source_id == event_id).execute()
    # If semantic search is enabled, update the index
    if request.app.frigate_config.semantic_search.enabled:
        context: EmbeddingsContext = request.app.embeddings
        context.db.delete_embeddings_thumbnail(event_ids=[event_id])
        context.db.delete_embeddings_description(event_ids=[event_id])
    return JSONResponse(
        content=({"success": True, "message": "Event " + event_id + " deleted"}),
        status_code=200,
    )


@router.post("/events/{camera_name}/{label}/create")
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

    try:
        frame = request.app.detected_frames_processor.get_current_frame(camera_name)

        event_id = request.app.external_processor.create_manual_event(
            camera_name,
            label,
            body.source_type,
            body.sub_label,
            body.score,
            body.duration,
            body.include_recording,
            body.draw,
            frame,
        )
    except Exception as e:
        logger.error(e)
        return JSONResponse(
            content=({"success": False, "message": "An unknown error occurred"}),
            status_code=500,
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


@router.put("/events/{event_id}/end")
def end_event(request: Request, event_id: str, body: EventsEndBody):
    try:
        end_time = body.end_time or datetime.datetime.now().timestamp()
        request.app.external_processor.finish_manual_event(event_id, end_time)
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
