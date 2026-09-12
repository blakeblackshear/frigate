"""Image and video apis."""

import asyncio
import glob
import logging
import math
import os
import subprocess as sp
import tempfile
import time
from collections.abc import Iterator
from datetime import UTC, datetime, timedelta
from enum import Enum
from pathlib import Path as FilePath
from typing import IO, Any
from urllib.parse import unquote

import cv2
import numpy as np
import pytz
from fastapi import APIRouter, Depends, Path, Query, Request, Response
from fastapi.responses import FileResponse, JSONResponse, StreamingResponse
from pathvalidate import sanitize_filename
from peewee import DoesNotExist, fn
from tzlocal import get_localzone_name

from frigate.api.auth import (
    allow_any_authenticated,
    require_camera_access,
    require_role,
)
from frigate.api.defs.query.media_query_parameters import (
    Extension,
    MediaEventsSnapshotQueryParams,
    MediaLatestFrameQueryParams,
    MediaMjpegFeedQueryParams,
)
from frigate.api.defs.tags import Tags
from frigate.camera.state import CameraState
from frigate.config import FrigateConfig
from frigate.config.camera.snapshots import SnapshotsConfig
from frigate.const import (
    CACHE_DIR,
    INSTALL_DIR,
    PREVIEW_FRAME_TYPE,
    STREAM_TYPE_MAIN,
    STREAM_TYPE_SUB,
)
from frigate.models import Event, Previews, Recordings, Regions, ReviewSegment
from frigate.output.preview import get_most_recent_preview_frame
from frigate.track.object_processing import TrackedObjectProcessor
from frigate.util.ffmpeg import terminate_ffmpeg_stream
from frigate.util.file import (
    get_event_snapshot_bytes,
    get_event_snapshot_path,
    get_event_thumbnail_bytes,
    load_event_snapshot_image,
)
from frigate.util.image import get_image_from_recording, get_image_quality_params
from frigate.util.object import create_empty_regions_grid
from frigate.util.recording_coverage import (
    build_spans,
    null_audio_glitches,
    plan_clip,
    resolve_coverage,
    stream_has_audio,
)

logger = logging.getLogger(__name__)


# must match the patched MAX_CLIPS in docker/main/build_nginx.sh; a
# normal hour needs ~360, one clip per recording file
NGINX_VOD_MAX_CLIPS = 1080

# tail of ffmpeg's stderr kept for the clip download failure log
CLIP_STDERR_LOG_BYTES = 8192

# how long a drained clip download waits for ffmpeg to exit on its own
CLIP_FFMPEG_EXIT_TIMEOUT = 10


class VodStreamPreference(str, Enum):
    """Stream pin for the path-segment VOD route.

    nginx-vod derives its mapping fetch URI from the playlist URL path
    (query params are dropped), so the preference must be a path segment.
    """

    main = STREAM_TYPE_MAIN
    sub = STREAM_TYPE_SUB


router = APIRouter(tags=[Tags.media])


def _resolve_cache_age(max_cache_age: int) -> int:
    """Return max_cache_age as an int.

    When a media handler is invoked directly by another handler instead of
    through its route, FastAPI doesn't resolve the Query() default and
    max_cache_age arrives as the Query object; fall back to its int default.
    """
    if isinstance(max_cache_age, int):
        return max_cache_age

    return max_cache_age.default


@router.get("/{camera_name}", dependencies=[Depends(require_camera_access)])
async def mjpeg_feed(
    request: Request,
    camera_name: str,
    params: MediaMjpegFeedQueryParams = Depends(),
):
    draw_options = {
        "bounding_boxes": params.bbox,
        "timestamp": params.timestamp,
        "zones": params.zones,
        "mask": params.mask,
        "motion_boxes": params.motion,
        "regions": params.regions,
    }
    if camera_name in request.app.frigate_config.cameras:
        # return a multipart response
        return StreamingResponse(
            imagestream(
                request.app.detected_frames_processor,
                camera_name,
                params.fps,
                params.height,
                draw_options,
            ),
            media_type="multipart/x-mixed-replace;boundary=frame",
        )
    else:
        return JSONResponse(
            content={"success": False, "message": "Camera not found"},
            status_code=404,
        )


def imagestream(
    detected_frames_processor: TrackedObjectProcessor,
    camera_name: str,
    fps: int,
    height: int,
    draw_options: dict[str, Any],
):
    while True:
        # max out at specified FPS
        time.sleep(1 / fps)
        frame = detected_frames_processor.get_current_frame(camera_name, draw_options)
        if frame is None:
            frame = np.zeros((height, int(height * 16 / 9), 3), np.uint8)

        width = int(height * frame.shape[1] / frame.shape[0])
        frame = cv2.resize(frame, dsize=(width, height), interpolation=cv2.INTER_LINEAR)

        ret, jpg = cv2.imencode(".jpg", frame, [int(cv2.IMWRITE_JPEG_QUALITY), 70])
        yield (
            b"--frame\r\n"
            b"Content-Type: image/jpeg\r\n\r\n" + bytearray(jpg.tobytes()) + b"\r\n\r\n"
        )


def _resolve_snapshot_settings(
    snapshot_config: SnapshotsConfig, params: MediaEventsSnapshotQueryParams
) -> dict[str, Any]:
    return {
        "timestamp": snapshot_config.timestamp
        if params.timestamp is None
        else bool(params.timestamp),
        "bounding_box": snapshot_config.bounding_box
        if params.bbox is None
        else bool(params.bbox),
        "crop": snapshot_config.crop if params.crop is None else bool(params.crop),
        "height": snapshot_config.height if params.height is None else params.height,
        "quality": snapshot_config.quality
        if params.quality is None
        else params.quality,
    }


@router.get("/{camera_name}/ptz/info", dependencies=[Depends(require_camera_access)])
async def camera_ptz_info(request: Request, camera_name: str):
    if camera_name in request.app.frigate_config.cameras:
        # Schedule get_camera_info in the OnvifController's event loop
        future = asyncio.run_coroutine_threadsafe(
            request.app.onvif.get_camera_info(camera_name), request.app.onvif.loop
        )
        result = future.result()
        return JSONResponse(content=result)
    else:
        return JSONResponse(
            content={"success": False, "message": "Camera not found"},
            status_code=404,
        )


