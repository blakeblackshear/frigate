"""Handle creating audio events."""

import datetime
import logging
import threading
import time
from typing import Tuple

import numpy as np
import requests

import frigate.util as util
from frigate.camera import CameraMetrics
from frigate.comms.config_updater import ConfigSubscriber
from frigate.comms.detections_updater import DetectionPublisher, DetectionTypeEnum
from frigate.comms.inter_process import InterProcessRequestor
from frigate.config import CameraConfig, CameraInput, FfmpegConfig
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
from frigate.util.builtin import get_ffmpeg_arg_list
from frigate.video import start_or_restart_ffmpeg, stop_ffmpeg

try:
    from tflite_runtime.interpreter import Interpreter
except ModuleNotFoundError:
    from tensorflow.lite.python.interpreter import Interpreter


def get_ffmpeg_command(ffmpeg: FfmpegConfig) -> list[str]:
    ffmpeg_input: CameraInput = [i for i in ffmpeg.inputs if "audio" in i.roles][0]
    input_args = get_ffmpeg_arg_list(ffmpeg.global_args) + (
        parse_preset_input(ffmpeg_input.input_args, 1)
        or get_ffmpeg_arg_list(ffmpeg_input.input_args)
        or parse_preset_input(ffmpeg.input_args, 1)
        or get_ffmpeg_arg_list(ffmpeg.input_args)
    )
    return (
        [ffmpeg.ffmpeg_path, "-vn", "-threads", "1"]
        + input_args
        + ["-i"]
        + [ffmpeg_input.path]
        + [
            "-threads",
            "1",
            "-f",
            f"{AUDIO_FORMAT}",
            "-ar",
            f"{AUDIO_SAMPLE_RATE}",
            "-ac",
            "1",
            "-y",
            "pipe:",
        ]
    )


class AudioProcessor(util.Process):
    def __init__(
        self,
        cameras: list[CameraConfig],
        camera_metrics: dict[str, CameraMetrics],
    ):
        super().__init__(name="frigate.audio_manager", daemon=True)

        self.camera_metrics = camera_metrics
        self.cameras = cameras

    def run(self) -> None:
        audio_threads: list[AudioEventMaintainer] = []

        threading.current_thread().name = "process:audio_manager"

        if len(self.cameras) == 0:
            return

        for camera in self.cameras:
            audio_thread = AudioEventMaintainer(
                camera,
                self.camera_metrics,
                self.stop_event,
            )
            audio_threads.append(audio_thread)
            audio_thread.start()

        self.logger.info(f"Audio processor started (pid: {self.pid})")

        while not self.stop_event.wait():
            pass

        for thread in audio_threads:
            thread.join(1)
            if thread.is_alive():
                self.logger.info(f"Waiting for thread {thread.name:s} to exit")
                thread.join(10)

        for thread in audio_threads:
            if thread.is_alive():
                self.logger.warning(f"Thread {thread.name} is still alive")

        self.logger.info("Exiting audio processor")


class AudioEventMaintainer(threading.Thread):
    def __init__(
        self,
        camera: CameraConfig,
        camera_metrics: dict[str, CameraMetrics],
        stop_event: threading.Event,
    ) -> None:
        super().__init__(name=f"{camera.name}_audio_event_processor")

        self.config = camera
        self.camera_metrics = camera_metrics
        self.detections: dict[dict[str, any]] = {}
        self.stop_event = stop_event
        self.detector = AudioTfl(stop_event, self.config.audio.num_threads)
        self.shape = (int(round(AUDIO_DURATION * AUDIO_SAMPLE_RATE)),)
        self.chunk_size = int(round(AUDIO_DURATION * AUDIO_SAMPLE_RATE * 2))
        self.logger = logging.getLogger(f"audio.{self.config.name}")
        self.ffmpeg_cmd = get_ffmpeg_command(self.config.ffmpeg)
        self.logpipe = LogPipe(f"ffmpeg.{self.config.name}.audio")
        self.audio_listener = None

        # create communication for audio detections
        self.requestor = InterProcessRequestor()
        self.config_subscriber = ConfigSubscriber(f"config/audio/{camera.name}")
        self.detection_publisher = DetectionPublisher(DetectionTypeEnum.audio)

    def detect_audio(self, audio) -> None:
        if not self.config.audio.enabled or self.stop_event.is_set():
            return

        audio_as_float = audio.astype(np.float32)
        rms, dBFS = self.calculate_audio_levels(audio_as_float)

        self.camera_metrics[self.config.name].audio_rms.value = rms
        self.camera_metrics[self.config.name].audio_dBFS.value = dBFS

        # only run audio detection when volume is above min_volume
        if rms >= self.config.audio.min_volume:
            # create waveform relative to max range and look for detections
            waveform = (audio / AUDIO_MAX_BIT_RANGE).astype(np.float32)
            model_detections = self.detector.detect(waveform)
            audio_detections = []

            for label, score, _ in model_detections:
                self.logger.debug(
                    f"{self.config.name} heard {label} with a score of {score}"
                )

                if label not in self.config.audio.listen:
                    continue

                if score > dict((self.config.audio.filters or {}).get(label, {})).get(
                    "threshold", 0.8
                ):
                    self.handle_detection(label, score)
                    audio_detections.append(label)

            # send audio detection data
            self.detection_publisher.publish(
                (
                    self.config.name,
                    datetime.datetime.now().timestamp(),
                    dBFS,
                    audio_detections,
                )
            )

        self.expire_detections()

    def calculate_audio_levels(self, audio_as_float: np.float32) -> Tuple[float, float]:
        # Calculate RMS (Root-Mean-Square) which represents the average signal amplitude
        # Note: np.float32 isn't serializable, we must use np.float64 to publish the message
        rms = np.sqrt(np.mean(np.absolute(np.square(audio_as_float))))

        # Transform RMS to dBFS (decibels relative to full scale)
        if rms > 0:
            dBFS = 20 * np.log10(np.abs(rms) / AUDIO_MAX_BIT_RANGE)
        else:
            dBFS = 0

        self.requestor.send_data(f"{self.config.name}/audio/dBFS", float(dBFS))
        self.requestor.send_data(f"{self.config.name}/audio/rms", float(rms))

        return float(rms), float(dBFS)

    def handle_detection(self, label: str, score: float) -> None:
        if self.detections.get(label):
            self.detections[label]["last_detection"] = (
                datetime.datetime.now().timestamp()
            )
        else:
            self.requestor.send_data(f"{self.config.name}/audio/{label}", "ON")

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
                self.requestor.send_data(
                    f"{self.config.name}/audio/{detection['label']}", "OFF"
                )

                resp = requests.put(
                    f"{FRIGATE_LOCALHOST}/api/events/{detection['id']}/end",
                    json={"end_time": detection["last_detection"]},
                )

                if resp.status_code == 200:
                    self.detections[detection["label"]] = None
                else:
                    self.logger.warning(
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
            # check if there is an updated config
            (
                updated_topic,
                updated_audio_config,
            ) = self.config_subscriber.check_for_update()

            if updated_topic:
                self.config.audio = updated_audio_config

            self.read_audio()

        stop_ffmpeg(self.audio_listener, self.logger)
        self.logpipe.close()
        self.requestor.stop()
        self.config_subscriber.stop()
        self.detection_publisher.stop()


class AudioTfl:
    def __init__(self, stop_event: threading.Event, num_threads=2):
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
