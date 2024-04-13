"""Review apis."""

import logging
from datetime import datetime, timedelta
from functools import reduce
from pathlib import Path

import pandas as pd
from flask import Blueprint, jsonify, make_response, request
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
    limit = request.args.get("limit", type=int, default=None)
    severity = request.args.get("severity", None)

    before = request.args.get("before", type=float, default=datetime.now().timestamp())
    after = request.args.get(
        "after", type=float, default=(datetime.now() - timedelta(hours=24)).timestamp()
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
                | (ReviewSegment.data["audio"].cast("text") % f'*"{label}"*')
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


@ReviewBp.route("/reviews/delete", methods=("POST",))
def delete_reviews():
    json: dict[str, any] = request.get_json(silent=True) or {}
    list_of_ids = json.get("ids", "")

    if not list_of_ids or len(list_of_ids) == 0:
        return make_response(
            jsonify({"success": False, "message": "Not a valid list of ids"}), 404
        )

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

    return make_response(jsonify({"success": True, "message": "Delete reviews"}), 200)


@ReviewBp.route("/review/activity/motion")
def motion_activity():
    """Get motion and audio activity."""
    cameras = request.args.get("cameras", "all")
    before = request.args.get("before", type=float, default=datetime.now().timestamp())
    after = request.args.get(
        "after", type=float, default=(datetime.now() - timedelta(hours=1)).timestamp()
    )

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

    # get scale in seconds
    scale = request.args.get("scale", type=int, default=30)

    # resample data using pandas to get activity on scaled basis
    df = pd.DataFrame(data, columns=["start_time", "motion", "camera"])

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
        df.iloc[i : i + chunk, 0] = (
            (part["motion"] - part["motion"].min())
            / (part["motion"].max() - part["motion"].min())
            * 100
        ).fillna(0.0)

    # change types for output
    df.index = df.index.astype(int) // (10**9)
    normalized = df.reset_index().to_dict("records")
    return jsonify(normalized)


@ReviewBp.route("/review/activity/audio")
def audio_activity():
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
            Recordings.dBFS,
        )
        .where(reduce(operator.and_, clauses))
        .order_by(Recordings.start_time.asc())
        .iterator()
    )

    # format is: { timestamp: segment_start_ts, motion: [0-100], audio: [0 - -100] }
    # periods where active objects / audio was detected will cause audio to be scaled down
    data: list[dict[str, float]] = []

    for rec in all_recordings:
        data.append(
            {
                "start_time": rec.start_time,
                "audio": rec.dBFS if rec.objects == 0 else 0,
            }
        )

    # get scale in seconds
    scale = request.args.get("scale", type=int, default=30)

    # resample data using pandas to get activity on scaled basis
    df = pd.DataFrame(data, columns=["start_time", "audio"])

    # set date as datetime index
    df["start_time"] = pd.to_datetime(df["start_time"], unit="s")
    df.set_index(["start_time"], inplace=True)

    # normalize data
    df = df.resample(f"{scale}S").mean().fillna(0.0)
    df["audio"] = (
        (df["audio"] - df["audio"].max())
        / (df["audio"].min() - df["audio"].max())
        * -100
    )

    # change types for output
    df.index = df.index.astype(int) // (10**9)
    normalized = df.reset_index().to_dict("records")
    return jsonify(normalized)