@router.get(
    "/{camera_name}/latest.{extension}",
    dependencies=[Depends(require_camera_access)],
    description="Returns the latest frame from the specified camera in the requested format (jpg, png, webp). Falls back to preview frames if the camera is offline.",
)
async def latest_frame(
    request: Request,
    camera_name: str,
    extension: Extension,
    params: MediaLatestFrameQueryParams = Depends(),
):
    frame_processor: TrackedObjectProcessor = request.app.detected_frames_processor
    draw_options = {
        "bounding_boxes": params.bbox,
        "timestamp": params.timestamp,
        "zones": params.zones,
        "mask": params.mask,
        "motion_boxes": params.motion,
        "paths": params.paths,
        "regions": params.regions,
    }
    quality_params = get_image_quality_params(extension.value, params.quality)

    camera_config = request.app.frigate_config.cameras.get(camera_name)
    if camera_config is not None:
        frame = frame_processor.get_current_frame(camera_name, draw_options)
        retry_interval = float(camera_config.ffmpeg.retry_interval or 10)

        is_offline = False
        if frame is None or datetime.now().timestamp() > (
            frame_processor.get_current_frame_time(camera_name) + retry_interval
        ):
            last_frame_time = frame_processor.get_current_frame_time(camera_name)
            preview_path = get_most_recent_preview_frame(
                camera_name, before=last_frame_time
            )

            if preview_path:
                logger.debug(f"Using most recent preview frame for {camera_name}")
                frame = cv2.imread(preview_path, cv2.IMREAD_UNCHANGED)

                if frame is not None:
                    is_offline = True

            if frame is None or not is_offline:
                logger.debug(
                    f"No live or preview frame available for {camera_name}. Using error image."
                )
                if request.app.camera_error_image is None:
                    error_image = glob.glob(
                        os.path.join(INSTALL_DIR, "frigate/images/camera-error.jpg")
                    )

                    if len(error_image) > 0:
                        request.app.camera_error_image = cv2.imread(
                            error_image[0], cv2.IMREAD_UNCHANGED
                        )

                frame = request.app.camera_error_image

        height = int(params.height or str(frame.shape[0]))
        width = int(height * frame.shape[1] / frame.shape[0])

        if frame is None:
            return JSONResponse(
                content={"success": False, "message": "Unable to get valid frame"},
                status_code=500,
            )

        if height < 1 or width < 1:
            return JSONResponse(
                content="Invalid height / width requested :: {} / {}".format(
                    height, width
                ),
                status_code=400,
            )

        frame = cv2.resize(frame, dsize=(width, height), interpolation=cv2.INTER_AREA)

        _, img = cv2.imencode(f".{extension.value}", frame, quality_params)

        headers = {
            "Cache-Control": "no-store" if not params.store else "private, max-age=60",
        }

        if is_offline:
            headers["X-Frigate-Offline"] = "true"

        return Response(
            content=img.tobytes(),
            media_type=extension.get_mime_type(),
            headers=headers,
        )
    elif (
        camera_name == "birdseye"
        and request.app.frigate_config.birdseye.enabled
        and request.app.frigate_config.birdseye.restream
    ):
        frame = cv2.cvtColor(
            frame_processor.get_current_frame(camera_name),
            cv2.COLOR_YUV2BGR_I420,
        )

        height = int(params.height or str(frame.shape[0]))
        width = int(height * frame.shape[1] / frame.shape[0])

        frame = cv2.resize(frame, dsize=(width, height), interpolation=cv2.INTER_AREA)

        _, img = cv2.imencode(f".{extension.value}", frame, quality_params)
        return Response(
            content=img.tobytes(),
            media_type=extension.get_mime_type(),
            headers={
                "Cache-Control": "no-store"
                if not params.store
                else "private, max-age=60",
            },
        )
    else:
        return JSONResponse(
            content={"success": False, "message": "Camera not found"},
            status_code=404,
        )


@router.get(
    "/{camera_name}/recordings/{frame_time}/snapshot.{format}",
    dependencies=[Depends(require_camera_access)],
)
async def get_snapshot_from_recording(
    request: Request,
    camera_name: str,
    frame_time: float,
    format: str = Path(enum=["png", "jpg"]),
    height: int = None,
):
    if camera_name not in request.app.frigate_config.cameras:
        return JSONResponse(
            content={"success": False, "message": "Camera not found"},
            status_code=404,
        )
    recording: Recordings | None = None

    try:
        recording = (
            Recordings.select(
                Recordings.path,
                Recordings.start_time,
            )
            .where(
                (frame_time >= Recordings.start_time)
                & (frame_time <= Recordings.end_time)
            )
            .where(Recordings.camera == camera_name)
            .order_by(Recordings.stream_type.asc(), Recordings.start_time.desc())
            .limit(1)
            .get()
        )
    except DoesNotExist:
        # try again with a rounded frame time as it may be between
        # the rounded segment start time
        frame_time = math.ceil(frame_time)
        try:
            recording = (
                Recordings.select(
                    Recordings.path,
                    Recordings.start_time,
                )
                .where(
                    (frame_time >= Recordings.start_time)
                    & (frame_time <= Recordings.end_time)
                )
                .where(Recordings.camera == camera_name)
                .order_by(Recordings.stream_type.asc(), Recordings.start_time.desc())
                .limit(1)
                .get()
            )
        except DoesNotExist:
            pass

    if recording is not None:
        time_in_segment = frame_time - recording.start_time
        codec = "png" if format == "png" else "mjpeg"
        mime_type = "png" if format == "png" else "jpeg"
        config: FrigateConfig = request.app.frigate_config

        image_data = get_image_from_recording(
            config.ffmpeg, recording.path, time_in_segment, codec, height
        )

        if not image_data:
            return JSONResponse(
                content=(
                    {
                        "success": False,
                        "message": f"Unable to parse frame at time {frame_time}",
                    }
                ),
                status_code=404,
            )
        return Response(image_data, headers={"Content-Type": f"image/{mime_type}"})
    else:
        return JSONResponse(
            content={
                "success": False,
                "message": "Recording not found at {}".format(frame_time),
            },
            status_code=404,
        )


@router.post(
    "/{camera_name}/plus/{frame_time}", dependencies=[Depends(require_camera_access)]
)
async def submit_recording_snapshot_to_plus(
    request: Request, camera_name: str, frame_time: str
):
    if camera_name not in request.app.frigate_config.cameras:
        return JSONResponse(
            content={"success": False, "message": "Camera not found"},
            status_code=404,
        )

    frame_time = float(frame_time)
    recording_query = (
        Recordings.select(
            Recordings.path,
            Recordings.start_time,
        )
        .where(
            (frame_time >= Recordings.start_time) & (frame_time <= Recordings.end_time)
        )
        .where(Recordings.camera == camera_name)
        .order_by(Recordings.stream_type.asc(), Recordings.start_time.desc())
        .limit(1)
    )

    try:
        config: FrigateConfig = request.app.frigate_config
        recording: Recordings = recording_query.get()
        time_in_segment = frame_time - recording.start_time
        image_data = get_image_from_recording(
            config.ffmpeg, recording.path, time_in_segment, "png"
        )

        if not image_data:
            return JSONResponse(
                content={
                    "success": False,
                    "message": f"Unable to parse frame at time {frame_time}",
                },
                status_code=404,
            )

        nd = cv2.imdecode(np.frombuffer(image_data, dtype=np.int8), cv2.IMREAD_COLOR)
        await asyncio.to_thread(
            request.app.frigate_config.plus_api.upload_image, nd, camera_name
        )

        return JSONResponse(
            content={
                "success": True,
                "message": "Successfully submitted image.",
            },
            status_code=200,
        )
    except DoesNotExist:
        return JSONResponse(
            content={
                "success": False,
                "message": "Recording not found at {}".format(frame_time),
            },
            status_code=404,
        )


def _read_stderr_tail(stderr_file: IO[bytes]) -> str:
    """Read back the last CLIP_STDERR_LOG_BYTES of a captured stderr file."""
    stderr_file.seek(0, os.SEEK_END)
    stderr_file.seek(max(0, stderr_file.tell() - CLIP_STDERR_LOG_BYTES))
    return stderr_file.read().decode("utf-8", "replace")


