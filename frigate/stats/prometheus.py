import logging
import re

from prometheus_client import CONTENT_TYPE_LATEST, generate_latest
from prometheus_client.core import (
    REGISTRY,
    CounterMetricFamily,
    GaugeMetricFamily,
    InfoMetricFamily,
)


class CustomCollector(object):
    def __init__(self, _url):
        self.process_stats = {}
        self.previous_event_id = None
        self.previous_event_start_time = None
        self.all_events = {}

    def add_metric(self, metric, label, stats, key, multiplier=1.0):  # Now a method
        try:
            string = str(stats[key])
            value = float(re.findall(r"-?\d*\.?\d*", string)[0])
            metric.add_metric(label, value * multiplier)
        except (KeyError, TypeError, IndexError, ValueError):
            pass

    def add_metric_process(
        self,
        metric,
        camera_stats,
        camera_name,
        pid_name,
        process_name,
        cpu_or_memory,
        process_type,
    ):
        try:
            pid = str(camera_stats[pid_name])
            label_values = [pid, camera_name, process_name, process_type]
            try:
                # new frigate:0.13.0-beta3 stat 'cmdline'
                label_values.append(self.process_stats[pid]["cmdline"])
            except KeyError:
                pass
            metric.add_metric(label_values, self.process_stats[pid][cpu_or_memory])
            del self.process_stats[pid][cpu_or_memory]
        except (KeyError, TypeError, IndexError):
            pass

    def collect(self):
        stats = self.process_stats  # Assign self.process_stats to local variable stats

        try:
            self.process_stats = stats["cpu_usages"]
        except KeyError:
            pass

        # process stats for cameras, detectors and other
        cpu_usages = GaugeMetricFamily(
            "frigate_cpu_usage_percent",
            "Process CPU usage %",
            labels=["pid", "name", "process", "type", "cmdline"],
        )
        mem_usages = GaugeMetricFamily(
            "frigate_mem_usage_percent",
            "Process memory usage %",
            labels=["pid", "name", "process", "type", "cmdline"],
        )

        # camera stats
        audio_dBFS = GaugeMetricFamily(
            "frigate_audio_dBFS", "Audio dBFS for camera", labels=["camera_name"]
        )
        audio_rms = GaugeMetricFamily(
            "frigate_audio_rms", "Audio RMS for camera", labels=["camera_name"]
        )
        camera_fps = GaugeMetricFamily(
            "frigate_camera_fps",
            "Frames per second being consumed from your camera.",
            labels=["camera_name"],
        )
        detection_enabled = GaugeMetricFamily(
            "frigate_detection_enabled",
            "Detection enabled for camera",
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

        # read camera stats assuming version < frigate:0.13.0-beta3
        cameras = stats
        try:
            # try to read camera stats in case >= frigate:0.13.0-beta3
            cameras = stats["cameras"]
        except KeyError:
            pass

        for camera_name, camera_stats in cameras.items():
            self.add_metric(audio_dBFS, [camera_name], camera_stats, "audio_dBFS")
            self.add_metric(audio_rms, [camera_name], camera_stats, "audio_rms")
            self.add_metric(camera_fps, [camera_name], camera_stats, "camera_fps")
            self.add_metric(
                detection_enabled, [camera_name], camera_stats, "detection_enabled"
            )
            self.add_metric(detection_fps, [camera_name], camera_stats, "detection_fps")
            self.add_metric(process_fps, [camera_name], camera_stats, "process_fps")
            self.add_metric(skipped_fps, [camera_name], camera_stats, "skipped_fps")

            self.add_metric_process(
                cpu_usages,
                camera_stats,
                camera_name,
                "ffmpeg_pid",
                "ffmpeg",
                "cpu",
                "Camera",
            )
            self.add_metric_process(
                cpu_usages,
                camera_stats,
                camera_name,
                "capture_pid",
                "capture",
                "cpu",
                "Camera",
            )
            self.add_metric_process(
                cpu_usages, camera_stats, camera_name, "pid", "detect", "cpu", "Camera"
            )

            self.add_metric_process(
                mem_usages,
                camera_stats,
                camera_name,
                "ffmpeg_pid",
                "ffmpeg",
                "mem",
                "Camera",
            )
            self.add_metric_process(
                mem_usages,
                camera_stats,
                camera_name,
                "capture_pid",
                "capture",
                "mem",
                "Camera",
            )
            self.add_metric_process(
                mem_usages, camera_stats, camera_name, "pid", "detect", "mem", "Camera"
            )

        yield audio_dBFS
        yield audio_rms
        yield camera_fps
        yield detection_enabled
        yield detection_fps
        yield process_fps
        yield skipped_fps

        # bandwidth stats
        bandwidth_usages = GaugeMetricFamily(
            "frigate_bandwidth_usages_kBps",
            "bandwidth usages kilobytes per second",
            labels=["pid", "name", "process", "cmdline"],
        )

        try:
            for b_pid, b_stats in stats["bandwidth_usages"].items():
                label = [b_pid]  # pid label
                try:
                    n = stats["cpu_usages"][b_pid]["cmdline"]
                    for p_name, p_stats in stats["processes"].items():
                        if str(p_stats["pid"]) == b_pid:
                            n = p_name
                            break

                    # new frigate:0.13.0-beta3 stat 'cmdline'
                    label.append(n)  # name label
                    label.append(stats["cpu_usages"][b_pid]["cmdline"])  # process label
                    label.append(stats["cpu_usages"][b_pid]["cmdline"])  # cmdline label
                    self.add_metric(bandwidth_usages, label, b_stats, "bandwidth")
                except KeyError:
                    pass
        except KeyError:
            pass

        yield bandwidth_usages

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
                self.add_metric(
                    detector_inference_speed,
                    [detector_name],
                    detector_stats,
                    "inference_speed",
                    0.001,
                )  # ms to seconds
                self.add_metric(
                    detector_detection_start,
                    [detector_name],
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

        # detector process stats
        try:
            for detector_name, detector_stats in stats["detectors"].items():
                p_pid = str(detector_stats["pid"])
                label = [p_pid]  # pid label
                try:
                    # new frigate:0.13.0-beta3 stat 'cmdline'
                    label.append(detector_name)  # name label
                    label.append(detector_name)  # process label
                    label.append("detectors")  # type label
                    label.append(self.process_stats[p_pid]["cmdline"])  # cmdline label
                    self.add_metric(cpu_usages, label, self.process_stats[p_pid], "cpu")
                    self.add_metric(mem_usages, label, self.process_stats[p_pid], "mem")
                    del self.process_stats[p_pid]
                except KeyError:
                    pass

        except KeyError:
            pass

        # other named process stats
        try:
            for process_name, process_stats in stats["processes"].items():
                p_pid = str(process_stats["pid"])
                label = [p_pid]  # pid label
                try:
                    # new frigate:0.13.0-beta3 stat 'cmdline'
                    label.append(process_name)  # name label
                    label.append(process_name)  # process label
                    label.append(process_name)  # type label
                    label.append(self.process_stats[p_pid]["cmdline"])  # cmdline label
                    self.add_metric(cpu_usages, label, self.process_stats[p_pid], "cpu")
                    self.add_metric(mem_usages, label, self.process_stats[p_pid], "mem")
                    del self.process_stats[p_pid]
                except KeyError:
                    pass

        except KeyError:
            pass

        # remaining process stats
        try:
            for process_id, pid_stats in self.process_stats.items():
                label = [process_id]  # pid label
                try:
                    # new frigate:0.13.0-beta3 stat 'cmdline'
                    label.append(pid_stats["cmdline"])  # name label
                    label.append(pid_stats["cmdline"])  # process label
                    label.append("Other")  # type label
                    label.append(pid_stats["cmdline"])  # cmdline label
                except KeyError:
                    pass
                self.add_metric(cpu_usages, label, pid_stats, "cpu")
                self.add_metric(mem_usages, label, pid_stats, "mem")
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
                self.add_metric(gpu_usages, [gpu_name], gpu_stats, "gpu")
                self.add_metric(gpu_mem_usages, [gpu_name], gpu_stats, "mem")
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
            self.add_metric(uptime_seconds, [""], service_stats, "uptime")
            self.add_metric(last_updated_timestamp, [""], service_stats, "last_updated")

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

        temperatures = GaugeMetricFamily(
            "frigate_device_temperature", "Device Temperature", labels=["device"]
        )
        try:
            for device_name in stats["service"]["temperatures"]:
                self.add_metric(
                    temperatures,
                    [device_name],
                    stats["service"]["temperatures"],
                    device_name,
                )
        except KeyError:
            pass

        yield temperatures

        storage_free = GaugeMetricFamily(
            "frigate_storage_free_bytes", "Storage free bytes", labels=["storage"]
        )
        storage_mount_type = InfoMetricFamily(
            "frigate_storage_mount_type",
            "Storage mount type",
            labels=["mount_type", "storage"],
        )
        storage_total = GaugeMetricFamily(
            "frigate_storage_total_bytes", "Storage total bytes", labels=["storage"]
        )
        storage_used = GaugeMetricFamily(
            "frigate_storage_used_bytes", "Storage used bytes", labels=["storage"]
        )

        try:
            for storage_path, storage_stats in stats["service"]["storage"].items():
                self.add_metric(
                    storage_free, [storage_path], storage_stats, "free", 1e6
                )  # MB to bytes
                self.add_metric(
                    storage_total, [storage_path], storage_stats, "total", 1e6
                )  # MB to bytes
                self.add_metric(
                    storage_used, [storage_path], storage_stats, "used", 1e6
                )  # MB to bytes
                storage_mount_type.add_metric(
                    storage_path,
                    {
                        "mount_type": storage_stats["mount_type"],
                        "storage": storage_path,
                    },
                )
        except KeyError:
            pass

        yield storage_free
        yield storage_mount_type
        yield storage_total
        yield storage_used

        # count events
        events = []

        if len(events) > 0:
            # events[0] is newest event, last element is oldest, don't need to sort

            if not self.previous_event_id:
                # ignore all previous events on startup, prometheus might have already counted them
                self.previous_event_id = events[0]["id"]
                self.previous_event_start_time = int(events[0]["start_time"])

            for event in events:
                # break if event already counted
                if event["id"] == self.previous_event_id:
                    break

                # break if event starts before previous event
                if event["start_time"] < self.previous_event_start_time:
                    break

                # store counted events in a dict
                try:
                    cam = self.all_events[event["camera"]]
                    try:
                        cam[event["label"]] += 1
                    except KeyError:
                        # create label dict if not exists
                        cam.update({event["label"]: 1})
                except KeyError:
                    # create camera and label dict if not exists
                    self.all_events.update({event["camera"]: {event["label"]: 1}})

            # don't recount events next time
            self.previous_event_id = events[0]["id"]
            self.previous_event_start_time = int(events[0]["start_time"])

        camera_events = CounterMetricFamily(
            "frigate_camera_events",
            "Count of camera events since exporter started",
            labels=["camera", "label"],
        )

        for camera, cam_dict in self.all_events.items():
            for label, label_value in cam_dict.items():
                camera_events.add_metric([camera, label], label_value)

        yield camera_events


collector = CustomCollector(None)
REGISTRY.register(collector)


def update_metrics(stats):
    """Updates the Prometheus metrics with the given stats data."""
    try:
        collector.process_stats = stats  # Directly assign the stats data
        # Important: Since we are not fetching from URL, we need to manually call collect
        for _ in collector.collect():
            pass
    except Exception as e:
        logging.error(f"Error updating metrics: {e}")


def get_metrics():
    """Returns the Prometheus metrics in text format."""
    content = generate_latest(REGISTRY)  # Use generate_latest
    return content, CONTENT_TYPE_LATEST
