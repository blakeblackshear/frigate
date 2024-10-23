"""Review apis."""

import datetime
import logging
from functools import reduce
from pathlib import Path

import pandas as pd
from fastapi import APIRouter
from fastapi.params import Depends
from fastapi.responses import JSONResponse
from peewee import Case, DoesNotExist, fn, operator
from playhouse.shortcuts import model_to_dict

from frigate.api.defs.generic_response import GenericResponse
from frigate.api.defs.review_body import ReviewModifyMultipleBody
from frigate.api.defs.review_query_parameters import (
    ReviewActivityMotionQueryParams,
    ReviewQueryParams,
    ReviewSummaryQueryParams,
)
from frigate.api.defs.review_responses import (
    ReviewActivityMotionResponse,
    ReviewSegmentResponse,
    ReviewSummaryResponse,
)
from frigate.api.defs.tags import Tags
from frigate.models import Recordings, ReviewSegment
from frigate.util.builtin import get_tz_modifiers

logger = logging.getLogger(__name__)

router = APIRouter(tags=[Tags.review])


@router.get("/review", response_model=list[ReviewSegmentResponse])
def review(params: ReviewQueryParams = Depends()):
    cameras = params.cameras
    labels = params.labels
    zones = params.zones
    reviewed = params.reviewed
    limit = params.limit
    severity = params.severity
    before = params.before or datetime.datetime.now().timestamp()
    after = (
        params.after
        or (datetime.datetime.now() - datetime.timedelta(hours=24)).timestamp()
    )

    clauses = [
        (
            (ReviewSegment.start_time > after)
            & (
                (ReviewSegment.end_time.is_null(True))
                | (ReviewSegment.end_time < before)
            )
        )
    ]

    if cameras != "all":
        camera_list = cameras.split(",")
        clauses.append((ReviewSegment.camera << camera_list))

    if labels != "all":
        # use matching so segments with multiple labels
        # still match on a search where any label matches
        label_clauses = []
        filtered_labels = labels.split(",")

        for label in filtered_labels:
            label_clauses.append(
                (ReviewSegment.data["objects"].cast("text") % f'*"{label}"*')
                | (ReviewSegment.data["audio"].cast("text") % f'*"{label}"*')
            )

        label_clause = reduce(operator.or_, label_clauses)
        clauses.append((label_clause))

    if zones != "all":
        # use matching so segments with multiple zones
        # still match on a search where any zone matches
        zone_clauses = []
        filtered_zones = zones.split(",")

        for zone in filtered_zones:
            zone_clauses.append(
                (ReviewSegment.data["zones"].cast("text") % f'*"{zone}"*')
            )

        zone_clause = reduce(operator.or_, zone_clauses)
        clauses.append((zone_clause))

    if reviewed == 0:
        clauses.append((ReviewSegment.has_been_reviewed == False))

    if severity:
        clauses.append((ReviewSegment.severity == severity))

    review = (
        ReviewSegment.select()
        .where(reduce(operator.and_, clauses))
        .order_by(ReviewSegment.severity.asc())
        .order_by(ReviewSegment.start_time.desc())
        .limit(limit)
        .dicts()
        .iterator()
    )

    return JSONResponse(content=[r for r in review])