def _run_clip_download(ffmpeg_cmd: list[str], file_path: str) -> Iterator[bytes]:
    """Stream an ffmpeg concat remux to the client, always cleaning up after it."""
    stderr_file = None
    ffmpeg = None

    try:
        stderr_file = tempfile.TemporaryFile()
        ffmpeg = sp.Popen(ffmpeg_cmd, stdout=sp.PIPE, stderr=stderr_file)

        while True:
            data = ffmpeg.stdout.read(8192)

            if not data:
                break

            yield data

        try:
            # wait rather than signal, so the real exit code survives
            ffmpeg.wait(timeout=CLIP_FFMPEG_EXIT_TIMEOUT)
        except sp.TimeoutExpired:
            pass
    finally:
        if ffmpeg is not None:
            # read before terminating: a None here is our teardown, not a failure
            exit_code = ffmpeg.poll()
            terminate_ffmpeg_stream(ffmpeg)

            if exit_code:
                logger.error(
                    "Failed to generate clip, ffmpeg logs: %s",
                    _read_stderr_tail(stderr_file),
                )

        if stderr_file is not None:
            stderr_file.close()

        FilePath(file_path).unlink(missing_ok=True)


@router.get(
    "/{camera_name}/start/{start_ts}/end/{end_ts}/clip.mp4",
    dependencies=[Depends(require_camera_access)],
    description="For iOS devices, use the master.m3u8 HLS link instead of clip.mp4. Safari does not reliably process progressive mp4 files.",
)
async def recording_clip(
    request: Request,
    camera_name: str,
    start_ts: float,
    end_ts: float,
):
    def get_clip_query(stream_type: str):
        return (
            Recordings.select(
                Recordings.path,
                Recordings.start_time,
                Recordings.end_time,
            )
            .where(
                (Recordings.start_time.between(start_ts, end_ts))
                | (Recordings.end_time.between(start_ts, end_ts))
                | ((start_ts > Recordings.start_time) & (end_ts < Recordings.end_time))
            )
            .where(Recordings.camera == camera_name)
            .where(Recordings.stream_type == stream_type)
            .order_by(Recordings.start_time.asc())
        )

    # never mix streams in one concat; use main when available and
    # fall back to sub for expired-main history
    recordings = get_clip_query(STREAM_TYPE_MAIN)

    if recordings.count() == 0:
        recordings = get_clip_query(STREAM_TYPE_SUB)

    if recordings.count() == 0:
        return JSONResponse(
            content={
                "success": False,
                "message": "No recordings found for the specified time range",
            },
            status_code=400,
        )

    file_name = sanitize_filename(
        f"playlist_{camera_name}_{start_ts}-{end_ts}_{os.urandom(4).hex()}.txt"
    )
    file_path = os.path.join(CACHE_DIR, file_name)
    with open(file_path, "w") as file:
        clip: Recordings
        for clip in recordings:
            file.write(f"file '{clip.path}'\n")

            # if this is the starting clip, add an inpoint
            if clip.start_time < start_ts:
                file.write(f"inpoint {int(start_ts - clip.start_time)}\n")

            # if this is the ending clip, add an outpoint
            if clip.end_time > end_ts:
                file.write(f"outpoint {int(end_ts - clip.start_time)}\n")

    if len(file_name) > 1000:
        return JSONResponse(
            content={
                "success": False,
                "message": "Filename exceeded max length of 1000",
            },
            status_code=403,
        )

    config: FrigateConfig = request.app.frigate_config

    ffmpeg_cmd = [
        config.ffmpeg.ffmpeg_path,
        "-hide_banner",
        "-y",
        "-protocol_whitelist",
        "pipe,file",
        "-f",
        "concat",
        "-safe",
        "0",
        "-i",
        file_path,
        "-c",
        "copy",
        "-movflags",
        "frag_keyframe+empty_moov",
        "-f",
        "mp4",
        "pipe:",
    ]

    return StreamingResponse(
        _run_clip_download(ffmpeg_cmd, file_path),
        media_type="video/mp4",
    )


def _build_vod_clip(
    row: Any, start: float, end: float
) -> tuple[dict[str, Any], int] | None:
    """Build one nginx-vod clip dict + duration (ms) for a recording row trimmed to [start, end).

    Realization comes entirely from the shared plan_clip, so the coverage
    endpoint's realized timelines match this manifest by construction.
    """
    plan = plan_clip(row, start, end)

    if plan.skipped:
        return None

    clip: dict[str, Any] = {"type": "source", "path": row.path}
    if plan.clip_from_ms is not None:
        clip["clipFrom"] = plan.clip_from_ms
    if plan.key_frame_durations is not None:
        # real gaps enable keyframe-aligned sub-file segments (bootstrap
        # ladder); the whole-clip fallback keeps one segment per file,
        # the only safe cut without an index
        if plan.first_key_frame_offset_ms > 0:
            clip["firstKeyFrameOffset"] = plan.first_key_frame_offset_ms
        clip["keyFrameDurations"] = plan.key_frame_durations
    else:
        clip["keyFrameDurations"] = [plan.duration_ms]
    logger.debug(
        "VOD: added clip %s duration_ms=%s clipFrom=%s",
        row.path,
        plan.duration_ms,
        clip.get("clipFrom"),
    )
    return clip, plan.duration_ms


