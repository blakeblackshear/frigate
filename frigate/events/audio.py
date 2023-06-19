"""Handle creating audio events."""

import datetime
import logging
import multiprocessing as mp
import numpy as np
import os
import random
import signal
import string
import subprocess as sp
import threading
from types import FrameType
from typing import Optional

from setproctitle import setproctitle

from frigate.config import CameraConfig, FrigateConfig
from frigate.const import (
    AUDIO_DETECTOR,
    AUDIO_DURATION,
    AUDIO_FORMAT,
    AUDIO_SAMPLE_RATE,
    CACHE_DIR,
)
from frigate.events.maintainer import EventTypeEnum
from frigate.ffmpeg_presets import parse_preset_input
from frigate.object_detection import load_labels
from frigate.util import get_ffmpeg_arg_list, listen

try:
    from tflite_runtime.interpreter import Interpreter
except ModuleNotFoundError:
    from tensorflow.lite.python.interpreter import Interpreter

logger = logging.getLogger(__name__)

FFMPEG_COMMAND = (
    f"ffmpeg {{}} -i {{}} -f {AUDIO_FORMAT} -ar {AUDIO_SAMPLE_RATE} -ac 1 -y {{}}"
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
            AudioEventMaintainer(camera, event_queue, stop_event).start()


class AudioTfl:
    def __init__(self):
        self.labels = load_labels("/audio-labelmap.txt")
        self.interpreter = Interpreter(
            model_path="/cpu_audio_model.tflite",
            num_threads=2,
        )

        self.interpreter.allocate_tensors()

        self.tensor_input_details = self.interpreter.get_input_details()
        self.tensor_output_details = self.interpreter.get_output_details()

    def _detect_raw(self, tensor_input):
        self.interpreter.set_tensor(self.tensor_input_details[0]["index"], tensor_input)
        self.interpreter.invoke()
        detections = np.zeros((20, 6), np.float32)

        res = self.interpreter.get_tensor(self.tensor_output_details[0]["index"])[0]
        non_zero_indices = res > 0
        class_ids = np.argpartition(-res, 20)[:20]
        class_ids = class_ids[np.argsort(-res[class_ids])]
        class_ids = class_ids[non_zero_indices[class_ids]]
        scores = res[class_ids]
        boxes = np.full((scores.shape[0], 4), -1, np.float32)
        count = len(scores)

        for i in range(count):
            if scores[i] < 0.4 or i == 20:
                break
            detections[i] = [
                class_ids[i],
                float(scores[i]),
                boxes[i][0],
                boxes[i][1],
                boxes[i][2],
                boxes[i][3],
            ]

        return detections

    def detect(self, tensor_input, threshold=0.8):
        detections = []

        raw_detections = self._detect_raw(tensor_input)

        for d in raw_detections:
            if d[1] < threshold:
                break
            detections.append(
                (self.labels[int(d[0])], float(d[1]), (d[2], d[3], d[4], d[5]))
            )
        return detections


class AudioEventMaintainer(threading.Thread):
    def __init__(
        self, camera: CameraConfig, event_queue: mp.Queue, stop_event: mp.Event
    ) -> None:
        threading.Thread.__init__(self)
        self.name = f"{camera.name}_audio_event_processor"
        self.config = camera
        self.queue = event_queue
        self.detections: dict[dict[str, any]] = {}
        self.stop_event = stop_event
        self.detector = AudioTfl()
        self.shape = (int(round(AUDIO_DURATION * AUDIO_SAMPLE_RATE)),)
        self.chunk_size = int(round(AUDIO_DURATION * AUDIO_SAMPLE_RATE * 2))
        self.pipe = f"{CACHE_DIR}/{self.config.name}-audio"
        self.ffmpeg_cmd = get_ffmpeg_arg_list(
            FFMPEG_COMMAND.format(
                " ".join(
                    self.config.ffmpeg.global_args
                    + parse_preset_input("preset-rtsp-audio-only", 1)
                ),
                [i.path for i in self.config.ffmpeg.inputs if "audio" in i.roles][0],
                self.pipe,
            )
        )
        self.pipe_file = None
        self.audio_listener = None

    def detect_audio(self, audio) -> None:
        waveform = (audio / 32768.0).astype(np.float32)
        model_detections = self.detector.detect(waveform)

        for label, score, _ in model_detections:
            if label not in self.config.audio.listen:
                continue

            self.handle_detection(label, score)

        self.expire_detections()

    def handle_detection(self, label: str, score: float) -> None:
        if self.detections.get(label) is not None:
            self.detections[label][
                "last_detection"
            ] = datetime.datetime.now().timestamp()
        else:
            now = datetime.datetime.now().timestamp()
            rand_id = "".join(
                random.choices(string.ascii_lowercase + string.digits, k=6)
            )
            event_id = f"{now}-{rand_id}"
            self.detections[label] = {
                "id": event_id,
                "label": label,
                "camera": self.config.name,
                "start_time": now - self.config.record.events.pre_capture,
                "last_detection": now,
            }
            self.queue.put(
                (EventTypeEnum.audio, "start", self.config.name, self.detections[label])
            )

    def expire_detections(self) -> None:
        now = datetime.datetime.now().timestamp()

        for detection in self.detections.values():
            if now - detection["last_detection"] > self.config.audio.max_not_heard:
                detection["end_time"] = (
                    detection["last_detection"] + self.config.record.events.post_capture
                )
                self.queue.put(
                    (EventTypeEnum.audio, "end", self.config.name, detection)
                )

    def init_ffmpeg(self) -> None:
        try:
            os.mkfifo(self.pipe)
        except FileExistsError:
            pass

        self.audio_listener = sp.Popen(
            self.ffmpeg_cmd,
            stdout=sp.DEVNULL,
            stdin=sp.DEVNULL,
            start_new_session=True,
        )

    def read_audio(self) -> None:
        if self.pipe_file is None:
            self.pipe_file = open(self.pipe, "rb")

        try:
            audio = np.frombuffer(self.pipe_file.read(self.chunk_size), dtype=np.int16)
            self.detect_audio(audio)
        except BrokenPipeError as e:
            logger.error(f"There was a broken pipe :: {e}")
            # TODO fix broken pipe
            pass

    def run(self) -> None:
        self.init_ffmpeg()

        while not self.stop_event.is_set():
            self.read_audio()