@router.get("/review/summary", response_model=ReviewSummaryResponse)
def review_summary(params: ReviewSummaryQueryParams = Depends()):
    hour_modifier, minute_modifier, seconds_offset = get_tz_modifiers(params.timezone)
    day_ago = (datetime.datetime.now() - datetime.timedelta(hours=24)).timestamp()
    month_ago = (datetime.datetime.now() - datetime.timedelta(days=30)).timestamp()

    cameras = params.cameras
    labels = params.labels
    zones = params.zones

    clauses = [(ReviewSegment.start_time > day_ago)]

    if cameras != "all":
        camera_list = cameras.split(",")
        clauses.append((ReviewSegment.camera << camera_list))

    if labels != "all":
        # use matching so segments with multiple labels
        # still match on a search where any label matches
        label_clauses = []
        filtered_labels = labels.split(",")

        for label in filtered_labels:
            label_clauses.append(
                (ReviewSegment.data["objects"].cast("text") % f'*"{label}"*')
                | (ReviewSegment.data["audio"].cast("text") % f'*"{label}"*')
            )

        label_clause = reduce(operator.or_, label_clauses)
        clauses.append((label_clause))

    if zones != "all":
        # use matching so segments with multiple zones
        # still match on a search where any zone matches
        zone_clauses = []
        filtered_zones = zones.split(",")

        for zone in filtered_zones:
            zone_clauses.append(
                (ReviewSegment.data["zones"].cast("text") % f'*"{zone}"*')
            )

        zone_clause = reduce(operator.or_, zone_clauses)
        clauses.append((zone_clause))

    last_24 = (
        ReviewSegment.select(
            fn.SUM(
                Case(
                    None,
                    [
                        (
                            (ReviewSegment.severity == "alert"),
                            ReviewSegment.has_been_reviewed,
                        )
                    ],
                    0,
                )
            ).alias("reviewed_alert"),
            fn.SUM(
                Case(
                    None,
                    [
                        (
                            (ReviewSegment.severity == "detection"),
                            ReviewSegment.has_been_reviewed,
                        )
                    ],
                    0,
                )
            ).alias("reviewed_detection"),
            fn.SUM(
                Case(
                    None,
                    [
                        (
                            (ReviewSegment.severity == "alert"),
                            1,
                        )
                    ],
                    0,
                )
            ).alias("total_alert"),
            fn.SUM(
                Case(
                    None,
                    [
                        (
                            (ReviewSegment.severity == "detection"),
                            1,
                        )
                    ],
                    0,
                )
            ).alias("total_detection"),
        )
        .where(reduce(operator.and_, clauses))
        .dicts()
        .get()
    )

    clauses = [(ReviewSegment.start_time > month_ago)]

    if cameras != "all":
        camera_list = cameras.split(",")
        clauses.append((ReviewSegment.camera << camera_list))

    if labels != "all":
        # use matching so segments with multiple labels
        # still match on a search where any label matches
        label_clauses = []
        filtered_labels = labels.split(",")

        for label in filtered_labels:
            label_clauses.append(
                (ReviewSegment.data["objects"].cast("text") % f'*"{label}"*')
            )

        label_clause = reduce(operator.or_, label_clauses)
        clauses.append((label_clause))

    last_month = (
        ReviewSegment.select(
            fn.strftime(
                "%Y-%m-%d",
                fn.datetime(
                    ReviewSegment.start_time,
                    "unixepoch",
                    hour_modifier,
                    minute_modifier,
                ),
            ).alias("day"),
            fn.SUM(
                Case(
                    None,
                    [
                        (
                            (ReviewSegment.severity == "alert"),
                            ReviewSegment.has_been_reviewed,
                        )
                    ],
                    0,
                )
            ).alias("reviewed_alert"),
            fn.SUM(
                Case(
                    None,
                    [
                        (
                            (ReviewSegment.severity == "detection"),
                            ReviewSegment.has_been_reviewed,
                        )
                    ],
                    0,
                )
            ).alias("reviewed_detection"),
            fn.SUM(
                Case(
                    None,
                    [
                        (
                            (ReviewSegment.severity == "alert"),
                            1,
                        )
                    ],
                    0,
                )
            ).alias("total_alert"),
            fn.SUM(
                Case(
                    None,
                    [
                        (
                            (ReviewSegment.severity == "detection"),
                            1,
                        )
                    ],
                    0,
                )
            ).alias("total_detection"),
        )
        .where(reduce(operator.and_, clauses))
        .group_by(
            (ReviewSegment.start_time + seconds_offset).cast("int") / (3600 * 24),
        )
        .order_by(ReviewSegment.start_time.desc())
    )

    data = {
        "last24Hours": last_24,
    }

    for e in last_month.dicts().iterator():
        data[e["day"]] = e

    return JSONResponse(content=data)


@router.post("/reviews/viewed", response_model=GenericResponse)
def set_multiple_reviewed(body: ReviewModifyMultipleBody):
    ReviewSegment.update(has_been_reviewed=True).where(
        ReviewSegment.id << body.ids
    ).execute()

    return JSONResponse(
        content=({"success": True, "message": "Reviewed multiple items"}),
        status_code=200,
    )