async def _vod_response(
    camera_name: str,
    start_ts: float,
    end_ts: float,
    force_discontinuity: bool = False,
    stream_preference: str | None = None,
) -> JSONResponse:
    """Build an nginx-vod mapping JSON for a camera over a timestamp range.

    Always a single-sequence mapping; quality selection happens in the
    frontend by choosing between this route and the stream-pinned routes.

    Args:
        camera_name: The camera to build the mapping for
        start_ts: Range start as a unix timestamp
        end_ts: Range end as a unix timestamp
        force_discontinuity: Emit HLS discontinuity markers between clips
        stream_preference: Pin the manifest to one stream type ("main" or
            "sub"), serving only that stream's recordings
    """
    logger.debug(
        "VOD: Generating VOD for %s from %s to %s with force_discontinuity=%s",
        camera_name,
        start_ts,
        end_ts,
        force_discontinuity,
    )
    intervals = resolve_coverage(camera_name, start_ts, end_ts)

    # rows contradicting their stream's audio composition are
    # truncated-shutdown glitches
    main_audio = stream_has_audio(intervals, main=True)
    sub_audio = stream_has_audio(intervals, main=False)

    spans = build_spans(
        null_audio_glitches(intervals, main_audio, sub_audio),
        stream_preference,
    )

    durations: list[int] = []
    clips: list[dict[str, Any]] = []
    # gathered after glitch-nulling and span building, so the policy
    # decisions below reflect the manifest's real contents
    video_codecs: set[str] = set()
    audio_presence: set[bool] = set()
    audio_params: set[tuple[str | None, int | None]] = set()
    span_streams: set[bool] = set()
    for row, span_start, span_end, span_is_main in spans:
        logger.debug(
            "VOD: processing recording: %s start=%s end=%s duration=%s",
            row.path,
            row.start_time,
            row.end_time,
            row.duration,
        )
        built = _build_vod_clip(row, span_start, span_end)

        if built is None:
            continue

        clips.append(built[0])
        durations.append(built[1])
        span_streams.add(span_is_main)
        if row.video_codec is not None:
            video_codecs.add(row.video_codec)
        audio_presence.add(row.has_audio is not False)
        # legacy rows contribute no signature, so uniformly-unknown
        # history keeps the legacy shape
        if row.has_audio is not False and (
            row.audio_codec is not None or row.audio_rate is not None
        ):
            audio_params.add((row.audio_codec, row.audio_rate))

    # nginx-vod requires a uniform track count per sequence, and adding or
    # removing an audio track across an MSE discontinuity is unproven
    if len(audio_presence) > 1:
        logger.debug(
            "VOD: %s mixes audio-bearing and audio-less recordings between "
            "%s and %s; serving the range without audio",
            camera_name,
            start_ts,
            end_ts,
        )
        for clip in clips:
            clip["tracks"] = "v"

    # discontinuity mode emits per-clip init segments, letting the decoder
    # reconfigure at each boundary. Stream type counts as a signature of
    # its own: the two encoders differ in SPS/PPS even when codec name and
    # audio params match, and a single-init manifest then decode-fails on
    # players that only configure from the init segment (iOS)
    use_discontinuity = (
        len(video_codecs) > 1 or len(audio_params) > 1 or len(span_streams) > 1
    )
    if use_discontinuity:
        logger.debug(
            "VOD: %s mixes media signatures between %s and %s (video codecs "
            "%s, audio params %s, streams %s); serving a discontinuity "
            "manifest with per-clip init segments",
            camera_name,
            start_ts,
            end_ts,
            sorted(video_codecs),
            sorted(audio_params, key=str),
            sorted(span_streams),
        )

    if not clips:
        logger.error(
            f"No recordings found for {camera_name} during the requested time range"
        )
        return JSONResponse(
            content={
                "success": False,
                "message": "No recordings found.",
            },
            status_code=404,
        )

    if len(clips) > NGINX_VOD_MAX_CLIPS:
        logger.warning(
            "VOD: %s needs %d clips between %s and %s, exceeding nginx's "
            "limit of %d; playback of this range will fail. This usually "
            "means the camera produced abnormally short recording segments "
            "(check the stream's timestamps)",
            camera_name,
            len(clips),
            start_ts,
            end_ts,
            NGINX_VOD_MAX_CLIPS,
        )

    # segmentation comes from the vod_* nginx directives plus per-clip
    # keyFrameDurations; a segment_duration field here was always ignored
    # (nginx-vod parses only camelCase segmentDuration)
    hour_ago = datetime.now() - timedelta(hours=1)
    content = {
        "cache": hour_ago.timestamp() > start_ts,
        "discontinuity": force_discontinuity or use_discontinuity,
        "consistentSequenceMediaInfo": True,
        "durations": durations,
        "sequences": [{"clips": clips}],
    }
    if use_discontinuity:
        # clip-indexed naming is what makes nginx-vod emit per-clip
        # EXT-X-MAP outside of its live mode
        content["initialClipIndex"] = 1
    return JSONResponse(content=content)


@router.get(
    "/vod/{camera_name}/start/{start_ts}/end/{end_ts}",
    dependencies=[Depends(require_camera_access)],
    description="Returns an HLS playlist for the specified timestamp-range on the specified camera. Append /master.m3u8 or /index.m3u8 for HLS playback.",
)
async def vod_ts(
    camera_name: str,
    start_ts: float,
    end_ts: float,
    force_discontinuity: bool = False,
):
    return await _vod_response(
        camera_name, start_ts, end_ts, force_discontinuity=force_discontinuity
    )


@router.get(
    "/vod/{year_month}/{day}/{hour}/{camera_name}",
    dependencies=[Depends(require_camera_access)],
    description="Returns an HLS playlist for the specified date-time on the specified camera. Append /master.m3u8 or /index.m3u8 for HLS playback.",
)
async def vod_hour_no_timezone(year_month: str, day: int, hour: int, camera_name: str):
    """VOD for specific hour. Uses the default timezone (UTC)."""
    return await vod_hour(
        year_month, day, hour, camera_name, get_localzone_name().replace("/", ",")
    )


@router.get(
    "/vod/{year_month}/{day}/{hour}/{camera_name}/{tz_name}",
    dependencies=[Depends(require_camera_access)],
    description="Returns an HLS playlist for the specified date-time (with timezone) on the specified camera. Append /master.m3u8 or /index.m3u8 for HLS playback.",
)
async def vod_hour(
    year_month: str, day: int, hour: int, camera_name: str, tz_name: str
):
    parts = year_month.split("-")
    start_date = (
        datetime(int(parts[0]), int(parts[1]), day, hour, tzinfo=UTC)
        - datetime.now(pytz.timezone(tz_name.replace(",", "/"))).utcoffset()
    )
    end_date = start_date + timedelta(hours=1) - timedelta(milliseconds=1)
    start_ts = start_date.timestamp()
    end_ts = end_date.timestamp()

    return await vod_ts(camera_name, start_ts, end_ts)


@router.get(
    "/vod/event/{event_id}",
    dependencies=[Depends(allow_any_authenticated())],
    description="Returns an HLS playlist for the specified object. Append /master.m3u8 or /index.m3u8 for HLS playback.",
)
async def vod_event(
    request: Request,
    event_id: str,
    padding: int = Query(0, description="Padding to apply to the vod."),
):
    try:
        event: Event = Event.get(Event.id == event_id)
    except DoesNotExist:
        logger.error(f"Event not found: {event_id}")
        return JSONResponse(
            content={
                "success": False,
                "message": "Event not found.",
            },
            status_code=404,
        )

    await require_camera_access(event.camera, request=request)

    end_ts = (
        datetime.now().timestamp()
        if event.end_time is None
        else (event.end_time + padding)
    )
    vod_response = await vod_ts(event.camera, event.start_time - padding, end_ts)

    # If the recordings are not found and the event started more than 5 minutes ago, set has_clip to false
    if (
        event.start_time < datetime.now().timestamp() - 300
        and type(vod_response) is tuple
        and len(vod_response) == 2
        and vod_response[1] == 404
    ):
        Event.update(has_clip=False).where(Event.id == event_id).execute()

    return vod_response


@router.get(
    "/vod/clip/{camera_name}/start/{start_ts}/end/{end_ts}",
    dependencies=[Depends(require_camera_access)],
    description="Returns an HLS playlist for a timestamp range with HLS discontinuity enabled. Append /master.m3u8 or /index.m3u8 for HLS playback.",
)
async def vod_clip(
    camera_name: str,
    start_ts: float,
    end_ts: float,
):
    # the tracking-details player corrects its timeline from
    # sequences[0].clips[0].clipFrom
    return await _vod_response(
        camera_name,
        start_ts,
        end_ts,
        force_discontinuity=True,
    )


# registered after /vod/clip/... on purpose: both routes are six path
# segments, Starlette matches structurally in registration order, and the
# enum validation on {stream} would otherwise 422 every /vod/clip request
@router.get(
    "/vod/{camera_name}/{stream}/start/{start_ts}/end/{end_ts}",
    dependencies=[Depends(require_camera_access)],
    description="Returns an HLS playlist pinned to one stream type (main or sub) for the specified timestamp-range on the specified camera. Append /master.m3u8 or /index.m3u8 for HLS playback.",
)
async def vod_ts_stream(
    camera_name: str,
    stream: VodStreamPreference,
    start_ts: float,
    end_ts: float,
    force_discontinuity: bool = False,
):
    """VOD for a timestamp range pinned to one stream type.

    How the frontend selects quality, now that mappings are always
    single-sequence.
    """
    return await _vod_response(
        camera_name,
        start_ts,
        end_ts,
        force_discontinuity=force_discontinuity,
        stream_preference=stream.value,
    )


