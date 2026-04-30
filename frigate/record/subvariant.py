import asyncio
import logging
import os
from typing import Optional

from peewee import DoesNotExist

from frigate.config import FrigateConfig
from frigate.const import RECORD_DIR, FFMPEG_HWACCEL_NVIDIA
from frigate.models import Recordings
from frigate.util.services import get_video_properties, auto_detect_hwaccel

logger = logging.getLogger(__name__)

_subvariant_locks: dict[str, asyncio.Lock] = {}
SUB_VARIANT = "sub"


def _get_lock(key: str) -> asyncio.Lock:
    lock = _subvariant_locks.get(key)
    if lock is None:
        lock = asyncio.Lock()
        _subvariant_locks[key] = lock
    return lock


def _sub_path_for_main_path(main_path: str) -> str:
    # main: /media/frigate/recordings/YYYY-MM-DD/HH/camera/main/MM.SS.mp4
    # generated sub fallback: /media/frigate/recordings/YYYY-MM-DD/HH/camera/sub/MM.SS.mp4
    parts = main_path.split(os.sep)
    try:
        idx = parts.index("main")
    except ValueError:
        # Fallback: just mirror under /sub/ next to main file
        directory, filename = os.path.split(main_path)
        return os.path.join(directory + "_sub", filename)

    parts[idx] = SUB_VARIANT
    return os.sep.join(parts)


def _camera_name_for_recording(main_recording: Recordings) -> Optional[str]:
    if main_recording.camera:
        return main_recording.camera

    parts = main_recording.path.split(os.sep)
    try:
        idx = parts.index("main")
    except ValueError:
        return None

    if idx > 0:
        return parts[idx - 1]

    return None


def _codec_matches_family(codec_name: Optional[str], desired_family: str) -> bool:
    normalized = _normalize_codec_family(codec_name)
    return bool(normalized and normalized == desired_family)


def _normalize_codec_family(codec_name: Optional[str]) -> Optional[str]:
    if not codec_name:
        return None

    normalized = codec_name.lower().strip()
    if normalized in ("h264", "avc1"):
        return "h264"

    if normalized in ("h265", "hevc", "hev1", "hvc1"):
        return "hevc"

    return normalized


async def _existing_subvariant_matches(
    config: FrigateConfig, path: str, desired_family: str, codec_name: Optional[str]
) -> bool:
    if not os.path.exists(path):
        return False

    if _codec_matches_family(codec_name, desired_family):
        actual_codec = codec_name
    else:
        media_info = await get_video_properties(config.ffmpeg, path)
        actual_codec = media_info.get("codec_name")

    return _codec_matches_family(actual_codec, desired_family)


def _select_hw_profile(config: FrigateConfig, desired_codec_family: str) -> list[str]:
    """Return ffmpeg args that generate a standard `sub` fallback recording."""
    # Target bitrate: ~35% of original when known, otherwise a safe default.
    target_bitrate = "350k"

    # Try to detect decode hwaccel that implies GPU type.
    detected = auto_detect_hwaccel()

    if desired_codec_family == "hevc":
        if detected == FFMPEG_HWACCEL_NVIDIA:
            return [
                "-c:v",
                "hevc_nvenc",
                "-b:v",
                target_bitrate,
                "-maxrate",
                target_bitrate,
                "-bufsize",
                "700k",
            ]

        return [
            "-c:v",
            "libx265",
            "-preset",
            "ultrafast",
            "-x265-params",
            "log-level=error",
            "-b:v",
            target_bitrate,
            "-maxrate",
            target_bitrate,
            "-bufsize",
            "700k",
        ]

    if detected == FFMPEG_HWACCEL_NVIDIA:
        return [
            "-c:v",
            "h264_nvenc",
            "-b:v",
            target_bitrate,
            "-maxrate",
            target_bitrate,
            "-bufsize",
            "700k",
        ]

    return [
        "-c:v",
        "libx264",
        "-preset:v",
        "ultrafast",
        "-tune:v",
        "zerolatency",
        "-b:v",
        target_bitrate,
        "-maxrate",
        target_bitrate,
        "-bufsize",
        "700k",
    ]


