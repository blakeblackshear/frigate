import json
import logging
import threading
import time
import psutil
import shutil
import os

from frigate.config import FrigateConfig
from frigate.const import RECORD_DIR, CLIPS_DIR, CACHE_DIR
from frigate.version import VERSION

logger = logging.getLogger(__name__)


def stats_init(camera_metrics, detectors):
    stats_tracking = {
        "camera_metrics": camera_metrics,
        "detectors": detectors,
        "started": int(time.time()),
    }
    return stats_tracking


def get_fs_type(path):
    bestMatch = ""
    fsType = ""
    for part in psutil.disk_partitions(all=True):
        if path.startswith(part.mountpoint) and len(bestMatch) < len(part.mountpoint):
            fsType = part.fstype
            bestMatch = part.mountpoint
    return fsType


def read_temperature(path):
    if os.path.isfile(path):
        with open(path) as f:
            line = f.readline().strip()
            return int(line) / 1000
    return None


def get_temperatures():
    temps = {}

    # Get temperatures for all attached Corals
    base = "/sys/class/apex/"
    if os.path.isdir(base):
        for apex in os.listdir(base):
            temp = read_temperature(os.path.join(base, apex, "temp"))
            if temp is not None:
                temps[apex] = temp

    return temps


def stats_snapshot(stats_tracking):
    camera_metrics = stats_tracking["camera_metrics"]
    stats = {}

    total_detection_fps = 0

    for name, camera_stats in camera_metrics.items():
        total_detection_fps += camera_stats["detection_fps"].value
        stats[name] = {
            "camera_fps": round(camera_stats["camera_fps"].value, 2),
            "process_fps": round(camera_stats["process_fps"].value, 2),
            "skipped_fps": round(camera_stats["skipped_fps"].value, 2),
            "detection_fps": round(camera_stats["detection_fps"].value, 2),
            "pid": camera_stats["process"].pid,
            "capture_pid": camera_stats["capture_process"].pid,
        }

    stats["detectors"] = {}
    for name, detector in stats_tracking["detectors"].items():
        stats["detectors"][name] = {
            "inference_speed": round(detector.avg_inference_speed.value * 1000, 2),
            "detection_start": detector.detection_start.value,
            "pid": detector.detect_process.pid,
        }
    stats["detection_fps"] = round(total_detection_fps, 2)

    stats["service"] = {
        "uptime": (int(time.time()) - stats_tracking["started"]),
        "version": VERSION,
        "storage": {},
        "temperatures": get_temperatures(),
    }

    for path in [RECORD_DIR, CLIPS_DIR, CACHE_DIR, "/dev/shm"]:
        storage_stats = shutil.disk_usage(path)
        stats["service"]["storage"][path] = {
            "total": round(storage_stats.total / 1000000, 1),
            "used": round(storage_stats.used / 1000000, 1),
            "free": round(storage_stats.free / 1000000, 1),
            "mount_type": get_fs_type(path),
        }

    return stats


class StatsEmitter(threading.Thread):
    def __init__(
        self,
        config: FrigateConfig,
        stats_tracking,
        mqtt_client,
        topic_prefix,
        stop_event,
    ):
        threading.Thread.__init__(self)
        self.name = "frigate_stats_emitter"
        self.config = config
        self.stats_tracking = stats_tracking
        self.mqtt_client = mqtt_client
        self.topic_prefix = topic_prefix
        self.stop_event = stop_event

    def run(self):
        time.sleep(10)
        while not self.stop_event.wait(self.config.mqtt.stats_interval):
            stats = stats_snapshot(self.stats_tracking)
            self.mqtt_client.publish(
                f"{self.topic_prefix}/stats", json.dumps(stats), retain=False
            )
        logger.info(f"Exiting watchdog...")