@router.get(
    "/events/{event_id}/snapshot.jpg",
    description="Returns a snapshot image for the specified object id.",
)
async def event_snapshot(
    request: Request,
    event_id: str,
    params: MediaEventsSnapshotQueryParams = Depends(),
):
    event_complete = False
    jpg_bytes = None
    frame_time = 0
    try:
        event = Event.get(Event.id == event_id, Event.end_time != None)
        event_complete = True
        await require_camera_access(event.camera, request=request)
        if not event.has_snapshot:
            return JSONResponse(
                content={"success": False, "message": "Snapshot not available"},
                status_code=404,
            )
        snapshot_settings = _resolve_snapshot_settings(
            request.app.frigate_config.cameras[event.camera].snapshots, params
        )
        jpg_bytes, frame_time = get_event_snapshot_bytes(
            event,
            ext="jpg",
            timestamp=snapshot_settings["timestamp"],
            bounding_box=snapshot_settings["bounding_box"],
            crop=snapshot_settings["crop"],
            height=snapshot_settings["height"],
            quality=snapshot_settings["quality"],
            timestamp_style=request.app.frigate_config.cameras[
                event.camera
            ].timestamp_style,
            colormap=request.app.frigate_config.model_for_camera(event.camera).colormap,
        )
    except DoesNotExist:
        # see if the object is currently being tracked
        try:
            camera_states: list[CameraState] = (
                request.app.detected_frames_processor.get_camera_states()
            )
            for camera_state in camera_states:
                if event_id in camera_state.tracked_objects:
                    tracked_obj = camera_state.tracked_objects.get(event_id)
                    if tracked_obj is not None:
                        snapshot_settings = _resolve_snapshot_settings(
                            camera_state.camera_config.snapshots, params
                        )
                        jpg_bytes, frame_time = tracked_obj.get_img_bytes(
                            ext="jpg",
                            timestamp=snapshot_settings["timestamp"],
                            bounding_box=snapshot_settings["bounding_box"],
                            crop=snapshot_settings["crop"],
                            height=snapshot_settings["height"],
                            quality=snapshot_settings["quality"],
                        )
                        await require_camera_access(camera_state.name, request=request)
        except Exception:
            return JSONResponse(
                content={"success": False, "message": "Ongoing event not found"},
                status_code=404,
            )
    except Exception:
        return JSONResponse(
            content={"success": False, "message": "Unknown error occurred"},
            status_code=404,
        )

    if jpg_bytes is None:
        return JSONResponse(
            content={"success": False, "message": "Live frame not available"},
            status_code=404,
        )

    headers = {
        "Content-Type": "image/jpeg",
        "Cache-Control": "private, max-age=31536000" if event_complete else "no-store",
        "X-Frame-Time": str(frame_time),
    }

    if params.download:
        headers["Content-Disposition"] = f"attachment; filename=snapshot-{event_id}.jpg"

    return Response(
        jpg_bytes,
        media_type="image/jpeg",
        headers=headers,
    )


@router.get(
    "/events/{event_id}/thumbnail.{extension}",
)
async def event_thumbnail(
    request: Request,
    event_id: str,
    extension: Extension,
    max_cache_age: int = Query(
        2592000, description="Max cache age in seconds. Default 30 days in seconds."
    ),
    format: str = Query(default="ios", enum=["ios", "android"]),
):
    thumbnail_bytes = None
    event_complete = False
    try:
        event: Event = Event.get(Event.id == event_id)
        await require_camera_access(event.camera, request=request)
        if event.end_time is not None:
            event_complete = True

        thumbnail_bytes = get_event_thumbnail_bytes(event)
    except DoesNotExist:
        thumbnail_bytes = None

    if not thumbnail_bytes:
        # see if the object is currently being tracked
        try:
            camera_states = request.app.detected_frames_processor.get_camera_states()
            for camera_state in camera_states:
                if event_id in camera_state.tracked_objects:
                    tracked_obj = camera_state.tracked_objects.get(event_id)
                    if tracked_obj is not None:
                        await require_camera_access(camera_state.name, request=request)
                        thumbnail_bytes = tracked_obj.get_thumbnail(extension.value)
        except Exception:
            return JSONResponse(
                content={"success": False, "message": "Event not found"},
                status_code=404,
            )

    if not thumbnail_bytes:
        return JSONResponse(
            content={"success": False, "message": "Event not found"},
            status_code=404,
        )

    img_as_np = np.frombuffer(thumbnail_bytes, dtype=np.uint8)
    img = cv2.imdecode(img_as_np, flags=1)

    if img is None:
        # thumbnail on disk is truncated or corrupt
        return JSONResponse(
            content={"success": False, "message": "Event not found"},
            status_code=404,
        )

    # android notifications prefer a 2:1 ratio
    if format == "android":
        img = cv2.copyMakeBorder(
            img,
            0,
            0,
            int(img.shape[1] * 0.5),
            int(img.shape[1] * 0.5),
            cv2.BORDER_CONSTANT,
            (0, 0, 0),
        )

    quality_params = None
    if extension in (Extension.jpg, Extension.jpeg):
        quality_params = [int(cv2.IMWRITE_JPEG_QUALITY), 70]
    elif extension == Extension.webp:
        quality_params = [int(cv2.IMWRITE_WEBP_QUALITY), 60]

    _, encoded = cv2.imencode(f".{extension.value}", img, quality_params)
    thumbnail_bytes = encoded.tobytes()

    return Response(
        thumbnail_bytes,
        media_type=extension.get_mime_type(),
        headers={
            "Cache-Control": f"private, max-age={_resolve_cache_age(max_cache_age)}"
            if event_complete
            else "no-store",
        },
    )


