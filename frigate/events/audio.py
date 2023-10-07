"""Handle creating audio events."""

import datetime
import logging
import multiprocessing as mp
import signal
import threading
import time
from types import FrameType
from typing import Optional, Tuple

import numpy as np
import requests
from setproctitle import setproctitle

from frigate.comms.inter_process import InterProcessCommunicator
from frigate.config import CameraConfig, FrigateConfig
from frigate.const import (
    AUDIO_DURATION,
    AUDIO_FORMAT,
    AUDIO_MAX_BIT_RANGE,
    AUDIO_MIN_CONFIDENCE,
    AUDIO_SAMPLE_RATE,
    FRIGATE_LOCALHOST,
)
from frigate.ffmpeg_presets import parse_preset_input
from frigate.log import LogPipe
from frigate.object_detection import load_labels
from frigate.types import FeatureMetricsTypes
from frigate.util.builtin import get_ffmpeg_arg_list
from frigate.util.services import listen
from frigate.video import start_or_restart_ffmpeg, stop_ffmpeg

try:
    from tflite_runtime.interpreter import Interpreter
except ModuleNotFoundError:
    from tensorflow.lite.python.interpreter import Interpreter

logger = logging.getLogger(__name__)


def get_ffmpeg_command(input_args: list[str], input_path: str) -> list[str]:
    return get_ffmpeg_arg_list(
        f"ffmpeg {{}} -i {{}} -f {AUDIO_FORMAT} -ar {AUDIO_SAMPLE_RATE} -ac 1 -y {{}}".format(
            " ".join(input_args),
            input_path,
            "pipe:",
        )
    )


def listen_to_audio(
    config: FrigateConfig,
    recordings_info_queue: mp.Queue,
    process_info: dict[str, FeatureMetricsTypes],
    inter_process_communicator: InterProcessCommunicator,
) -> None:
    stop_event = mp.Event()
    audio_threads: list[threading.Thread] = []

    def exit_process() -> None:
        for thread in audio_threads:
            thread.join()

        logger.info("Exiting audio detector...")

    def receiveSignal(signalNumber: int, frame: Optional[FrameType]) -> None:
        stop_event.set()
        exit_process()

    signal.signal(signal.SIGTERM, receiveSignal)
    signal.signal(signal.SIGINT, receiveSignal)

    threading.current_thread().name = "process:audio_manager"
    setproctitle("frigate.audio_manager")
    listen()

    for camera in config.cameras.values():
        if camera.enabled and camera.audio.enabled_in_config:
            audio = AudioEventMaintainer(
                camera,
                recordings_info_queue,
                process_info,
                stop_event,
                inter_process_communicator,
            )
            audio_threads.append(audio)
            audio.start()