@router.post("/reviews/delete", response_model=GenericResponse)
def delete_reviews(body: ReviewModifyMultipleBody):
    list_of_ids = body.ids
    reviews = (
        ReviewSegment.select(
            ReviewSegment.camera,
            ReviewSegment.start_time,
            ReviewSegment.end_time,
        )
        .where(ReviewSegment.id << list_of_ids)
        .dicts()
        .iterator()
    )
    recording_ids = []

    for review in reviews:
        start_time = review["start_time"]
        end_time = review["end_time"]
        camera_name = review["camera"]
        recordings = (
            Recordings.select(Recordings.id, Recordings.path)
            .where(
                Recordings.start_time.between(start_time, end_time)
                | Recordings.end_time.between(start_time, end_time)
                | (
                    (start_time > Recordings.start_time)
                    & (end_time < Recordings.end_time)
                )
            )
            .where(Recordings.camera == camera_name)
            .dicts()
            .iterator()
        )

        for recording in recordings:
            Path(recording["path"]).unlink(missing_ok=True)
            recording_ids.append(recording["id"])

    # delete recordings and review segments
    Recordings.delete().where(Recordings.id << recording_ids).execute()
    ReviewSegment.delete().where(ReviewSegment.id << list_of_ids).execute()

    return JSONResponse(
        content=({"success": True, "message": "Delete reviews"}), status_code=200
    )


@router.get(
    "/review/activity/motion", response_model=list[ReviewActivityMotionResponse]
)
def motion_activity(params: ReviewActivityMotionQueryParams = Depends()):
    """Get motion and audio activity."""
    cameras = params.cameras
    before = params.before or datetime.datetime.now().timestamp()
    after = (
        params.after
        or (datetime.datetime.now() - datetime.timedelta(hours=1)).timestamp()
    )
    # get scale in seconds
    scale = params.scale

    clauses = [(Recordings.start_time > after) & (Recordings.end_time < before)]
    clauses.append((Recordings.motion > 0))

    if cameras != "all":
        camera_list = cameras.split(",")
        clauses.append((Recordings.camera << camera_list))

    data: list[Recordings] = (
        Recordings.select(
            Recordings.camera,
            Recordings.start_time,
            Recordings.motion,
        )
        .where(reduce(operator.and_, clauses))
        .order_by(Recordings.start_time.asc())
        .dicts()
        .iterator()
    )

    # resample data using pandas to get activity on scaled basis
    df = pd.DataFrame(data, columns=["start_time", "motion", "camera"])

    if df.empty:
        logger.warning("No motion data found for the requested time range")
        return JSONResponse(content=[])

    df = df.astype(dtype={"motion": "float32"})

    # set date as datetime index
    df["start_time"] = pd.to_datetime(df["start_time"], unit="s")
    df.set_index(["start_time"], inplace=True)

    # normalize data
    motion = (
        df["motion"]
        .resample(f"{scale}s")
        .apply(lambda x: max(x, key=abs, default=0.0))
        .fillna(0.0)
        .to_frame()
    )
    cameras = df["camera"].resample(f"{scale}s").agg(lambda x: ",".join(set(x)))
    df = motion.join(cameras)

    length = df.shape[0]
    chunk = int(60 * (60 / scale))

    for i in range(0, length, chunk):
        part = df.iloc[i : i + chunk]
        min_val, max_val = part["motion"].min(), part["motion"].max()
        if min_val != max_val:
            df.iloc[i : i + chunk, 0] = (
                part["motion"].sub(min_val).div(max_val - min_val).mul(100).fillna(0)
            )
        else:
            df.iloc[i : i + chunk, 0] = 0.0

    # change types for output
    df.index = df.index.astype(int) // (10**9)
    normalized = df.reset_index().to_dict("records")
    return JSONResponse(content=normalized)


@router.get("/review/event/{event_id}", response_model=ReviewSegmentResponse)
def get_review_from_event(event_id: str):
    try:
        return JSONResponse(
            model_to_dict(
                ReviewSegment.get(
                    ReviewSegment.data["detections"].cast("text") % f'*"{event_id}"*'
                )
            )
        )
    except DoesNotExist:
        return JSONResponse(
            content={"success": False, "message": "Review item not found"},
            status_code=404,
        )


@router.get("/review/{review_id}", response_model=ReviewSegmentResponse)
def get_review(review_id: str):
    try:
        return JSONResponse(
            content=model_to_dict(ReviewSegment.get(ReviewSegment.id == review_id))
        )
    except DoesNotExist:
        return JSONResponse(
            content={"success": False, "message": "Review item not found"},
            status_code=404,
        )


@router.delete("/review/{review_id}/viewed", response_model=GenericResponse)
def set_not_reviewed(review_id: str):
    try:
        review: ReviewSegment = ReviewSegment.get(ReviewSegment.id == review_id)
    except DoesNotExist:
        return JSONResponse(
            content=(
                {"success": False, "message": "Review " + review_id + " not found"}
            ),
            status_code=404,
        )

    review.has_been_reviewed = False
    review.save()

    return JSONResponse(
        content=(
            {"success": True, "message": "Set Review " + review_id + " as not viewed"}
        ),
        status_code=200,
    )