@router.get("/{camera_name}/grid.jpg", dependencies=[Depends(require_camera_access)])
def grid_snapshot(
    request: Request, camera_name: str, color: str = "green", font_scale: float = 0.5
):
    if camera_name in request.app.frigate_config.cameras:
        detect = request.app.frigate_config.cameras[camera_name].detect
        frame_processor: TrackedObjectProcessor = request.app.detected_frames_processor
        frame = frame_processor.get_current_frame(camera_name, {})
        retry_interval = float(
            request.app.frigate_config.cameras.get(camera_name).ffmpeg.retry_interval
            or 10
        )

        if frame is None or datetime.now().timestamp() > (
            frame_processor.get_current_frame_time(camera_name) + retry_interval
        ):
            return JSONResponse(
                content={"success": False, "message": "Unable to get valid frame"},
                status_code=500,
            )

        try:
            grid = (
                Regions.select(Regions.grid)
                .where(Regions.camera == camera_name)
                .get()
                .grid
            )
        except DoesNotExist:
            return JSONResponse(
                content={"success": False, "message": "Unable to get region grid"},
                status_code=500,
            )

        color_arg = color.lower()

        if color_arg == "red":
            draw_color = (0, 0, 255)
        elif color_arg == "blue":
            draw_color = (255, 0, 0)
        elif color_arg == "black":
            draw_color = (0, 0, 0)
        elif color_arg == "white":
            draw_color = (255, 255, 255)
        else:
            draw_color = (0, 255, 0)  # green

        grid_size = len(grid)
        grid_coef = 1.0 / grid_size
        width = detect.width
        height = detect.height
        for x in range(grid_size):
            for y in range(grid_size):
                cell = grid[x][y]

                if len(cell["sizes"]) == 0:
                    continue

                std_dev = round(cell["std_dev"] * width, 2)
                mean = round(cell["mean"] * width, 2)
                cv2.rectangle(
                    frame,
                    (int(x * grid_coef * width), int(y * grid_coef * height)),
                    (
                        int((x + 1) * grid_coef * width),
                        int((y + 1) * grid_coef * height),
                    ),
                    draw_color,
                    2,
                )
                cv2.putText(
                    frame,
                    f"#: {len(cell['sizes'])}",
                    (
                        int(x * grid_coef * width + 10),
                        int((y * grid_coef + 0.02) * height),
                    ),
                    cv2.FONT_HERSHEY_SIMPLEX,
                    fontScale=font_scale,
                    color=draw_color,
                    thickness=2,
                )
                cv2.putText(
                    frame,
                    f"std: {std_dev}",
                    (
                        int(x * grid_coef * width + 10),
                        int((y * grid_coef + 0.05) * height),
                    ),
                    cv2.FONT_HERSHEY_SIMPLEX,
                    fontScale=font_scale,
                    color=draw_color,
                    thickness=2,
                )
                cv2.putText(
                    frame,
                    f"avg: {mean}",
                    (
                        int(x * grid_coef * width + 10),
                        int((y * grid_coef + 0.08) * height),
                    ),
                    cv2.FONT_HERSHEY_SIMPLEX,
                    fontScale=font_scale,
                    color=draw_color,
                    thickness=2,
                )

        ret, jpg = cv2.imencode(".jpg", frame, [int(cv2.IMWRITE_JPEG_QUALITY), 70])

        return Response(
            jpg.tobytes(),
            media_type="image/jpeg",
            headers={"Cache-Control": "no-store"},
        )
    else:
        return JSONResponse(
            content={"success": False, "message": "Camera not found"},
            status_code=404,
        )


@router.delete(
    "/{camera_name}/region_grid", dependencies=[Depends(require_role(["admin"]))]
)
def clear_region_grid(request: Request, camera_name: str):
    """Clear the region grid for a camera."""
    if camera_name not in request.app.frigate_config.cameras:
        return JSONResponse(
            content={"success": False, "message": "Camera not found"},
            status_code=404,
        )

    # store an empty grid instead of deleting the row so the grid is
    # rebuilt from newly tracked objects and not from all past history
    region = {
        Regions.camera: camera_name,
        Regions.grid: create_empty_regions_grid(),
        Regions.last_update: datetime.now().timestamp(),
    }
    (
        Regions.insert(region)
        .on_conflict(
            conflict_target=[Regions.camera],
            update=region,
        )
        .execute()
    )
    return JSONResponse(
        content={"success": True, "message": "Region grid cleared"},
    )


@router.get(
    "/events/{event_id}/snapshot-clean.webp",
)
async def event_snapshot_clean(request: Request, event_id: str, download: bool = False):
    webp_bytes = None
    event_complete = False
    try:
        event = Event.get(Event.id == event_id)
        event_complete = event.end_time is not None
        await require_camera_access(event.camera, request=request)
        snapshot_config = request.app.frigate_config.cameras[event.camera].snapshots
        if not (snapshot_config.enabled and event.has_snapshot):
            return JSONResponse(
                content={
                    "success": False,
                    "message": "Snapshots must be enabled in the config",
                },
                status_code=404,
            )
        if event.end_time is None:
            # see if the object is currently being tracked
            try:
                camera_states = (
                    request.app.detected_frames_processor.get_camera_states()
                )
                for camera_state in camera_states:
                    if event_id in camera_state.tracked_objects:
                        tracked_obj = camera_state.tracked_objects.get(event_id)
                        if tracked_obj is not None:
                            webp_bytes = tracked_obj.get_clean_webp()
                            break
            except Exception:
                return JSONResponse(
                    content={"success": False, "message": "Event not found"},
                    status_code=404,
                )
        elif not event.has_snapshot:
            return JSONResponse(
                content={"success": False, "message": "Snapshot not available"},
                status_code=404,
            )
    except DoesNotExist:
        return JSONResponse(
            content={"success": False, "message": "Event not found"}, status_code=404
        )
    if webp_bytes is None:
        try:
            image_path, is_clean_snapshot = get_event_snapshot_path(
                event, clean_only=True
            )
            if not is_clean_snapshot or image_path is None:
                return JSONResponse(
                    content={
                        "success": False,
                        "message": "Clean snapshot not available",
                    },
                    status_code=404,
                )

            if image_path.endswith(".webp"):
                with open(image_path, "rb") as image_file:
                    webp_bytes = image_file.read()
            else:
                image = load_event_snapshot_image(event, clean_only=True)[0]
                if image is None:
                    return JSONResponse(
                        content={
                            "success": False,
                            "message": "Unable to load clean snapshot for event",
                        },
                        status_code=400,
                    )

                ret, webp_data = cv2.imencode(
                    ".webp", image, get_image_quality_params("webp", None)
                )
                if not ret:
                    return JSONResponse(
                        content={
                            "success": False,
                            "message": "Unable to convert snapshot to webp",
                        },
                        status_code=400,
                    )

                webp_bytes = webp_data.tobytes()
        except Exception:
            logger.error(f"Unable to load clean snapshot for event: {event.id}")
            return JSONResponse(
                content={
                    "success": False,
                    "message": "Unable to load clean snapshot for event",
                },
                status_code=400,
            )

    headers = {
        "Content-Type": "image/webp",
        "Cache-Control": "private, max-age=31536000" if event_complete else "no-cache",
    }

    if download:
        headers["Content-Disposition"] = (
            f"attachment; filename=snapshot-{event_id}-clean.webp"
        )

    return Response(
        webp_bytes,
        media_type="image/webp",
        headers=headers,
    )


@router.get(
    "/events/{event_id}/clip.mp4",
)
async def event_clip(
    request: Request,
    event_id: str,
    padding: int = Query(0, description="Padding to apply to clip."),
):
    try:
        event: Event = Event.get(Event.id == event_id)
    except DoesNotExist:
        return JSONResponse(
            content={"success": False, "message": "Event not found"}, status_code=404
        )

    await require_camera_access(event.camera, request=request)

    if not event.has_clip:
        return JSONResponse(
            content={"success": False, "message": "Clip not available"}, status_code=404
        )

    end_ts = (
        datetime.now().timestamp()
        if event.end_time is None
        else event.end_time + padding
    )
    return await recording_clip(
        request, event.camera, event.start_time - padding, end_ts
    )


@router.get(
    "/review/{review_id}/clip.mp4",
)
async def review_clip(
    request: Request,
    review_id: str,
    padding: int = Query(0, description="Padding to apply to clip."),
):
    try:
        review: ReviewSegment = ReviewSegment.get(ReviewSegment.id == review_id)
    except DoesNotExist:
        return JSONResponse(
            content={"success": False, "message": "Review not found"}, status_code=404
        )

    await require_camera_access(review.camera, request=request)

    end_ts = (
        datetime.now().timestamp()
        if review.end_time is None
        else review.end_time + padding
    )
    return await recording_clip(
        request, review.camera, review.start_time - padding, end_ts
    )


