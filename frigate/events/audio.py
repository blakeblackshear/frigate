"""Handle creating audio events."""

import logging
import multiprocessing as mp
import signal
import subprocess as sp
import threading
from types import FrameType
from typing import Optional

import numpy as np
from setproctitle import setproctitle

from frigate.config import CameraConfig, FrigateConfig
from frigate.const import (
    AUDIO_DETECTOR,
    AUDIO_DURATION,
    AUDIO_FORMAT,
    AUDIO_SAMPLE_RATE,
    CACHE_DIR,
)
from frigate.detectors.plugins.audio_tfl import AudioTfl
from frigate.util import listen

logger = logging.getLogger(__name__)

FFMPEG_COMMAND = (
    f"ffmpeg -vn -i {{}} -f {AUDIO_FORMAT} -ar {AUDIO_SAMPLE_RATE} -ac 1 -y {{}}"
)


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
        self.detector = AudioTfl()
        self.shape = (int(round(AUDIO_DURATION * AUDIO_SAMPLE_RATE)),)
        self.chunk_size = int(round(AUDIO_DURATION * AUDIO_SAMPLE_RATE * 2))
        self.pipe = f"{CACHE_DIR}/{self.config.name}-audio"
        self.ffmpeg_command = FFMPEG_COMMAND.format(
            [i.path for i in self.config.ffmpeg.inputs if "audio" in i.roles][0],
            self.pipe,
        )
        self.pipe_file = None
        self.audio_listener = None

    def detect_audio(self, audio) -> None:
        waveform = (audio / 32768.0).astype(np.float32)
        model_detections = self.detector.detect(waveform)

        for label, score, _ in model_detections:
            if label not in self.config.audio.listen:
                continue

        logger.error(f"Detected audio: {label} with score {score}")
        # TODO handle valid detect

    def init_ffmpeg(self) -> None:
        logger.error(f"Starting audio ffmpeg")
        self.pipe_file = open(self.pipe, "rb")
        self.audio_listener = sp.run(self.ffmpeg_command)

    def read_audio(self) -> None:
        try:
            audio = self.pipe_file.read(self.chunk_size)
            self.detect_audio(audio)
        except BrokenPipeError as e:
            logger.error(f"There was a broken pipe :: {e}")
            # TODO fix broken pipe
            pass

    def run(self) -> None:
        self.init_ffmpeg()

        while not self.stop_event.is_set():
            self.read_audio()
