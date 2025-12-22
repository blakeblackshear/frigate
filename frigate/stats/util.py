"""Utilities for stats."""

import asyncio
import os
import shutil
import time
from json import JSONDecodeError
from multiprocessing.managers import DictProxy
from typing import Any, Optional

import requests
from requests.exceptions import RequestException

from frigate.config import FrigateConfig
from frigate.const import CACHE_DIR, CLIPS_DIR, RECORD_DIR
from frigate.data_processing.types import DataProcessorMetrics
from frigate.object_detection.base import ObjectDetectProcess
from frigate.types import StatsTrackingTypes
from frigate.util.services import (
    calculate_shm_requirements,
    get_amd_gpu_stats,
    get_bandwidth_stats,
    get_cpu_stats,
    get_fs_type,
    get_hailo_temps,
    get_intel_gpu_stats,
    get_jetson_stats,
    get_nvidia_gpu_stats,
    get_openvino_npu_stats,
    get_rockchip_gpu_stats,
    get_rockchip_npu_stats,
    is_vaapi_amd_driver,
)
from frigate.version import VERSION


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


def stats_init(
    config: FrigateConfig,
    camera_metrics: DictProxy,
    embeddings_metrics: DataProcessorMetrics | None,
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


def read_temperature(path: str) -> Optional[float]:
    if os.path.isfile(path):
        with open(path) as f:
            line = f.readline().strip()
            return int(line) / 1000
    return None


def get_temperatures() -> dict[str, float]:
    temps = {}

    # Get temperatures for all attached Corals
    base = "/sys/class/apex/"
    if os.path.isdir(base):
        for apex in os.listdir(base):
            temp = read_temperature(os.path.join(base, apex, "temp"))
            if temp is not None:
                temps[apex] = temp

    # Get temperatures for Hailo devices
    temps.update(get_hailo_temps())

    return temps


def get_detector_temperature(
    detector_type: str,
    detector_index_by_type: dict[str, int],
) -> Optional[float]:
    """Get temperature for a specific detector based on its type."""
    if detector_type == "edgetpu":
        # Get temperatures for all attached Corals
        base = "/sys/class/apex/"
        if os.path.isdir(base):
            apex_devices = sorted(os.listdir(base))
            index = detector_index_by_type.get("edgetpu", 0)
            if index < len(apex_devices):
                apex_name = apex_devices[index]
                temp = read_temperature(os.path.join(base, apex_name, "temp"))
                if temp is not None:
                    return temp
    elif detector_type == "hailo8l":
        # Get temperatures for Hailo devices
        hailo_temps = get_hailo_temps()
        if hailo_temps:
            hailo_device_names = sorted(hailo_temps.keys())
            index = detector_index_by_type.get("hailo8l", 0)
            if index < len(hailo_device_names):
                device_name = hailo_device_names[index]
                return hailo_temps[device_name]

    return None


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

        temp = get_detector_temperature(detector_type, {detector_type: current_index})

        if temp is not None:
            detector_stat["temperature"] = round(temp, 1)

        detector_stats[name] = detector_stat

    return detector_stats


def get_processing_stats(
    config: FrigateConfig, stats: dict[str, str], hwaccel_errors: list[str]
) -> None:
    """Get stats for cpu / gpu."""

    async def run_tasks() -> None:
        stats_tasks = [
            asyncio.create_task(set_gpu_stats(config, stats, hwaccel_errors)),
            asyncio.create_task(set_cpu_stats(stats)),
            asyncio.create_task(set_npu_usages(config, stats)),
        ]

        if config.telemetry.stats.network_bandwidth:
            stats_tasks.append(asyncio.create_task(set_bandwidth_stats(config, stats)))

        await asyncio.wait(stats_tasks)

    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)
    loop.run_until_complete(run_tasks())
    loop.close()


async def set_cpu_stats(all_stats: dict[str, Any]) -> None:
    """Set cpu usage from top."""
    cpu_stats = get_cpu_stats()

    if cpu_stats:
        all_stats["cpu_usages"] = cpu_stats


async def set_bandwidth_stats(config: FrigateConfig, all_stats: dict[str, Any]) -> None:
    """Set bandwidth from nethogs."""
    bandwidth_stats = get_bandwidth_stats(config)

    if bandwidth_stats:
        all_stats["bandwidth_usages"] = bandwidth_stats


