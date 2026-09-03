"""Utilities for stats."""

import logging
import re
import shutil
import time
from json import JSONDecodeError
from multiprocessing.managers import DictProxy
from typing import Any

import requests
from requests.exceptions import RequestException

from frigate.config import FrigateConfig
from frigate.const import CACHE_DIR, CLIPS_DIR, RECORD_DIR
from frigate.data_processing.types import DataProcessorMetrics
from frigate.object_detection.base import ObjectDetectProcess
from frigate.stats.hardware import HardwareStats, get_hardware_temperatures
from frigate.types import StatsTrackingTypes
from frigate.util.services import (
    calculate_shm_requirements,
    get_bandwidth_stats,
    get_fs_type,
)
from frigate.version import VERSION

logger = logging.getLogger(__name__)


def get_latest_version(config: FrigateConfig) -> str:
    if not config.telemetry.version_check:
        return "disabled"

    try:
        request = requests.get(
            "https://api.github.com/repos/blakeblackshear/frigate/releases/latest",
            timeout=10,
        )
        response = request.json()
    except (RequestException, JSONDecodeError):
        return "unknown"

    if request.ok and response and "tag_name" in response:
        return str(response.get("tag_name").replace("v", ""))
    else:
        return "unknown"


def _version_tuple(value: str) -> tuple[int, int, int] | None:
    match = re.match(r"^(\d+)\.(\d+)\.(\d+)", value or "")

    if match is None:
        return None

    return int(match.group(1)), int(match.group(2)), int(match.group(3))


def is_newer_version(current: str, latest: str) -> bool:
    """Whether latest is a release newer than the running version.

    Build suffixes and prerelease tags after the third number are ignored, and
    a value that does not parse (disabled, unknown) is never newer.
    """
    current_tuple = _version_tuple(current)
    latest_tuple = _version_tuple(latest)

    if current_tuple is None or latest_tuple is None:
        return False

    return latest_tuple > current_tuple


def stats_init(
    config: FrigateConfig,
    camera_metrics: DictProxy,
    embeddings_metrics: DataProcessorMetrics,
    detectors: dict[str, ObjectDetectProcess],
    processes: dict[str, int],
) -> StatsTrackingTypes:
    stats_tracking: StatsTrackingTypes = {
        "camera_metrics": camera_metrics,
        "embeddings_metrics": embeddings_metrics,
        "detectors": detectors,
        "started": int(time.time()),
        "latest_frigate_version": get_latest_version(config),
        "last_updated": int(time.time()),
        "processes": processes,
    }
    return stats_tracking


def get_detector_stats(
    stats_tracking: StatsTrackingTypes,
) -> dict[str, dict[str, Any]]:
    """Get stats for all detectors, including temperatures based on detector type."""
    detector_stats: dict[str, dict[str, Any]] = {}
    detector_type_indices: dict[str, int] = {}

    for name, detector in stats_tracking["detectors"].items():
        pid = detector.detect_process.pid if detector.detect_process else None
        detector_type = detector.detector_config.type

        # Keep track of the index for each detector type to match temperatures correctly
        current_index = detector_type_indices.get(detector_type, 0)
        detector_type_indices[detector_type] = current_index + 1

        detector_stat = {
            "inference_speed": round(detector.avg_inference_speed.value * 1000, 2),  # type: ignore[attr-defined]
            # issue https://github.com/python/typeshed/issues/8799
            # from mypy 0.981 onwards
            "detection_start": detector.detection_start.value,  # type: ignore[attr-defined]
            # issue https://github.com/python/typeshed/issues/8799
            # from mypy 0.981 onwards
            "pid": pid,
        }

        temps = get_hardware_temperatures(detector_type)

        if current_index < len(temps) and temps[current_index] is not None:
            detector_stat["temperature"] = round(temps[current_index], 1)

        detector_stats[name] = detector_stat

    return detector_stats


