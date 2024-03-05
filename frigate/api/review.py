"""Review apis."""

import logging
from datetime import datetime, timedelta
from functools import reduce

import pandas as pd
from flask import (
    Blueprint,
    jsonify,
    make_response,
    request,
)
from peewee import Case, DoesNotExist, fn, operator

from frigate.models import Recordings, ReviewSegment
from frigate.util.builtin import get_tz_modifiers

logger = logging.getLogger(__name__)

ReviewBp = Blueprint("reviews", __name__)


@ReviewBp.route("/review")
def review():
    cameras = request.args.get("cameras", "all")
    labels = request.args.get("labels", "all")
    reviewed = request.args.get("reviewed", type=int, default=0)
    limit = request.args.get("limit", 100)
    severity = request.args.get("severity", None)

    before = request.args.get("before", type=float, default=datetime.now().timestamp())
    after = request.args.get(
        "after", type=float, default=(datetime.now() - timedelta(hours=18)).timestamp()
    )

    clauses = [((ReviewSegment.start_time > after) & (ReviewSegment.end_time < before))]

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
    )

    return jsonify([r for r in review])


@ReviewBp.route("/review/summary")
def review_summary():
    tz_name = request.args.get("timezone", default="utc", type=str)
    hour_modifier, minute_modifier, seconds_offset = get_tz_modifiers(tz_name)
    day_ago = (datetime.now() - timedelta(hours=24)).timestamp()
    month_ago = (datetime.now() - timedelta(days=30)).timestamp()

    cameras = request.args.get("cameras", "all")
    labels = request.args.get("labels", "all")

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
            )

        label_clause = reduce(operator.or_, label_clauses)
        clauses.append((label_clause))

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
                            (ReviewSegment.severity == "significant_motion"),
                            ReviewSegment.has_been_reviewed,
                        )
                    ],
                    0,
                )
            ).alias("reviewed_motion"),
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
            fn.SUM(
                Case(
                    None,
                    [
                        (
                            (ReviewSegment.severity == "significant_motion"),
                            1,
                        )
                    ],
                    0,
                )
            ).alias("total_motion"),
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
                            (ReviewSegment.severity == "significant_motion"),
                            ReviewSegment.has_been_reviewed,
                        )
                    ],
                    0,
                )
            ).alias("reviewed_motion"),
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
            fn.SUM(
                Case(
                    None,
                    [
                        (
                            (ReviewSegment.severity == "significant_motion"),
                            1,
                        )
                    ],
                    0,
                )
            ).alias("total_motion"),
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

    return jsonify(data)


@ReviewBp.route("/reviews/viewed", methods=("POST",))
def set_multiple_reviewed():
    json: dict[str, any] = request.get_json(silent=True) or {}
    list_of_ids = json.get("ids", "")

    if not list_of_ids or len(list_of_ids) == 0:
        return make_response(
            jsonify({"success": False, "message": "Not a valid list of ids"}), 404
        )

    ReviewSegment.update(has_been_reviewed=True).where(
        ReviewSegment.id << list_of_ids
    ).execute()

    return make_response(
        jsonify({"success": True, "message": "Reviewed multiple items"}), 200
    )


@ReviewBp.route("/review/<id>/viewed", methods=("DELETE",))
def set_not_reviewed(id):
    try:
        review: ReviewSegment = ReviewSegment.get(ReviewSegment.id == id)
    except DoesNotExist:
        return make_response(
            jsonify({"success": False, "message": "Review " + id + " not found"}), 404
        )

    review.has_been_reviewed = False
    review.save()

    return make_response(
        jsonify({"success": True, "message": "Reviewed " + id + " not viewed"}), 200
    )


@ReviewBp.route("/reviews/<ids>", methods=("DELETE",))
def delete_reviews(ids: str):
    list_of_ids = ids.split(",")

    if not list_of_ids or len(list_of_ids) == 0:
        return make_response(
            jsonify({"success": False, "message": "Not a valid list of ids"}), 404
        )

    ReviewSegment.delete().where(ReviewSegment.id << list_of_ids).execute()

    return make_response(jsonify({"success": True, "message": "Delete reviews"}), 200)


@ReviewBp.route("/review/activity")
def review_activity():
    """Get motion and audio activity."""
    cameras = request.args.get("cameras", "all")
    before = request.args.get("before", type=float, default=datetime.now().timestamp())
    after = request.args.get(
        "after", type=float, default=(datetime.now() - timedelta(hours=1)).timestamp()
    )

    clauses = [(Recordings.start_time > after) & (Recordings.end_time < before)]

    if cameras != "all":
        camera_list = cameras.split(",")
        clauses.append((Recordings.camera << camera_list))

    all_recordings: list[Recordings] = (
        Recordings.select(
            Recordings.start_time,
            Recordings.duration,
            Recordings.objects,
            Recordings.motion,
            Recordings.dBFS,
        )
        .where(reduce(operator.and_, clauses))
        .order_by(Recordings.start_time.asc())
        .iterator()
    )

    # format is: { timestamp: segment_start_ts, motion: [0-100], audio: [0 - -100] }
    # periods where active objects / audio was detected will cause motion / audio to be scaled down
    data: list[dict[str, float]] = []

    for rec in all_recordings:
        data.append(
            {
                "start_time": rec.start_time,
                "motion": rec.motion if rec.objects == 0 else 0,
                "audio": rec.dBFS if rec.objects == 0 else 0,
            }
        )

    # get scale in seconds
    scale = request.args.get("scale", type=int, default=30)

    # resample data using pandas to get activity on scaled basis
    df = pd.DataFrame(data, columns=["start_time", "motion", "audio"])

    # set date as datetime index
    df["start_time"] = pd.to_datetime(df["start_time"], unit="s")
    df.set_index(["start_time"], inplace=True)

    # normalize data
    df = df.resample(f"{scale}S").mean().fillna(0.0)
    df["motion"] = (
        (df["motion"] - df["motion"].min())
        / (df["motion"].max() - df["motion"].min())
        * 100
    )
    df["audio"] = (
        (df["audio"] - df["audio"].max())
        / (df["audio"].min() - df["audio"].max())
        * -100
    )

    # change types for output
    df.index = df.index.astype(int) // (10**9)
    normalized = df.reset_index().to_dict("records")
    return jsonify(normalized)
