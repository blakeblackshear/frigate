"""Image and video apis."""

import asyncio
import glob
import logging
import math
import os
import subprocess as sp
import time
from datetime import datetime, timedelta, timezone
from pathlib import Path as FilePath
from typing import Any
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
from frigate.const import (
    CACHE_DIR,
    CLIPS_DIR,
    INSTALL_DIR,
    MAX_SEGMENT_DURATION,
    PREVIEW_FRAME_TYPE,
)
from frigate.models import Event, Previews, Recordings, Regions, ReviewSegment
from frigate.output.preview import get_most_recent_preview_frame
from frigate.track.object_processing import TrackedObjectProcessor
from frigate.util.file import get_event_thumbnail_bytes
from frigate.util.image import get_image_from_recording

logger = logging.getLogger(__name__)

router = APIRouter(tags=[Tags.media])


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
    quality = params.quality

    if extension == Extension.png:
        quality_params = None
    elif extension == Extension.webp:
        quality_params = [int(cv2.IMWRITE_WEBP_QUALITY), quality]
    else:  # jpg or jpeg
        quality_params = [int(cv2.IMWRITE_JPEG_QUALITY), quality]

    if camera_name in request.app.frigate_config.cameras:
        frame = frame_processor.get_current_frame(camera_name, draw_options)
        retry_interval = float(
            request.app.frigate_config.cameras.get(camera_name).ffmpeg.retry_interval
            or 10
        )

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
                (
                    (frame_time >= Recordings.start_time)
                    & (frame_time <= Recordings.end_time)
                )
            )
            .where(Recordings.camera == camera_name)
            .order_by(Recordings.start_time.desc())
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
                    (
                        (frame_time >= Recordings.start_time)
                        & (frame_time <= Recordings.end_time)
                    )
                )
                .where(Recordings.camera == camera_name)
                .order_by(Recordings.start_time.desc())
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
            (
                (frame_time >= Recordings.start_time)
                & (frame_time <= Recordings.end_time)
            )
        )
        .where(Recordings.camera == camera_name)
        .order_by(Recordings.start_time.desc())
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
        request.app.frigate_config.plus_api.upload_image(nd, camera_name)

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
    def run_download(ffmpeg_cmd: list[str], file_path: str):
        with sp.Popen(
            ffmpeg_cmd,
            stderr=sp.PIPE,
            stdout=sp.PIPE,
            text=False,
        ) as ffmpeg:
            while True:
                data = ffmpeg.stdout.read(8192)
                if data is not None and len(data) > 0:
                    yield data
                else:
                    if ffmpeg.returncode and ffmpeg.returncode != 0:
                        logger.error(
                            f"Failed to generate clip, ffmpeg logs: {ffmpeg.stderr.read()}"
                        )
                    else:
                        FilePath(file_path).unlink(missing_ok=True)
                    break

    recordings = (
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
        .order_by(Recordings.start_time.asc())
    )

    if recordings.count() == 0:
        return JSONResponse(
            content={
                "success": False,
                "message": "No recordings found for the specified time range",
            },
            status_code=400,
        )

    file_name = sanitize_filename(f"playlist_{camera_name}_{start_ts}-{end_ts}.txt")
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
        run_download(ffmpeg_cmd, file_path),
        media_type="video/mp4",
    )


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
    logger.debug(
        "VOD: Generating VOD for %s from %s to %s with force_discontinuity=%s",
        camera_name,
        start_ts,
        end_ts,
        force_discontinuity,
    )
    recordings = (
        Recordings.select(
            Recordings.path,
            Recordings.duration,
            Recordings.end_time,
            Recordings.start_time,
        )
        .where(
            Recordings.start_time.between(start_ts, end_ts)
            | Recordings.end_time.between(start_ts, end_ts)
            | ((start_ts > Recordings.start_time) & (end_ts < Recordings.end_time))
        )
        .where(Recordings.camera == camera_name)
        .order_by(Recordings.start_time.asc())
        .iterator()
    )

    clips = []
    durations = []
    min_duration_ms = 100  # Minimum 100ms to ensure at least one video frame
    max_duration_ms = MAX_SEGMENT_DURATION * 1000

    recording: Recordings
    for recording in recordings:
        logger.debug(
            "VOD: processing recording: %s start=%s end=%s duration=%s",
            recording.path,
            recording.start_time,
            recording.end_time,
            recording.duration,
        )

        clip = {"type": "source", "path": recording.path}
        duration = int(recording.duration * 1000)

        # adjust start offset if start_ts is after recording.start_time
        if start_ts > recording.start_time:
            inpoint = int((start_ts - recording.start_time) * 1000)
            clip["clipFrom"] = inpoint
            duration -= inpoint
            logger.debug(
                "VOD: applied clipFrom %sms to %s",
                inpoint,
                recording.path,
            )

        # adjust end if recording.end_time is after end_ts
        if recording.end_time > end_ts:
            duration -= int((recording.end_time - end_ts) * 1000)

        if duration < min_duration_ms:
            # skip if the clip has no valid duration (too short to contain frames)
            logger.debug(
                "VOD: skipping recording %s - resulting duration %sms too short",
                recording.path,
                duration,
            )
            continue

        if min_duration_ms <= duration < max_duration_ms:
            clip["keyFrameDurations"] = [duration]
            clips.append(clip)
            durations.append(duration)
            logger.debug(
                "VOD: added clip %s duration_ms=%s clipFrom=%s",
                recording.path,
                duration,
                clip.get("clipFrom"),
            )
        else:
            logger.warning(f"Recording clip is missing or empty: {recording.path}")

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

    hour_ago = datetime.now() - timedelta(hours=1)
    return JSONResponse(
        content={
            "cache": hour_ago.timestamp() > start_ts,
            "discontinuity": force_discontinuity,
            "consistentSequenceMediaInfo": True,
            "durations": durations,
            "segment_duration": max(durations),
            "sequences": [{"clips": clips}],
        }
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
        datetime(int(parts[0]), int(parts[1]), day, hour, tzinfo=timezone.utc)
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
    return await vod_ts(camera_name, start_ts, end_ts, force_discontinuity=True)


@router.get(
    "/events/{event_id}/snapshot.jpg",
    description="Returns a snapshot image for the specified object id. NOTE: The query params only take affect while the event is in-progress. Once the event has ended the snapshot configuration is used.",
)
async def event_snapshot(
    request: Request,
    event_id: str,
    params: MediaEventsSnapshotQueryParams = Depends(),
):
    event_complete = False
    jpg_bytes = None
    try:
        event = Event.get(Event.id == event_id, Event.end_time != None)
        event_complete = True
        await require_camera_access(event.camera, request=request)
        if not event.has_snapshot:
            return JSONResponse(
                content={"success": False, "message": "Snapshot not available"},
                status_code=404,
            )
        # read snapshot from disk
        with open(
            os.path.join(CLIPS_DIR, f"{event.camera}-{event.id}.jpg"), "rb"
        ) as image_file:
            jpg_bytes = image_file.read()
    except DoesNotExist:
        # see if the object is currently being tracked
        try:
            camera_states: list[CameraState] = (
                request.app.detected_frames_processor.camera_states.values()
            )
            for camera_state in camera_states:
                if event_id in camera_state.tracked_objects:
                    tracked_obj = camera_state.tracked_objects.get(event_id)
                    if tracked_obj is not None:
                        jpg_bytes, frame_time = tracked_obj.get_img_bytes(
                            ext="jpg",
                            timestamp=params.timestamp,
                            bounding_box=params.bbox,
                            crop=params.crop,
                            height=params.height,
                            quality=params.quality,
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
        "X-Frame-Time": frame_time,
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
    dependencies=[Depends(require_camera_access)],
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

    if thumbnail_bytes is None:
        # see if the object is currently being tracked
        try:
            camera_states = request.app.detected_frames_processor.camera_states.values()
            for camera_state in camera_states:
                if event_id in camera_state.tracked_objects:
                    tracked_obj = camera_state.tracked_objects.get(event_id)
                    if tracked_obj is not None:
                        thumbnail_bytes = tracked_obj.get_thumbnail(extension.value)
        except Exception:
            return JSONResponse(
                content={"success": False, "message": "Event not found"},
                status_code=404,
            )

    if thumbnail_bytes is None:
        return JSONResponse(
            content={"success": False, "message": "Event not found"},
            status_code=404,
        )

    # android notifications prefer a 2:1 ratio
    if format == "android":
        img_as_np = np.frombuffer(thumbnail_bytes, dtype=np.uint8)
        img = cv2.imdecode(img_as_np, flags=1)
        thumbnail = cv2.copyMakeBorder(
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

        _, img = cv2.imencode(f".{extension.value}", thumbnail, quality_params)
        thumbnail_bytes = img.tobytes()

    return Response(
        thumbnail_bytes,
        media_type=extension.get_mime_type(),
        headers={
            "Cache-Control": f"private, max-age={max_cache_age}"
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


@router.get(
    "/events/{event_id}/snapshot-clean.webp",
    dependencies=[Depends(require_camera_access)],
)
def event_snapshot_clean(request: Request, event_id: str, download: bool = False):
    webp_bytes = None
    try:
        event = Event.get(Event.id == event_id)
        snapshot_config = request.app.frigate_config.cameras[event.camera].snapshots
        if not (snapshot_config.enabled and event.has_snapshot):
            return JSONResponse(
                content={
                    "success": False,
                    "message": "Snapshots and clean_copy must be enabled in the config",
                },
                status_code=404,
            )
        if event.end_time is None:
            # see if the object is currently being tracked
            try:
                camera_states = (
                    request.app.detected_frames_processor.camera_states.values()
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
            # webp
            clean_snapshot_path_webp = os.path.join(
                CLIPS_DIR, f"{event.camera}-{event.id}-clean.webp"
            )
            # png (legacy)
            clean_snapshot_path_png = os.path.join(
                CLIPS_DIR, f"{event.camera}-{event.id}-clean.png"
            )

            if os.path.exists(clean_snapshot_path_webp):
                with open(clean_snapshot_path_webp, "rb") as image_file:
                    webp_bytes = image_file.read()
            elif os.path.exists(clean_snapshot_path_png):
                # convert png to webp and save for future use
                png_image = cv2.imread(clean_snapshot_path_png, cv2.IMREAD_UNCHANGED)
                if png_image is None:
                    return JSONResponse(
                        content={
                            "success": False,
                            "message": "Invalid png snapshot",
                        },
                        status_code=400,
                    )

                ret, webp_data = cv2.imencode(
                    ".webp", png_image, [int(cv2.IMWRITE_WEBP_QUALITY), 60]
                )
                if not ret:
                    return JSONResponse(
                        content={
                            "success": False,
                            "message": "Unable to convert png to webp",
                        },
                        status_code=400,
                    )

                webp_bytes = webp_data.tobytes()

                # save the converted webp for future requests
                try:
                    with open(clean_snapshot_path_webp, "wb") as f:
                        f.write(webp_bytes)
                except Exception as e:
                    logger.warning(
                        f"Failed to save converted webp for event {event.id}: {e}"
                    )
                    # continue since we now have the data to return
            else:
                return JSONResponse(
                    content={
                        "success": False,
                        "message": "Clean snapshot not available",
                    },
                    status_code=404,
                )
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
        "Cache-Control": "private, max-age=31536000",
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
    "/events/{event_id}/clip.mp4", dependencies=[Depends(require_camera_access)]
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
    "/events/{event_id}/preview.gif", dependencies=[Depends(require_camera_access)]
)
def event_preview(request: Request, event_id: str):
    try:
        event: Event = Event.get(Event.id == event_id)
    except DoesNotExist:
        return JSONResponse(
            content={"success": False, "message": "Event not found"}, status_code=404
        )

    start_ts = event.start_time
    end_ts = start_ts + (
        min(event.end_time - event.start_time, 20) if event.end_time else 20
    )
    return preview_gif(request, event.camera, start_ts, end_ts)


@router.get(
    "/{camera_name}/start/{start_ts}/end/{end_ts}/preview.gif",
    dependencies=[Depends(require_camera_access)],
)
def preview_gif(
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

        process = sp.run(
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
        file_start = f"preview_{camera_name}"
        start_file = f"{file_start}-{start_ts}.{PREVIEW_FRAME_TYPE}"
        end_file = f"{file_start}-{end_ts}.{PREVIEW_FRAME_TYPE}"
        selected_previews = []

        for file in sorted(os.listdir(preview_dir)):
            if not file.startswith(file_start):
                continue

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

        process = sp.run(
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
            "Cache-Control": f"private, max-age={max_cache_age}",
            "Content-Type": "image/gif",
        },
    )


@router.get(
    "/{camera_name}/start/{start_ts}/end/{end_ts}/preview.mp4",
    dependencies=[Depends(require_camera_access)],
)
def preview_mp4(
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

        process = sp.run(
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
        file_start = f"preview_{camera_name}"
        start_file = f"{file_start}-{start_ts}.{PREVIEW_FRAME_TYPE}"
        end_file = f"{file_start}-{end_ts}.{PREVIEW_FRAME_TYPE}"
        selected_previews = []

        for file in sorted(os.listdir(preview_dir)):
            if not file.startswith(file_start):
                continue

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

        process = sp.run(
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
        "Cache-Control": f"private, max-age={max_cache_age}",
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


@router.get("/review/{event_id}/preview", dependencies=[Depends(require_camera_access)])
def review_preview(
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

    padding = 8
    start_ts = review.start_time - padding
    end_ts = (
        review.end_time + padding if review.end_time else datetime.now().timestamp()
    )

    if format == "gif":
        return preview_gif(request, review.camera, start_ts, end_ts)
    else:
        return preview_mp4(request, review.camera, start_ts, end_ts)


@router.get(
    "/preview/{file_name}/thumbnail.jpg", dependencies=[Depends(require_camera_access)]
)
@router.get(
    "/preview/{file_name}/thumbnail.webp", dependencies=[Depends(require_camera_access)]
)
def preview_thumbnail(file_name: str):
    """Get a thumbnail from the cached preview frames."""
    if len(file_name) > 1000:
        return JSONResponse(
            content=(
                {"success": False, "message": "Filename exceeded max length of 1000"}
            ),
            status_code=403,
        )

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