class AudioTfl:
    def __init__(self, stop_event: mp.Event, num_threads=2):
        self.stop_event = stop_event
        self.num_threads = num_threads
        self.labels = load_labels("/audio-labelmap.txt", prefill=521)
        self.interpreter = Interpreter(
            model_path="/cpu_audio_model.tflite",
            num_threads=self.num_threads,
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
            if scores[i] < AUDIO_MIN_CONFIDENCE or i == 20:
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

    def detect(self, tensor_input, threshold=AUDIO_MIN_CONFIDENCE):
        detections = []

        if self.stop_event.is_set():
            return detections

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
        self,
        camera: CameraConfig,
        recordings_info_queue: mp.Queue,
        feature_metrics: dict[str, FeatureMetricsTypes],
        stop_event: mp.Event,
        inter_process_communicator: InterProcessCommunicator,
    ) -> None:
        threading.Thread.__init__(self)
        self.name = f"{camera.name}_audio_event_processor"
        self.config = camera
        self.recordings_info_queue = recordings_info_queue
        self.feature_metrics = feature_metrics
        self.inter_process_communicator = inter_process_communicator
        self.detections: dict[dict[str, any]] = {}
        self.stop_event = stop_event
        self.detector = AudioTfl(stop_event, self.config.audio.num_threads)
        self.shape = (int(round(AUDIO_DURATION * AUDIO_SAMPLE_RATE)),)
        self.chunk_size = int(round(AUDIO_DURATION * AUDIO_SAMPLE_RATE * 2))
        self.logger = logging.getLogger(f"audio.{self.config.name}")
        self.ffmpeg_cmd = get_ffmpeg_command(
            get_ffmpeg_arg_list(self.config.ffmpeg.global_args)
            + parse_preset_input("preset-rtsp-audio-only", 1),
            [i.path for i in self.config.ffmpeg.inputs if "audio" in i.roles][0],
        )
        self.logpipe = LogPipe(f"ffmpeg.{self.config.name}.audio")
        self.audio_listener = None

    def detect_audio(self, audio) -> None:
        if not self.feature_metrics[self.config.name]["audio_enabled"].value:
            return

        audio_as_float = audio.astype(np.float32)
        rms, dBFS = self.calculate_audio_levels(audio_as_float)

        # only run audio detection when volume is above min_volume
        if rms >= self.config.audio.min_volume:
            # add audio info to recordings queue
            self.recordings_info_queue.put(
                (self.config.name, datetime.datetime.now().timestamp(), dBFS)
            )

            # create waveform relative to max range and look for detections
            waveform = (audio / AUDIO_MAX_BIT_RANGE).astype(np.float32)
            model_detections = self.detector.detect(waveform)

            for label, score, _ in model_detections:
                logger.debug(f"Heard {label} with a score of {score}")

                if label not in self.config.audio.listen:
                    continue

                if score > dict((self.config.audio.filters or {}).get(label, {})).get(
                    "threshold", 0.8
                ):
                    self.handle_detection(label, score)

        self.expire_detections()

    def calculate_audio_levels(self, audio_as_float: np.float32) -> Tuple[float, float]:
        # Calculate RMS (Root-Mean-Square) which represents the average signal amplitude
        # Note: np.float32 isn't serializable, we must use np.float64 to publish the message
        rms = np.sqrt(np.mean(np.absolute(np.square(audio_as_float))))

        # Transform RMS to dBFS (decibels relative to full scale)
        dBFS = 20 * np.log10(np.abs(rms) / AUDIO_MAX_BIT_RANGE)

        self.inter_process_communicator.queue.put(
            (f"{self.config.name}/audio/dBFS", float(dBFS))
        )
        self.inter_process_communicator.queue.put(
            (f"{self.config.name}/audio/rms", float(rms))
        )

        return float(rms), float(dBFS)

    def handle_detection(self, label: str, score: float) -> None:
        if self.detections.get(label):
            self.detections[label][
                "last_detection"
            ] = datetime.datetime.now().timestamp()
        else:
            self.inter_process_communicator.queue.put(
                (f"{self.config.name}/audio/{label}", "ON")
            )

            resp = requests.post(
                f"{FRIGATE_LOCALHOST}/api/events/{self.config.name}/{label}/create",
                json={"duration": None, "score": score, "source_type": "audio"},
            )

            if resp.status_code == 200:
                event_id = resp.json()["event_id"]
                self.detections[label] = {
                    "id": event_id,
                    "label": label,
                    "last_detection": datetime.datetime.now().timestamp(),
                }

    def expire_detections(self) -> None:
        now = datetime.datetime.now().timestamp()

        for detection in self.detections.values():
            if not detection:
                continue

            if (
                now - detection.get("last_detection", now)
                > self.config.audio.max_not_heard
            ):
                self.inter_process_communicator.queue.put(
                    (f"{self.config.name}/audio/{detection['label']}", "OFF")
                )

                resp = requests.put(
                    f"{FRIGATE_LOCALHOST}/api/events/{detection['id']}/end",
                    json={
                        "end_time": detection["last_detection"]
                        + self.config.record.events.post_capture
                    },
                )

                if resp.status_code == 200:
                    self.detections[detection["label"]] = None
                else:
                    self.logger.warn(
                        f"Failed to end audio event {detection['id']} with status code {resp.status_code}"
                    )

    def start_or_restart_ffmpeg(self) -> None:
        self.audio_listener = start_or_restart_ffmpeg(
            self.ffmpeg_cmd,
            self.logger,
            self.logpipe,
            self.chunk_size,
            self.audio_listener,
        )

    def read_audio(self) -> None:
        def log_and_restart() -> None:
            if self.stop_event.is_set():
                return

            time.sleep(self.config.ffmpeg.retry_interval)
            self.logpipe.dump()
            self.start_or_restart_ffmpeg()

        try:
            chunk = self.audio_listener.stdout.read(self.chunk_size)

            if not chunk:
                if self.audio_listener.poll() is not None:
                    self.logger.error("ffmpeg process is not running, restarting...")
                    log_and_restart()
                    return

                return

            audio = np.frombuffer(chunk, dtype=np.int16)
            self.detect_audio(audio)
        except Exception as e:
            self.logger.error(f"Error reading audio data from ffmpeg process: {e}")
            log_and_restart()

    def run(self) -> None:
        self.start_or_restart_ffmpeg()

        while not self.stop_event.is_set():
            self.read_audio()

        stop_ffmpeg(self.audio_listener, self.logger)
        self.logpipe.close()
