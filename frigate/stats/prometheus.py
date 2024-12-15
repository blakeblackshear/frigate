from typing import Dict

from prometheus_client import (
    CONTENT_TYPE_LATEST,
    Counter,
    Gauge,
    Info,
    generate_latest,
)

# System metrics
SYSTEM_INFO = Info("frigate_system", "System information")
CPU_USAGE = Gauge(
    "frigate_cpu_usage_percent",
    "Process CPU usage %",
    ["pid", "name", "process", "type", "cmdline"],
)
MEMORY_USAGE = Gauge(
    "frigate_mem_usage_percent",
    "Process memory usage %",
    ["pid", "name", "process", "type", "cmdline"],
)

# Camera metrics
CAMERA_FPS = Gauge(
    "frigate_camera_fps",
    "Frames per second being consumed from your camera",
    ["camera_name"],
)
DETECTION_FPS = Gauge(
    "frigate_detection_fps",
    "Number of times detection is run per second",
    ["camera_name"],
)
PROCESS_FPS = Gauge(
    "frigate_process_fps",
    "Frames per second being processed by frigate",
    ["camera_name"],
)
SKIPPED_FPS = Gauge(
    "frigate_skipped_fps", "Frames per second skipped for processing", ["camera_name"]
)
DETECTION_ENABLED = Gauge(
    "frigate_detection_enabled", "Detection enabled for camera", ["camera_name"]
)
AUDIO_DBFS = Gauge("frigate_audio_dBFS", "Audio dBFS for camera", ["camera_name"])
AUDIO_RMS = Gauge("frigate_audio_rms", "Audio RMS for camera", ["camera_name"])

# Detector metrics
DETECTOR_INFERENCE = Gauge(
    "frigate_detector_inference_speed_seconds",
    "Time spent running object detection in seconds",
    ["name"],
)
DETECTOR_START = Gauge(
    "frigate_detection_start", "Detector start time (unix timestamp)", ["name"]
)

# GPU metrics
GPU_USAGE = Gauge("frigate_gpu_usage_percent", "GPU utilisation %", ["gpu_name"])
GPU_MEMORY = Gauge("frigate_gpu_mem_usage_percent", "GPU memory usage %", ["gpu_name"])

# Storage metrics
STORAGE_FREE = Gauge("frigate_storage_free_bytes", "Storage free bytes", ["storage"])
STORAGE_TOTAL = Gauge("frigate_storage_total_bytes", "Storage total bytes", ["storage"])
STORAGE_USED = Gauge("frigate_storage_used_bytes", "Storage used bytes", ["storage"])
STORAGE_MOUNT = Info(
    "frigate_storage_mount_type", "Storage mount type", ["mount_type", "storage"]
)

# Service metrics
UPTIME = Gauge("frigate_service_uptime_seconds", "Uptime seconds")
LAST_UPDATE = Gauge(
    "frigate_service_last_updated_timestamp", "Stats recorded time (unix timestamp)"
)
TEMPERATURE = Gauge("frigate_device_temperature", "Device Temperature", ["device"])

# Event metrics
CAMERA_EVENTS = Counter(
    "frigate_camera_events",
    "Count of camera events since exporter started",
    ["camera", "label"],
)


def update_metrics(stats: Dict) -> None:
    """Update Prometheus metrics based on Frigate stats"""
    try:
        # Update process metrics
        if "cpu_usages" in stats:
            for pid, proc_stats in stats["cpu_usages"].items():
                cmdline = proc_stats.get("cmdline", "")
                process_type = "Other"
                process_name = cmdline

                CPU_USAGE.labels(
                    pid=pid,
                    name=process_name,
                    process=process_name,
                    type=process_type,
                    cmdline=cmdline,
                ).set(float(proc_stats["cpu"]))

                MEMORY_USAGE.labels(
                    pid=pid,
                    name=process_name,
                    process=process_name,
                    type=process_type,
                    cmdline=cmdline,
                ).set(float(proc_stats["mem"]))

        # Update camera metrics
        if "cameras" in stats:
            for camera_name, camera_stats in stats["cameras"].items():
                if "camera_fps" in camera_stats:
                    CAMERA_FPS.labels(camera_name=camera_name).set(
                        camera_stats["camera_fps"]
                    )
                if "detection_fps" in camera_stats:
                    DETECTION_FPS.labels(camera_name=camera_name).set(
                        camera_stats["detection_fps"]
                    )
                if "process_fps" in camera_stats:
                    PROCESS_FPS.labels(camera_name=camera_name).set(
                        camera_stats["process_fps"]
                    )
                if "skipped_fps" in camera_stats:
                    SKIPPED_FPS.labels(camera_name=camera_name).set(
                        camera_stats["skipped_fps"]
                    )
                if "detection_enabled" in camera_stats:
                    DETECTION_ENABLED.labels(camera_name=camera_name).set(
                        camera_stats["detection_enabled"]
                    )
                if "audio_dBFS" in camera_stats:
                    AUDIO_DBFS.labels(camera_name=camera_name).set(
                        camera_stats["audio_dBFS"]
                    )
                if "audio_rms" in camera_stats:
                    AUDIO_RMS.labels(camera_name=camera_name).set(
                        camera_stats["audio_rms"]
                    )

        # Update detector metrics
        if "detectors" in stats:
            for name, detector in stats["detectors"].items():
                if "inference_speed" in detector:
                    DETECTOR_INFERENCE.labels(name=name).set(
                        detector["inference_speed"] * 0.001
                    )  # ms to seconds
                if "detection_start" in detector:
                    DETECTOR_START.labels(name=name).set(detector["detection_start"])

        # Update GPU metrics
        if "gpu_usages" in stats:
            for gpu_name, gpu_stats in stats["gpu_usages"].items():
                if "gpu" in gpu_stats:
                    GPU_USAGE.labels(gpu_name=gpu_name).set(float(gpu_stats["gpu"]))
                if "mem" in gpu_stats:
                    GPU_MEMORY.labels(gpu_name=gpu_name).set(float(gpu_stats["mem"]))

        # Update service metrics
        if "service" in stats:
            service = stats["service"]

            if "uptime" in service:
                UPTIME.set(service["uptime"])
            if "last_updated" in service:
                LAST_UPDATE.set(service["last_updated"])

            # Storage metrics
            if "storage" in service:
                for path, storage in service["storage"].items():
                    if "free" in storage:
                        STORAGE_FREE.labels(storage=path).set(
                            storage["free"] * 1e6
                        )  # MB to bytes
                    if "total" in storage:
                        STORAGE_TOTAL.labels(storage=path).set(storage["total"] * 1e6)
                    if "used" in storage:
                        STORAGE_USED.labels(storage=path).set(storage["used"] * 1e6)
                    if "mount_type" in storage:
                        STORAGE_MOUNT.labels(storage=path).info(
                            {"mount_type": storage["mount_type"], "storage": path}
                        )

            # Temperature metrics
            if "temperatures" in service:
                for device, temp in service["temperatures"].items():
                    TEMPERATURE.labels(device=device).set(temp)

            # Version info
            if "version" in service and "latest_version" in service:
                SYSTEM_INFO.info(
                    {
                        "version": service["version"],
                        "latest_version": service["latest_version"],
                    }
                )

    except Exception as e:
        print(f"Error updating Prometheus metrics: {str(e)}")


def get_metrics() -> tuple[str, str]:
    """Get Prometheus metrics in text format"""
    return generate_latest(), CONTENT_TYPE_LATEST
