import json
import re
from urllib.request import urlopen
from prometheus_client import CollectorRegistry
from prometheus_client.metrics_core import GaugeMetricFamily, InfoMetricFamily


def setupRegistry():
    myregistry = CollectorRegistry()
    myregistry.register(CustomCollector())
    return myregistry


def add_metric(metric, label, data, key, multiplier=1.0):
    try:
        string = str(data[key])
        value = float(re.findall(r"\d+", string)[0])
        metric.add_metric([label], value * multiplier)
    except (KeyError, TypeError, IndexError):
        pass


class CustomCollector:
    def __init__(self):
        self.stats_url = "http://localhost:5000/api/stats"

    def collect(self):
        data = json.loads(urlopen(self.stats_url).read())

        # camera stats
        ffmpeg_up = GaugeMetricFamily(
            "frigate_ffmpeg_up",
            "Whether the ffmpeg process for a camera is up",
            labels=["camera"],
        )
        capture_pid = GaugeMetricFamily(
            "frigate_capture_pid",
            "PID for the ffmpeg process that consumes this camera",
            labels=["camera"],
        )
        detect_pid = GaugeMetricFamily(
            "frigate_detect_pid",
            "PID for the process that runs detection for this camera",
            labels=["camera"],
        )
        camera_fps = GaugeMetricFamily(
            "frigate_camera_fps",
            "Frames per second being consumed from your camera.",
            labels=["camera"],
        )
        detection_fps = GaugeMetricFamily(
            "frigate_detection_fps",
            "Number of times detection is run per second.",
            labels=["camera"],
        )
        process_fps = GaugeMetricFamily(
            "frigate_process_fps",
            "Frames per second being processed by frigate.",
            labels=["camera"],
        )
        skipped_fps = GaugeMetricFamily(
            "frigate_skipped_fps",
            "Frames per second skip for processing by frigate.",
            labels=["camera"],
        )
        detection_enabled = GaugeMetricFamily(
            "frigate_detection_enabled",
            "Detection enabled for camera",
            labels=["camera"],
        )

        for k, d in data.items():
            add_metric(ffmpeg_up, k, d is not None, "ffmpeg_up")
            add_metric(detect_pid, k, d, "pid")
            add_metric(capture_pid, k, d, "capture_pid")
            add_metric(camera_fps, k, d, "camera_fps")
            add_metric(detection_fps, k, d, "detection_fps")
            add_metric(process_fps, k, d, "process_fps")
            add_metric(skipped_fps, k, d, "skipped_fps")
            add_metric(detection_enabled, k, d, "detection_enabled")

        yield ffmpeg_up
        yield capture_pid
        yield detect_pid
        yield camera_fps
        yield detection_fps
        yield process_fps
        yield skipped_fps
        yield detection_enabled

        # detector stats
        try:
            yield GaugeMetricFamily(
                "frigate_detection_total_fps",
                "Sum of detection_fps across all cameras and detectors.",
                value=data["detection_fps"],
            )
        except KeyError:
            pass

        detector_inference_speed = GaugeMetricFamily(
            "frigate_detector_inference_speed_seconds",
            "Time spent running object detection in seconds.",
            labels=["name"],
        )
        detector_pid = GaugeMetricFamily(
            "frigate_detector_pid",
            "PID for the shared process that runs object detection on the detector",
            labels=["name"],
        )
        detector_detection_start = GaugeMetricFamily(
            "frigate_detection_start",
            "Detector start time (unix timestamp)",
            labels=["name"],
        )
        try:
            for k, d in data["detectors"].items():
                add_metric(
                    detector_inference_speed, k, d, "inference_speed", 0.001
                )  # ms to seconds
                add_metric(detector_pid, k, d, "pid")
                add_metric(detector_detection_start, k, d, "detection_start")
        except KeyError:
            pass

        yield detector_inference_speed
        yield detector_pid
        yield detector_detection_start

        # process stats
        cpu_usages = GaugeMetricFamily(
            "frigate_cpu_usage_percent", "Process CPU usage %", labels=["pid"]
        )
        mem_usages = GaugeMetricFamily(
            "frigate_mem_usage_percent", "Process memory usage %", labels=["pid"]
        )

        try:
            for k, d in data["cpu_usages"].items():
                add_metric(cpu_usages, k, d, "cpu")
                add_metric(mem_usages, k, d, "mem")
        except KeyError:
            pass

        yield cpu_usages
        yield mem_usages

        # gpu stats
        gpu_usages = GaugeMetricFamily(
            "frigate_gpu_usage_percent", "GPU utilisation %", labels=["gpu"]
        )
        gpu_mem_usages = GaugeMetricFamily(
            "frigate_gpu_mem_usage_percent", "GPU memory usage %", labels=["gpu"]
        )

        try:
            for k, d in data["gpu_usages"].items():
                add_metric(gpu_usages, k, d, "gpu")
                add_metric(gpu_usages, k, d, "mem")
        except KeyError:
            pass

        yield gpu_usages
        yield gpu_mem_usages

        # service stats
        uptime_seconds = GaugeMetricFamily(
            "frigate_service_uptime_seconds", "Uptime seconds"
        )
        last_updated_timestamp = GaugeMetricFamily(
            "frigate_service_last_updated_timestamp",
            "Stats recorded time (unix timestamp)",
        )

        try:
            s = data["service"]
            add_metric(uptime_seconds, "", s, "uptime")
            add_metric(last_updated_timestamp, "", s, "last_updated")

            info = {
                "latest_version": data["service"]["latest_version"],
                "version": data["service"]["version"],
            }
            yield InfoMetricFamily(
                "frigate_service", "Frigate version info", value=info
            )

        except KeyError:
            pass

        yield uptime_seconds
        yield last_updated_timestamp

        # service->temperatures: no data for me

        storage_free = GaugeMetricFamily(
            "frigate_storage_free_bytes", "Storage free bytes", labels=["storage"]
        )
        storage_mount_type = InfoMetricFamily(
            "frigate_storage_mount_type", "Storage mount type", labels=["storage"]
        )
        storage_total = GaugeMetricFamily(
            "frigate_storage_total_bytes", "Storage total bytes", labels=["storage"]
        )
        storage_used = GaugeMetricFamily(
            "frigate_storage_used_bytes", "Storage used bytes", labels=["storage"]
        )

        try:
            for k, d in data["service"]["storage"].items():
                add_metric(storage_free, k, d, "free", 1e6)  # MB to bytes
                add_metric(storage_total, k, d, "total", 1e6)  # MB to bytes
                add_metric(storage_used, k, d, "used", 1e6)  # MB to bytes
                storage_mount_type.add_metric(k, {"mount_type": d["mount_type"]})
        except KeyError:
            pass

        yield storage_free
        yield storage_mount_type
        yield storage_total
        yield storage_used