def stats_snapshot(
    config: FrigateConfig,
    stats_tracking: StatsTrackingTypes,
    hardware_stats: HardwareStats,
) -> dict[str, Any]:
    """Get a snapshot of the current stats that are being tracked."""
    camera_metrics = stats_tracking["camera_metrics"]
    stats: dict[str, Any] = {}

    total_camera_fps = total_process_fps = total_skipped_fps = total_detection_fps = 0

    stats["cameras"] = {}
    for name, camera_stats in camera_metrics.items():
        if name not in config.cameras:
            continue

        total_camera_fps += camera_stats.camera_fps.value
        total_process_fps += camera_stats.process_fps.value
        total_skipped_fps += camera_stats.skipped_fps.value
        total_detection_fps += camera_stats.detection_fps.value
        pid = camera_stats.process_pid.value if camera_stats.process_pid.value else None
        ffmpeg_pid = camera_stats.ffmpeg_pid.value if camera_stats.ffmpeg_pid else None
        capture_pid = (
            camera_stats.capture_process_pid.value
            if camera_stats.capture_process_pid.value
            else None
        )
        # Calculate connection quality based on current state
        # This is computed at stats-collection time so offline cameras
        # correctly show as unusable rather than excellent
        expected_fps = config.cameras[name].detect.fps
        current_fps = camera_stats.camera_fps.value
        reconnects = camera_stats.reconnects_last_hour.value
        stalls = camera_stats.stalls_last_hour.value

        if current_fps < 0.1:
            quality_str = "unusable"
        elif reconnects == 0 and current_fps >= 0.9 * expected_fps and stalls < 5:
            quality_str = "excellent"
        elif reconnects <= 2 and current_fps >= 0.6 * expected_fps:
            quality_str = "fair"
        elif reconnects > 10 or current_fps < 1.0 or stalls > 100:
            quality_str = "unusable"
        else:
            quality_str = "poor"

        connection_quality = {
            "connection_quality": quality_str,
            "expected_fps": expected_fps,
            "reconnects_last_hour": reconnects,
            "stalls_last_hour": stalls,
        }

        stats["cameras"][name] = {
            "camera_fps": round(camera_stats.camera_fps.value, 2),
            "process_fps": round(camera_stats.process_fps.value, 2),
            "skipped_fps": round(camera_stats.skipped_fps.value, 2),
            "detection_fps": round(camera_stats.detection_fps.value, 2),
            "detection_enabled": config.cameras[name].detect.enabled,
            "pid": pid,
            "capture_pid": capture_pid,
            "ffmpeg_pid": ffmpeg_pid,
            "audio_rms": round(camera_stats.audio_rms.value, 4),
            "audio_dBFS": round(camera_stats.audio_dBFS.value, 4),
            **connection_quality,
        }

    stats["detectors"] = get_detector_stats(stats_tracking)
    stats["camera_fps"] = round(total_camera_fps, 2)
    stats["process_fps"] = round(total_process_fps, 2)
    stats["skipped_fps"] = round(total_skipped_fps, 2)
    stats["detection_fps"] = round(total_detection_fps, 2)

    stats["embeddings"] = {}

    # Get metrics if available
    embeddings_metrics = stats_tracking.get("embeddings_metrics")

    if embeddings_metrics:
        # Add metrics based on what's enabled
        if config.semantic_search.enabled:
            stats["embeddings"].update(
                {
                    "image_embedding_speed": round(
                        embeddings_metrics.image_embeddings_speed.value * 1000, 2
                    ),
                    "image_embedding": round(
                        embeddings_metrics.image_embeddings_eps.value, 2
                    ),
                    "text_embedding_speed": round(
                        embeddings_metrics.text_embeddings_speed.value * 1000, 2
                    ),
                    "text_embedding": round(
                        embeddings_metrics.text_embeddings_eps.value, 2
                    ),
                }
            )

        if config.face_recognition.enabled:
            stats["embeddings"]["face_recognition_speed"] = round(
                embeddings_metrics.face_rec_speed.value * 1000, 2
            )
            stats["embeddings"]["face_recognition"] = round(
                embeddings_metrics.face_rec_fps.value, 2
            )

        if config.lpr.enabled:
            stats["embeddings"]["plate_recognition_speed"] = round(
                embeddings_metrics.alpr_speed.value * 1000, 2
            )
            stats["embeddings"]["plate_recognition"] = round(
                embeddings_metrics.alpr_pps.value, 2
            )

            if embeddings_metrics.yolov9_lpr_pps.value > 0.0:
                stats["embeddings"]["yolov9_plate_detection_speed"] = round(
                    embeddings_metrics.yolov9_lpr_speed.value * 1000, 2
                )
                stats["embeddings"]["yolov9_plate_detection"] = round(
                    embeddings_metrics.yolov9_lpr_pps.value, 2
                )

        if embeddings_metrics.review_desc_speed.value > 0.0:
            stats["embeddings"]["review_description_speed"] = round(
                embeddings_metrics.review_desc_speed.value * 1000, 2
            )
            stats["embeddings"]["review_description_events_per_second"] = round(
                embeddings_metrics.review_desc_dps.value, 2
            )

        if embeddings_metrics.object_desc_speed.value > 0.0:
            stats["embeddings"]["object_description_speed"] = round(
                embeddings_metrics.object_desc_speed.value * 1000, 2
            )
            stats["embeddings"]["object_description_events_per_second"] = round(
                embeddings_metrics.object_desc_dps.value, 2
            )

        for key in embeddings_metrics.classification_speeds.keys():
            stats["embeddings"][f"{key}_classification_speed"] = round(
                embeddings_metrics.classification_speeds[key].value * 1000, 2
            )
            stats["embeddings"][f"{key}_classification_events_per_second"] = round(
                embeddings_metrics.classification_cps[key].value, 2
            )

    hardware_stats.update_stats(stats)

    if config.telemetry.stats.network_bandwidth:
        bandwidth_stats = get_bandwidth_stats(config)

        if bandwidth_stats:
            stats["bandwidth_usages"] = bandwidth_stats

    stats["service"] = {
        "uptime": (int(time.time()) - stats_tracking["started"]),
        "version": VERSION,
        "latest_version": stats_tracking["latest_frigate_version"],
        "storage": {},
        "last_updated": int(time.time()),
    }

    for path in [RECORD_DIR, CLIPS_DIR, CACHE_DIR]:
        try:
            storage_stats = shutil.disk_usage(path)
        except (FileNotFoundError, OSError):
            stats["service"]["storage"][path] = {}
            continue

        stats["service"]["storage"][path] = {
            "total": round(storage_stats.total / pow(2, 20), 1),
            "used": round(storage_stats.used / pow(2, 20), 1),
            "free": round(storage_stats.free / pow(2, 20), 1),
            "mount_type": get_fs_type(path),
        }

    stats["service"]["storage"]["/dev/shm"] = calculate_shm_requirements(config)

    stats["processes"] = {}
    for name, pid in stats_tracking["processes"].items():
        stats["processes"][name] = {
            "pid": pid,
        }

    # Embed cpu/mem stats into detectors, cameras, and processes
    # so history consumers don't need the full cpu_usages dict
    cpu_usages = stats.get("cpu_usages", {})

    for det_stats in stats["detectors"].values():
        pid_str = str(det_stats.get("pid", ""))
        usage = cpu_usages.get(pid_str, {})
        det_stats["cpu"] = usage.get("cpu")
        det_stats["mem"] = usage.get("mem")

    for cam_stats in stats["cameras"].values():
        for pid_key, field in [
            ("ffmpeg_pid", "ffmpeg_cpu"),
            ("capture_pid", "capture_cpu"),
            ("pid", "detect_cpu"),
        ]:
            pid_str = str(cam_stats.get(pid_key, ""))
            usage = cpu_usages.get(pid_str, {})
            cam_stats[field] = usage.get("cpu")

    for proc_stats in stats["processes"].values():
        pid_str = str(proc_stats.get("pid", ""))
        usage = cpu_usages.get(pid_str, {})
        proc_stats["cpu"] = usage.get("cpu")
        proc_stats["mem"] = usage.get("mem")

    return stats