async def set_gpu_stats(
    config: FrigateConfig, all_stats: dict[str, Any], hwaccel_errors: list[str]
) -> None:
    """Parse GPUs from hwaccel args and use for stats."""
    hwaccel_args = []

    for camera in config.cameras.values():
        args = camera.ffmpeg.hwaccel_args

        if isinstance(args, list):
            args = " ".join(args)

        if args and args not in hwaccel_args:
            hwaccel_args.append(args)

        for stream_input in camera.ffmpeg.inputs:
            args = stream_input.hwaccel_args

            if isinstance(args, list):
                args = " ".join(args)

            if args and args not in hwaccel_args:
                hwaccel_args.append(args)

    stats: dict[str, dict] = {}

    for args in hwaccel_args:
        if args in hwaccel_errors:
            # known erroring args should automatically return as error
            stats["error-gpu"] = {"gpu": "", "mem": ""}
        elif "cuvid" in args or "nvidia" in args:
            # nvidia GPU
            nvidia_usage = get_nvidia_gpu_stats()

            if nvidia_usage:
                for i in range(len(nvidia_usage)):
                    stats[nvidia_usage[i]["name"]] = {
                        "gpu": str(round(float(nvidia_usage[i]["gpu"]), 2)) + "%",
                        "mem": str(round(float(nvidia_usage[i]["mem"]), 2)) + "%",
                        "enc": str(round(float(nvidia_usage[i]["enc"]), 2)) + "%",
                        "dec": str(round(float(nvidia_usage[i]["dec"]), 2)) + "%",
                    }

            else:
                stats["nvidia-gpu"] = {"gpu": "", "mem": ""}
                hwaccel_errors.append(args)
        elif "nvmpi" in args or "jetson" in args:
            # nvidia Jetson
            jetson_usage = get_jetson_stats()

            if jetson_usage:
                stats["jetson-gpu"] = jetson_usage
            else:
                stats["jetson-gpu"] = {"gpu": "", "mem": ""}
                hwaccel_errors.append(args)
        elif "qsv" in args:
            if not config.telemetry.stats.intel_gpu_stats:
                continue

            # intel QSV GPU
            intel_usage = get_intel_gpu_stats(config.telemetry.stats.intel_gpu_device)

            if intel_usage is not None:
                stats["intel-qsv"] = intel_usage or {"gpu": "", "mem": ""}
            else:
                stats["intel-qsv"] = {"gpu": "", "mem": ""}
                hwaccel_errors.append(args)
        elif "vaapi" in args:
            if is_vaapi_amd_driver():
                if not config.telemetry.stats.amd_gpu_stats:
                    continue

                # AMD VAAPI GPU
                amd_usage = get_amd_gpu_stats()

                if amd_usage:
                    stats["amd-vaapi"] = amd_usage
                else:
                    stats["amd-vaapi"] = {"gpu": "", "mem": ""}
                    hwaccel_errors.append(args)
            else:
                if not config.telemetry.stats.intel_gpu_stats:
                    continue

                # intel VAAPI GPU
                intel_usage = get_intel_gpu_stats(
                    config.telemetry.stats.intel_gpu_device
                )

                if intel_usage is not None:
                    stats["intel-vaapi"] = intel_usage or {"gpu": "", "mem": ""}
                else:
                    stats["intel-vaapi"] = {"gpu": "", "mem": ""}
                    hwaccel_errors.append(args)
        elif "preset-rk" in args:
            rga_usage = get_rockchip_gpu_stats()

            if rga_usage:
                stats["rockchip"] = rga_usage
        elif "v4l2m2m" in args or "rpi" in args:
            # RPi v4l2m2m is currently not able to get usage stats
            stats["rpi-v4l2m2m"] = {"gpu": "", "mem": ""}

    if stats:
        all_stats["gpu_usages"] = stats


async def set_npu_usages(config: FrigateConfig, all_stats: dict[str, Any]) -> None:
    stats: dict[str, dict] = {}

    for detector in config.detectors.values():
        if detector.type == "rknn":
            # Rockchip NPU usage
            rk_usage = get_rockchip_npu_stats()
            stats["rockchip"] = rk_usage
        elif detector.type == "openvino" and detector.device == "NPU":
            # OpenVINO NPU usage
            ov_usage = get_openvino_npu_stats()
            stats["openvino"] = ov_usage

    if stats:
        all_stats["npu_usages"] = stats


def stats_snapshot(
    config: FrigateConfig, stats_tracking: StatsTrackingTypes, hwaccel_errors: list[str]
) -> dict[str, Any]:
    """Get a snapshot of the current stats that are being tracked."""
    camera_metrics = stats_tracking["camera_metrics"]
    stats: dict[str, Any] = {}

    total_camera_fps = total_process_fps = total_skipped_fps = total_detection_fps = 0

    stats["cameras"] = {}
    for name, camera_stats in camera_metrics.items():
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

    get_processing_stats(config, stats, hwaccel_errors)

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

    return stats