async def ensure_subvariant_for_recording(
    config: FrigateConfig,
    main_recording: Recordings,
    target_codec_family: Optional[str] = None,
) -> Optional[Recordings]:
    """Ensure a standard `sub` file and Recordings row exist for a main recording.

    Returns the `sub` Recordings row or None on failure.
    """
    if main_recording.variant == SUB_VARIANT and os.path.exists(main_recording.path):
        return main_recording

    camera_name = _camera_name_for_recording(main_recording)
    if not camera_name:
        logger.error("Unable to determine camera for recording %s", main_recording.path)
        return None

    desired_codec_family = (
        target_codec_family
        or _normalize_codec_family(main_recording.codec_name)
        or "h264"
    )

    sub_path = _sub_path_for_main_path(main_recording.path)

    # If a DB row already exists and the file is present, return it immediately.
    try:
        existing = Recordings.get(
            (Recordings.camera == camera_name)
            & (Recordings.variant == SUB_VARIANT)
            & (Recordings.start_time == main_recording.start_time)
        )
        if await _existing_subvariant_matches(
            config, existing.path, desired_codec_family, existing.codec_name
        ):
            return existing
    except DoesNotExist:
        existing = None

    lock_key = f"{camera_name}:{main_recording.start_time}:sub"
    lock = _get_lock(lock_key)
    async with lock:
        # Double-check inside the lock.
        try:
            existing = Recordings.get(
                (Recordings.camera == camera_name)
                & (Recordings.variant == SUB_VARIANT)
                & (Recordings.start_time == main_recording.start_time)
            )
            if await _existing_subvariant_matches(
                config, existing.path, desired_codec_family, existing.codec_name
            ):
                return existing
        except DoesNotExist:
            existing = None

        if existing and existing.path:
            sub_path = existing.path

        # Ensure directory exists.
        sub_dir = os.path.dirname(sub_path)
        os.makedirs(sub_dir, exist_ok=True)

        # Decide encoder profile.
        extra_args = _select_hw_profile(config, desired_codec_family)

        ffmpeg_bin = config.ffmpeg.ffmpeg_path

        cmd = [
            ffmpeg_bin,
            "-hide_banner",
            "-y",
            "-i",
            main_recording.path,
            "-vf",
            "scale='min(640,iw)':'min(360,ih)':force_original_aspect_ratio=decrease",
        ] + extra_args + [
            "-an",
            sub_path,
        ]

        logger.info(
            "Generating sub fallback for %s at %s -> %s",
            camera_name,
            main_recording.path,
            sub_path,
        )

        proc = await asyncio.create_subprocess_exec(
            *cmd,
            stdout=asyncio.subprocess.DEVNULL,
            stderr=asyncio.subprocess.PIPE,
        )
        _, stderr = await proc.communicate()

        if proc.returncode != 0:
            logger.error(
                "Sub fallback generation failed for %s: %s",
                main_recording.path,
                stderr.decode(errors="ignore"),
            )
            return None

        # Probe the new file for metadata and size.
        media_info = await get_video_properties(config.ffmpeg, sub_path, get_duration=True)
        try:
            segment_size_mb = round(
                float(os.path.getsize(sub_path)) / (1024 * 1024), 2
            )
        except OSError:
            segment_size_mb = 0.0

        record_id = (
            existing.id
            if existing is not None
            else f"{camera_name}-{main_recording.start_time}-{SUB_VARIANT}"
        )

        # Upsert a Recordings row for the standard sub fallback.
        data = {
            Recordings.id.name: record_id,
            Recordings.camera.name: camera_name,
            Recordings.path.name: sub_path,
            Recordings.variant.name: SUB_VARIANT,
            Recordings.transcoded_from_main.name: True,
            Recordings.start_time.name: main_recording.start_time,
            Recordings.end_time.name: main_recording.end_time,
            Recordings.duration.name: main_recording.duration,
            Recordings.motion.name: main_recording.motion,
            Recordings.objects.name: main_recording.objects,
            Recordings.regions.name: main_recording.regions,
            Recordings.dBFS.name: main_recording.dBFS,
            Recordings.segment_size.name: segment_size_mb,
            Recordings.codec_name.name: media_info.get("codec_name"),
            Recordings.width.name: media_info.get("width"),
            Recordings.height.name: media_info.get("height"),
            Recordings.bitrate.name: (
                int((segment_size_mb * (1024 ** 2) * 8) / main_recording.duration)
                if main_recording.duration and segment_size_mb > 0
                else None
            ),
            Recordings.motion_heatmap.name: main_recording.motion_heatmap,
        }

        Recordings.insert(data).on_conflict_replace().execute()

        return Recordings.get(Recordings.id == data[Recordings.id.name])

