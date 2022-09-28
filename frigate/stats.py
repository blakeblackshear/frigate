import json
import logging
import threading
import time
import psutil
import shutil
import os
import requests
from typing import Optional, Any
from paho.mqtt.client import Client
from multiprocessing.synchronize import Event

from frigate.config import FrigateConfig
from frigate.const import RECORD_DIR, CLIPS_DIR, CACHE_DIR
from frigate.types import StatsTrackingTypes, CameraMetricsTypes
from frigate.version import VERSION
from frigate.edgetpu import EdgeTPUProcess

logger = logging.getLogger(__name__)


def get_latest_version() -> str:
    try:
        request = requests.get(
            "https://api.github.com/repos/blakeblackshear/frigate/releases/latest",
            timeout=10,
        )
    except:
        return "unknown"

    response = request.json()

    if request.ok and response and "tag_name" in response:
        return str(response.get("tag_name").replace("v", ""))
    else:
        return "unknown"


def stats_init(
    camera_metrics: dict[str, CameraMetricsTypes], detectors: dict[str, EdgeTPUProcess]
) -> StatsTrackingTypes:
    stats_tracking: StatsTrackingTypes = {
        "camera_metrics": camera_metrics,
        "detectors": detectors,
        "started": int(time.time()),
        "latest_frigate_version": get_latest_version(),
    }
    return stats_tracking


def get_fs_type(path: str) -> str:
    bestMatch = ""
    fsType = ""
    for part in psutil.disk_partitions(all=True):
        if path.startswith(part.mountpoint) and len(bestMatch) < len(part.mountpoint):
            fsType = part.fstype
            bestMatch = part.mountpoint
    return fsType


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

    return temps


def stats_snapshot(stats_tracking: StatsTrackingTypes) -> dict[str, Any]:
    camera_metrics = stats_tracking["camera_metrics"]
    stats: dict[str, Any] = {}

    total_detection_fps = 0

    for name, camera_stats in camera_metrics.items():
        total_detection_fps += camera_stats["detection_fps"].value
        pid = camera_stats["process"].pid if camera_stats["process"] else None
        cpid = (
            camera_stats["capture_process"].pid
            if camera_stats["capture_process"]
            else None
        )
        stats[name] = {
            "camera_fps": round(camera_stats["camera_fps"].value, 2),
            "process_fps": round(camera_stats["process_fps"].value, 2),
            "skipped_fps": round(camera_stats["skipped_fps"].value, 2),
            "detection_fps": round(camera_stats["detection_fps"].value, 2),
            "pid": pid,
            "capture_pid": cpid,
        }

    stats["detectors"] = {}
    for name, detector in stats_tracking["detectors"].items():
        pid = detector.detect_process.pid if detector.detect_process else None
        stats["detectors"][name] = {
            "inference_speed": round(detector.avg_inference_speed.value * 1000, 2),
            "detection_start": detector.detection_start.value,
            "pid": pid,
        }
    stats["detection_fps"] = round(total_detection_fps, 2)

    stats["service"] = {
        "uptime": (int(time.time()) - stats_tracking["started"]),
        "version": VERSION,
        "latest_version": stats_tracking["latest_frigate_version"],
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
        stats_tracking: StatsTrackingTypes,
        mqtt_client: Client,
        topic_prefix: str,
        stop_event: Event,
    ):
        threading.Thread.__init__(self)
        self.name = "frigate_stats_emitter"
        self.config = config
        self.stats_tracking = stats_tracking
        self.mqtt_client = mqtt_client
        self.topic_prefix = topic_prefix
        self.stop_event = stop_event

    def run(self) -> None:
        time.sleep(10)
        while not self.stop_event.wait(self.config.mqtt.stats_interval):
            stats = stats_snapshot(self.stats_tracking)
            self.mqtt_client.publish(
                f"{self.topic_prefix}/stats", json.dumps(stats), retain=False
            )
        logger.info(f"Exiting watchdog...")
