"""Handle creating audio events."""

import logging
import multiprocessing as mp
import signal
import threading
from types import FrameType
from typing import Optional

from setproctitle import setproctitle

from frigate.config import AudioConfig, CameraConfig, FrigateConfig
from frigate.const import CACHE_DIR
from frigate.util import listen

logger = logging.getLogger(__name__)

FFMPEG_COMMAND = "ffmpeg -vn -i {} -f s16le -ar 16000 -ac 1 -y {}"


def listen_to_audio(config: FrigateConfig, event_queue: mp.Queue) -> None:
    stop_event = mp.Event()

    def receiveSignal(signalNumber: int, frame: Optional[FrameType]) -> None:
        stop_event.set()

    signal.signal(signal.SIGTERM, receiveSignal)
    signal.signal(signal.SIGINT, receiveSignal)

    threading.current_thread().name = "process:recording_manager"
    setproctitle("frigate.recording_manager")
    listen()

    for camera in config.cameras.values():
        if camera.enabled and camera.audio.enabled:
            AudioEventMaintainer(camera, stop_event)


class AudioDetectProcess:
    def __init__(
        self,
        name,
        detection_queue,
        out_events,
    ):
        self.name = name
        self.out_events = out_events
        self.detection_queue = detection_queue
        self.detect_process = None
        self.start_or_restart()

    def stop(self):
        # if the process has already exited on its own, just return
        if self.detect_process and self.detect_process.exitcode:
            return
        self.detect_process.terminate()
        logging.info("Waiting for detection process to exit gracefully...")
        self.detect_process.join(timeout=30)
        if self.detect_process.exitcode is None:
            logging.info("Detection process didnt exit. Force killing...")
            self.detect_process.kill()
            self.detect_process.join()
        logging.info("Detection process has exited...")

    def start_or_restart(self):
        self.detection_start.value = 0.0
        if (self.detect_process is not None) and self.detect_process.is_alive():
            self.stop()
        self.detect_process = mp.Process(
            target=run_detector,
            name=f"detector:{self.name}",
            args=(
                self.name,
                self.detection_queue,
                self.out_events,
            ),
        )
        self.detect_process.daemon = True
        self.detect_process.start()


class AudioEventMaintainer(threading.Thread):
    def __init__(self, camera: CameraConfig, stop_event: mp.Event) -> None:
        threading.Thread.__init__(self)
        self.name = f"{camera.name}_audio_event_processor"
        self.config = camera
        self.stop_event = stop_event

    def run(self) -> None:
        self.pipe = f"{CACHE_DIR}/{self.config.name}-audio"
        self.ffmpeg_command = FFMPEG_COMMAND.format(
            [i.path for i in self.config.ffmpeg.inputs if "audio" in i.roles][0],
            self.pipe,
        )
