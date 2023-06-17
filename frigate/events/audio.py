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