@router.get(
    "/events/{event_id}/preview.gif",
)
async def event_preview(request: Request, event_id: str):
    try:
        event: Event = Event.get(Event.id == event_id)
    except DoesNotExist:
        return JSONResponse(
            content={"success": False, "message": "Event not found"}, status_code=404
        )

    await require_camera_access(event.camera, request=request)

    start_ts = event.start_time
    end_ts = start_ts + (
        min(event.end_time - event.start_time, 20) if event.end_time else 20
    )
    return await preview_gif(request, event.camera, start_ts, end_ts)


@router.get(
    "/{camera_name}/start/{start_ts}/end/{end_ts}/preview.gif",
    dependencies=[Depends(require_camera_access)],
)
async def preview_gif(
    request: Request,
    camera_name: str,
    start_ts: float,
    end_ts: float,
    max_cache_age: int = Query(
        2592000, description="Max cache age in seconds. Default 30 days in seconds."
    ),
):
    if datetime.fromtimestamp(start_ts) < datetime.now().replace(minute=0, second=0):
        # has preview mp4
        try:
            preview: Previews = (
                Previews.select(
                    Previews.camera,
                    Previews.path,
                    Previews.duration,
                    Previews.start_time,
                    Previews.end_time,
                )
                .where(
                    Previews.start_time.between(start_ts, end_ts)
                    | Previews.end_time.between(start_ts, end_ts)
                    | ((start_ts > Previews.start_time) & (end_ts < Previews.end_time))
                )
                .where(Previews.camera == camera_name)
                .limit(1)
                .get()
            )
        except DoesNotExist:
            return JSONResponse(
                content={"success": False, "message": "Preview not found"},
                status_code=404,
            )

        diff = start_ts - preview.start_time
        minutes = int(diff / 60)
        seconds = int(diff % 60)
        config: FrigateConfig = request.app.frigate_config
        ffmpeg_cmd = [
            config.ffmpeg.ffmpeg_path,
            "-hide_banner",
            "-loglevel",
            "warning",
            "-ss",
            f"00:{minutes}:{seconds}",
            "-t",
            f"{end_ts - start_ts}",
            "-i",
            preview.path,
            "-r",
            "8",
            "-vf",
            "setpts=0.12*PTS",
            "-loop",
            "0",
            "-c:v",
            "gif",
            "-f",
            "gif",
            "-",
        ]

        process = await asyncio.to_thread(
            sp.run,
            ffmpeg_cmd,
            capture_output=True,
        )

        if process.returncode != 0:
            logger.error(process.stderr)
            return JSONResponse(
                content={"success": False, "message": "Unable to create preview gif"},
                status_code=500,
            )

        gif_bytes = process.stdout
    else:
        # need to generate from existing images
        preview_dir = os.path.join(CACHE_DIR, "preview_frames")

        if not os.path.isdir(preview_dir):
            return JSONResponse(
                content={"success": False, "message": "Preview not found"},
                status_code=404,
            )

        file_start = f"preview_{camera_name}-"
        start_file = f"{file_start}{start_ts}.{PREVIEW_FRAME_TYPE}"
        end_file = f"{file_start}{end_ts}.{PREVIEW_FRAME_TYPE}"

        camera_files = [
            entry.name
            for entry in os.scandir(preview_dir)
            if entry.name.startswith(file_start)
        ]
        camera_files.sort()

        selected_previews = []

        for file in camera_files:
            if file < start_file:
                continue

            if file > end_file:
                break

            selected_previews.append(f"file '{os.path.join(preview_dir, file)}'")
            selected_previews.append("duration 0.12")

        if not selected_previews:
            return JSONResponse(
                content={"success": False, "message": "Preview not found"},
                status_code=404,
            )

        last_file = selected_previews[-2]
        selected_previews.append(last_file)
        config: FrigateConfig = request.app.frigate_config

        ffmpeg_cmd = [
            config.ffmpeg.ffmpeg_path,
            "-hide_banner",
            "-loglevel",
            "warning",
            "-f",
            "concat",
            "-y",
            "-protocol_whitelist",
            "pipe,file",
            "-safe",
            "0",
            "-i",
            "/dev/stdin",
            "-loop",
            "0",
            "-c:v",
            "gif",
            "-f",
            "gif",
            "-",
        ]

        process = await asyncio.to_thread(
            sp.run,
            ffmpeg_cmd,
            input=str.encode("\n".join(selected_previews)),
            capture_output=True,
        )

        if process.returncode != 0:
            logger.error(process.stderr)
            return JSONResponse(
                content={"success": False, "message": "Unable to create preview gif"},
                status_code=500,
            )

        gif_bytes = process.stdout

    return Response(
        gif_bytes,
        media_type="image/gif",
        headers={
            "Cache-Control": f"private, max-age={_resolve_cache_age(max_cache_age)}",
            "Content-Type": "image/gif",
        },
    )


@router.get(
    "/{camera_name}/start/{start_ts}/end/{end_ts}/preview.mp4",
    dependencies=[Depends(require_camera_access)],
)
async def preview_mp4(
    request: Request,
    camera_name: str,
    start_ts: float,
    end_ts: float,
    max_cache_age: int = Query(
        604800, description="Max cache age in seconds. Default 7 days in seconds."
    ),
):
    file_name = sanitize_filename(f"preview_{camera_name}_{start_ts}-{end_ts}.mp4")

    if len(file_name) > 1000:
        return JSONResponse(
            content=(
                {
                    "success": False,
                    "message": "Filename exceeded max length of 1000 characters.",
                }
            ),
            status_code=403,
        )

    path = os.path.join(CACHE_DIR, file_name)

    if datetime.fromtimestamp(start_ts) < datetime.now().replace(minute=0, second=0):
        # has preview mp4
        try:
            preview: Previews = (
                Previews.select(
                    Previews.camera,
                    Previews.path,
                    Previews.duration,
                    Previews.start_time,
                    Previews.end_time,
                )
                .where(
                    Previews.start_time.between(start_ts, end_ts)
                    | Previews.end_time.between(start_ts, end_ts)
                    | ((start_ts > Previews.start_time) & (end_ts < Previews.end_time))
                )
                .where(Previews.camera == camera_name)
                .limit(1)
                .get()
            )
        except DoesNotExist:
            preview = None

        if not preview:
            return JSONResponse(
                content={"success": False, "message": "Preview not found"},
                status_code=404,
            )

        diff = start_ts - preview.start_time
        minutes = int(diff / 60)
        seconds = int(diff % 60)
        config: FrigateConfig = request.app.frigate_config
        ffmpeg_cmd = [
            config.ffmpeg.ffmpeg_path,
            "-hide_banner",
            "-loglevel",
            "warning",
            "-y",
            "-ss",
            f"00:{minutes}:{seconds}",
            "-t",
            f"{end_ts - start_ts}",
            "-i",
            preview.path,
            "-r",
            "8",
            "-vf",
            "setpts=0.12*PTS",
            "-c:v",
            "libx264",
            "-movflags",
            "+faststart",
            path,
        ]

        process = await asyncio.to_thread(
            sp.run,
            ffmpeg_cmd,
            capture_output=True,
        )

        if process.returncode != 0:
            logger.error(process.stderr)
            return JSONResponse(
                content={"success": False, "message": "Unable to create preview gif"},
                status_code=500,
            )

    else:
        # need to generate from existing images
        preview_dir = os.path.join(CACHE_DIR, "preview_frames")

        if not os.path.isdir(preview_dir):
            return JSONResponse(
                content={"success": False, "message": "Preview not found"},
                status_code=404,
            )

        file_start = f"preview_{camera_name}-"
        start_file = f"{file_start}{start_ts}.{PREVIEW_FRAME_TYPE}"
        end_file = f"{file_start}{end_ts}.{PREVIEW_FRAME_TYPE}"

        camera_files = [
            entry.name
            for entry in os.scandir(preview_dir)
            if entry.name.startswith(file_start)
        ]
        camera_files.sort()

        selected_previews = []

        for file in camera_files:
            if file < start_file:
                continue

            if file > end_file:
                break

            selected_previews.append(f"file '{os.path.join(preview_dir, file)}'")
            selected_previews.append("duration 0.12")

        if not selected_previews:
            return JSONResponse(
                content={"success": False, "message": "Preview not found"},
                status_code=404,
            )

        last_file = selected_previews[-2]
        selected_previews.append(last_file)
        config: FrigateConfig = request.app.frigate_config

        ffmpeg_cmd = [
            config.ffmpeg.ffmpeg_path,
            "-hide_banner",
            "-loglevel",
            "warning",
            "-f",
            "concat",
            "-y",
            "-protocol_whitelist",
            "pipe,file",
            "-safe",
            "0",
            "-i",
            "/dev/stdin",
            "-c:v",
            "libx264",
            "-movflags",
            "+faststart",
            path,
        ]

        process = await asyncio.to_thread(
            sp.run,
            ffmpeg_cmd,
            input=str.encode("\n".join(selected_previews)),
            capture_output=True,
        )

        if process.returncode != 0:
            logger.error(process.stderr)
            return JSONResponse(
                content={"success": False, "message": "Unable to create preview gif"},
                status_code=500,
            )

    headers = {
        "Content-Description": "File Transfer",
        "Cache-Control": f"private, max-age={_resolve_cache_age(max_cache_age)}",
        "Content-Type": "video/mp4",
        "Content-Length": str(os.path.getsize(path)),
        # nginx: https://nginx.org/en/docs/http/ngx_http_proxy_module.html#proxy_ignore_headers
        "X-Accel-Redirect": f"/cache/{file_name}",
    }

    return FileResponse(
        path,
        media_type="video/mp4",
        filename=file_name,
        headers=headers,
    )


