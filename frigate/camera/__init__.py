import multiprocessing as mp
from multiprocessing.managers import SyncManager
from multiprocessing.sharedctypes import Synchronized
from multiprocessing.synchronize import Event


class CameraMetrics:
    camera_fps: Synchronized
    detection_fps: Synchronized
    detection_frame: Synchronized
    process_fps: Synchronized
    skipped_fps: Synchronized
    read_start: Synchronized
    audio_rms: Synchronized
    audio_dBFS: Synchronized

    frame_queue: mp.Queue

    process_pid: Synchronized
    capture_process_pid: Synchronized
    ffmpeg_pid: Synchronized
    reconnects_last_hour: Synchronized
    stalls_last_hour: Synchronized

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
        self.autotracker_enabled = mp.Value("i", autotracker_enabled)

        self.start_time = mp.Value("d", 0)
        self.stop_time = mp.Value("d", 0)
        self.frame_time = mp.Value("d", 0)
        self.zoom_level = mp.Value("d", 0)
        self.max_zoom = mp.Value("d", 0)
        self.min_zoom = mp.Value("d", 0)

        self.tracking_active = mp.Event()
        self.motor_stopped = mp.Event()
        self.reset = mp.Event()

        self.motor_stopped.set()
