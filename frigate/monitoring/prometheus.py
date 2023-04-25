import json
import re
from urllib.request import urlopen
from prometheus_client import CollectorRegistry
from prometheus_client.metrics_core import GaugeMetricFamily, InfoMetricFamily, Metric
from typing import Dict, Any, Generator


def setupRegistry() -> CollectorRegistry:
    myregistry = CollectorRegistry()
    myregistry.register(CustomCollector())
    return myregistry


def add_metric(
    metric: GaugeMetricFamily,
    label: str,
    stats: Dict[str, Any],
    key: str,
    multiplier: float = 1.0,
) -> None:
    try:
        string = str(stats[key])
        value = float(re.findall(r"\d+", string)[0])
        metric.add_metric([label], value * multiplier)
    except (KeyError, TypeError, IndexError):
        pass


class CustomCollector(CollectorRegistry):
    def __init__(self) -> None:
        self.stats_url = "http://localhost:5000/api/stats"
        self.process_stats: Dict[str, Dict[str, float]] = {}  # Add a type hint here

    def add_metric_process(
        self,
        metric: GaugeMetricFamily,
        stats: Dict[str, Any],
        camera_name: str,
        pid_name: str,
        process_name: str,
        cpu_or_memory: str,
        process_type: str,
    ) -> None:
        try:
            pid = str(stats[camera_name][pid_name])
            label_values = [pid, camera_name, process_name, process_type]
            metric.add_metric(label_values, self.process_stats[pid][cpu_or_memory])
            del self.process_stats[pid][cpu_or_memory]
        except (KeyError, TypeError, IndexError):
            pass

    def collect(self) -> Generator[Metric, None, None]:
        stats = json.loads(urlopen(self.stats_url).read())
        self.process_stats = stats["cpu_usages"]

        # process stats for cameras, detectors and other
        cpu_usages = GaugeMetricFamily(
            "frigate_cpu_usage_percent",
            "Process CPU usage %",
            labels=["pid", "name", "process", "type"],
        )
        mem_usages = GaugeMetricFamily(
            "frigate_mem_usage_percent",
            "Process memory usage %",
            labels=["pid", "name", "process", "type"],
        )

        # camera stats
        camera_fps = GaugeMetricFamily(
            "frigate_camera_fps",
            "Frames per second being consumed from your camera.",
            labels=["camera_name"],
        )
        detection_fps = GaugeMetricFamily(
            "frigate_detection_fps",
            "Number of times detection is run per second.",
            labels=["camera_name"],
        )
        process_fps = GaugeMetricFamily(
            "frigate_process_fps",
            "Frames per second being processed by frigate.",
            labels=["camera_name"],
        )
        skipped_fps = GaugeMetricFamily(
            "frigate_skipped_fps",
            "Frames per second skip for processing by frigate.",
            labels=["camera_name"],
        )
        detection_enabled = GaugeMetricFamily(
            "frigate_detection_enabled",
            "Detection enabled for camera",
            labels=["camera_name"],
        )

        for camera_name, camera_stats in stats.items():
            add_metric(camera_fps, camera_name, camera_stats, "camera_fps")
            add_metric(detection_fps, camera_name, camera_stats, "detection_fps")
            add_metric(process_fps, camera_name, camera_stats, "process_fps")
            add_metric(skipped_fps, camera_name, camera_stats, "skipped_fps")
            add_metric(
                detection_enabled, camera_name, camera_stats, "detection_enabled"
            )

            self.add_metric_process(
                cpu_usages, stats, camera_name, "ffmpeg_pid", "ffmpeg", "cpu", "Camera"
            )
            self.add_metric_process(
                cpu_usages,
                stats,
                camera_name,
                "capture_pid",
                "capture",
                "cpu",
                "Camera",
            )
            self.add_metric_process(
                cpu_usages, stats, camera_name, "pid", "detect", "cpu", "Camera"
            )

            self.add_metric_process(
                mem_usages, stats, camera_name, "ffmpeg_pid", "ffmpeg", "mem", "Camera"
            )
            self.add_metric_process(
                mem_usages,
                stats,
                camera_name,
                "capture_pid",
                "capture",
                "mem",
                "Camera",
            )
            self.add_metric_process(
                mem_usages, stats, camera_name, "pid", "detect", "mem", "Camera"
            )

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
                value=stats["detection_fps"],
            )
        except KeyError:
            pass

        detector_inference_speed = GaugeMetricFamily(
            "frigate_detector_inference_speed_seconds",
            "Time spent running object detection in seconds.",
            labels=["name"],
        )

        detector_detection_start = GaugeMetricFamily(
            "frigate_detection_start",
            "Detector start time (unix timestamp)",
            labels=["name"],
        )

        try:
            for detector_name, detector_stats in stats["detectors"].items():
                add_metric(
                    detector_inference_speed,
                    detector_name,
                    detector_stats,
                    "inference_speed",
                    0.001,
                )  # ms to seconds
                add_metric(
                    detector_detection_start,
                    detector_name,
                    detector_stats,
                    "detection_start",
                )
                self.add_metric_process(
                    cpu_usages,
                    stats["detectors"],
                    detector_name,
                    "pid",
                    "detect",
                    "cpu",
                    "Detector",
                )
                self.add_metric_process(
                    mem_usages,
                    stats["detectors"],
                    detector_name,
                    "pid",
                    "detect",
                    "mem",
                    "Detector",
                )
        except KeyError:
            pass

        yield detector_inference_speed
        yield detector_detection_start

        # remaining process stats
        try:
            for process_id, pid_stats in self.process_stats.items():
                add_metric(cpu_usages, process_id, pid_stats, "cpu")
                add_metric(mem_usages, process_id, pid_stats, "mem")
        except KeyError:
            pass

        yield cpu_usages
        yield mem_usages

        # gpu stats
        gpu_usages = GaugeMetricFamily(
            "frigate_gpu_usage_percent", "GPU utilisation %", labels=["gpu_name"]
        )
        gpu_mem_usages = GaugeMetricFamily(
            "frigate_gpu_mem_usage_percent", "GPU memory usage %", labels=["gpu_name"]
        )

        try:
            for gpu_name, gpu_stats in stats["gpu_usages"].items():
                add_metric(gpu_usages, gpu_name, gpu_stats, "gpu")
                add_metric(gpu_usages, gpu_name, gpu_stats, "mem")
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
            service_stats = stats["service"]
            add_metric(uptime_seconds, "", service_stats, "uptime")
            add_metric(last_updated_timestamp, "", service_stats, "last_updated")

            info = {
                "latest_version": stats["service"]["latest_version"],
                "version": stats["service"]["version"],
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
            for storage_path, storage_stats in stats["service"]["storage"].items():
                add_metric(
                    storage_free, storage_path, storage_stats, "free", 1e6
                )  # MB to bytes
                add_metric(
                    storage_total, storage_path, storage_stats, "total", 1e6
                )  # MB to bytes
                add_metric(
                    storage_used, storage_path, storage_stats, "used", 1e6
                )  # MB to bytes
                storage_mount_type.add_metric(
                    storage_path, {"mount_type": storage_stats["mount_type"]}
                )
        except KeyError:
            pass

        yield storage_free
        yield storage_mount_type
        yield storage_total
        yield storage_used