@router.get("/review/{event_id}/preview")
async def review_preview(
    request: Request,
    event_id: str,
    format: str = Query(default="gif", enum=["gif", "mp4"]),
):
    try:
        review: ReviewSegment = ReviewSegment.get(ReviewSegment.id == event_id)
    except DoesNotExist:
        return JSONResponse(
            content=({"success": False, "message": "Review segment not found"}),
            status_code=404,
        )

    await require_camera_access(review.camera, request=request)

    padding = 8
    start_ts = review.start_time - padding
    end_ts = (
        review.end_time + padding if review.end_time else datetime.now().timestamp()
    )

    if format == "gif":
        return await preview_gif(request, review.camera, start_ts, end_ts)
    else:
        return await preview_mp4(request, review.camera, start_ts, end_ts)


@router.get(
    "/preview/{file_name}/thumbnail.jpg",
    dependencies=[Depends(allow_any_authenticated())],
)
@router.get(
    "/preview/{file_name}/thumbnail.webp",
    dependencies=[Depends(allow_any_authenticated())],
)
async def preview_thumbnail(request: Request, file_name: str):
    """Get a thumbnail from the cached preview frames."""
    if len(file_name) > 1000:
        return JSONResponse(
            content=(
                {"success": False, "message": "Filename exceeded max length of 1000"}
            ),
            status_code=403,
        )

    # Extract camera name from preview filename (format: preview_{camera}-{timestamp}.ext)
    if not file_name.startswith("preview_"):
        return JSONResponse(
            content={"success": False, "message": "Invalid preview filename"},
            status_code=400,
        )
    # Use rsplit to handle camera names containing dashes (e.g. front-door)
    name_part = file_name[len("preview_") :].rsplit(".", 1)[0]  # strip extension
    camera_name = name_part.rsplit("-", 1)[0]  # split off timestamp
    await require_camera_access(camera_name, request=request)

    safe_file_name_current = sanitize_filename(file_name)
    preview_dir = os.path.join(CACHE_DIR, "preview_frames")

    try:
        with open(
            os.path.join(preview_dir, safe_file_name_current), "rb"
        ) as image_file:
            jpg_bytes = image_file.read()
    except FileNotFoundError:
        return JSONResponse(
            content=({"success": False, "message": "Image file not found"}),
            status_code=404,
        )

    return Response(
        jpg_bytes,
        media_type="image/webp",
        headers={
            "Content-Type": "image/webp",
            "Cache-Control": "private, max-age=31536000",
        },
    )


####################### dynamic routes ###########################


@router.get(
    "/{camera_name}/{label}/best.jpg", dependencies=[Depends(require_camera_access)]
)
@router.get(
    "/{camera_name}/{label}/thumbnail.jpg",
    dependencies=[Depends(require_camera_access)],
)
async def label_thumbnail(request: Request, camera_name: str, label: str):
    label = unquote(label)
    event_query = Event.select(fn.MAX(Event.id)).where(Event.camera == camera_name)
    if label != "any":
        event_query = event_query.where(Event.label == label)

    try:
        event_id = event_query.scalar()

        return await event_thumbnail(request, event_id, Extension.jpg, 60)
    except DoesNotExist:
        frame = np.zeros((175, 175, 3), np.uint8)
        ret, jpg = cv2.imencode(".jpg", frame, [int(cv2.IMWRITE_JPEG_QUALITY), 70])

        return Response(
            jpg.tobytes(),
            media_type="image/jpeg",
            headers={"Cache-Control": "no-store"},
        )


@router.get(
    "/{camera_name}/{label}/clip.mp4", dependencies=[Depends(require_camera_access)]
)
async def label_clip(request: Request, camera_name: str, label: str):
    label = unquote(label)
    event_query = Event.select(fn.MAX(Event.id)).where(
        Event.camera == camera_name, Event.has_clip == True
    )
    if label != "any":
        event_query = event_query.where(Event.label == label)

    try:
        event = event_query.get()

        return await event_clip(request, event.id, 0)
    except DoesNotExist:
        return JSONResponse(
            content={"success": False, "message": "Event not found"}, status_code=404
        )


@router.get(
    "/{camera_name}/{label}/snapshot.jpg", dependencies=[Depends(require_camera_access)]
)
async def label_snapshot(request: Request, camera_name: str, label: str):
    """Returns the snapshot image from the latest event for the given camera and label combo"""
    label = unquote(label)
    if label == "any":
        event_query = (
            Event.select(Event.id)
            .where(Event.camera == camera_name)
            .where(Event.has_snapshot == True)
            .order_by(Event.start_time.desc())
        )
    else:
        event_query = (
            Event.select(Event.id)
            .where(Event.camera == camera_name)
            .where(Event.label == label)
            .where(Event.has_snapshot == True)
            .order_by(Event.start_time.desc())
        )

    try:
        event: Event = event_query.get()
        return await event_snapshot(request, event.id, MediaEventsSnapshotQueryParams())
    except DoesNotExist:
        frame = np.zeros((720, 1280, 3), np.uint8)
        _, jpg = cv2.imencode(".jpg", frame, [int(cv2.IMWRITE_JPEG_QUALITY), 70])

        return Response(
            jpg.tobytes(),
            media_type="image/jpeg",
        )
