import multiprocessing as mp
from multiprocessing.sharedctypes import Synchronized
from multiprocessing.synchronize import Event
from typing import Optional


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

    process: Optional[mp.Process]
    capture_process: Optional[mp.Process]
    ffmpeg_pid: Synchronized

    def __init__(self):
        self.camera_fps = mp.Value("d", 0)
        self.detection_fps = mp.Value("d", 0)
        self.detection_frame = mp.Value("d", 0)
        self.process_fps = mp.Value("d", 0)
        self.skipped_fps = mp.Value("d", 0)
        self.read_start = mp.Value("d", 0)
        self.audio_rms = mp.Value("d", 0)
        self.audio_dBFS = mp.Value("d", 0)

        self.frame_queue = mp.Queue(maxsize=2)

        self.process = None
        self.capture_process = None
        self.ffmpeg_pid = mp.Value("i", 0)


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
