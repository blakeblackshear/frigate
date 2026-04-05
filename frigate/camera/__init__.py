import multiprocessing as mp
import queue
from multiprocessing.managers import SyncManager, ValueProxy
from multiprocessing.sharedctypes import Synchronized
from multiprocessing.synchronize import Event


class CameraMetrics:
    camera_fps: ValueProxy[float]
    detection_fps: ValueProxy[float]
    detection_frame: ValueProxy[float]
    process_fps: ValueProxy[float]
    skipped_fps: ValueProxy[float]
    read_start: ValueProxy[float]
    audio_rms: ValueProxy[float]
    audio_dBFS: ValueProxy[float]

    frame_queue: queue.Queue

    process_pid: ValueProxy[int]
    capture_process_pid: ValueProxy[int]
    ffmpeg_pid: ValueProxy[int]
    reconnects_last_hour: ValueProxy[int]
    stalls_last_hour: ValueProxy[int]

    def __init__(self, manager: SyncManager):
        self.camera_fps = manager.Value("d", 0)
        self.detection_fps = manager.Value("d", 0)
        self.detection_frame = manager.Value("d", 0)
        self.process_fps = manager.Value("d", 0)
        self.skipped_fps = manager.Value("d", 0)
        self.read_start = manager.Value("d", 0)
        self.audio_rms = manager.Value("d", 0)
        self.audio_dBFS = manager.Value("d", 0)

        self.frame_queue = manager.Queue(maxsize=2)

        self.process_pid = manager.Value("i", 0)
        self.capture_process_pid = manager.Value("i", 0)
        self.ffmpeg_pid = manager.Value("i", 0)
        self.reconnects_last_hour = manager.Value("i", 0)
        self.stalls_last_hour = manager.Value("i", 0)


class PTZMetrics:
    autotracker_enabled: Synchronized

    start_time: Synchronized
    stop_time: Synchronized
    frame_time: Synchronized
    zoom_level: Synchronized
    max_zoom: Synchronized
    min_zoom: Synchronized

    tracking_active: Event
    motor_stopped: Event
    reset: Event

    def __init__(self, *, autotracker_enabled: bool):
        self.autotracker_enabled = mp.Value("i", autotracker_enabled)  # type: ignore[assignment]

        self.start_time = mp.Value("d", 0)  # type: ignore[assignment]
        self.stop_time = mp.Value("d", 0)  # type: ignore[assignment]
        self.frame_time = mp.Value("d", 0)  # type: ignore[assignment]
        self.zoom_level = mp.Value("d", 0)  # type: ignore[assignment]
        self.max_zoom = mp.Value("d", 0)  # type: ignore[assignment]
        self.min_zoom = mp.Value("d", 0)  # type: ignore[assignment]

        self.tracking_active = mp.Event()
        self.motor_stopped = mp.Event()
        self.reset = mp.Event()

        self.motor_stopped.set()
