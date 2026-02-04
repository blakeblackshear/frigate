"""Handle creating audio events."""

import datetime
import logging
import threading
import time
from multiprocessing.managers import DictProxy
from multiprocessing.synchronize import Event as MpEvent
from typing import Tuple

import numpy as np

from frigate.comms.detections_updater import DetectionPublisher, DetectionTypeEnum
from frigate.comms.inter_process import InterProcessRequestor
from frigate.config import CameraConfig, CameraInput, FfmpegConfig, FrigateConfig
from frigate.config.camera.updater import (
    CameraConfigUpdateEnum,
    CameraConfigUpdateSubscriber,
)
from frigate.const import (
    AUDIO_DURATION,
    AUDIO_FORMAT,
    AUDIO_MAX_BIT_RANGE,
    AUDIO_MIN_CONFIDENCE,
    AUDIO_SAMPLE_RATE,
    EXPIRE_AUDIO_ACTIVITY,
    PROCESS_PRIORITY_HIGH,
    UPDATE_AUDIO_ACTIVITY,
)
from frigate.data_processing.common.audio_transcription.model import (
    AudioTranscriptionModelRunner,
)
from frigate.data_processing.real_time.audio_transcription import (
    AudioTranscriptionRealTimeProcessor,
)
from frigate.ffmpeg_presets import parse_preset_input
from frigate.log import LogPipe, suppress_stderr_during
from frigate.object_detection.base import load_labels
from frigate.util.builtin import get_ffmpeg_arg_list
from frigate.util.process import FrigateProcess
from frigate.video import start_or_restart_ffmpeg, stop_ffmpeg

try:
    from tflite_runtime.interpreter import Interpreter
except ModuleNotFoundError:
    from ai_edge_litert.interpreter import Interpreter


logger = logging.getLogger(__name__)


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


class AudioProcessor(FrigateProcess):
    name = "frigate.audio_manager"

    def __init__(
        self,
        config: FrigateConfig,
        cameras: list[CameraConfig],
        camera_metrics: DictProxy,
        stop_event: MpEvent,
    ):
        super().__init__(
            stop_event, PROCESS_PRIORITY_HIGH, name="frigate.audio_manager", daemon=True
        )

        self.camera_metrics = camera_metrics
        self.cameras = cameras
        self.config = config

    def run(self) -> None:
        self.pre_run_setup(self.config.logger)
        audio_threads: list[AudioEventMaintainer] = []

        threading.current_thread().name = "process:audio_manager"

        if self.config.audio_transcription.enabled:
            self.transcription_model_runner = AudioTranscriptionModelRunner(
                self.config.audio_transcription.device,
                self.config.audio_transcription.model_size,
            )
        else:
            self.transcription_model_runner = None

        if len(self.cameras) == 0:
            return

        for camera in self.cameras:
            audio_thread = AudioEventMaintainer(
                camera,
                self.config,
                self.camera_metrics,
                self.transcription_model_runner,
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
        config: FrigateConfig,
        camera_metrics: DictProxy,
        audio_transcription_model_runner: AudioTranscriptionModelRunner | None,
        stop_event: threading.Event,
    ) -> None:
        super().__init__(name=f"{camera.name}_audio_event_processor")

        self.config = config
        self.camera_config = camera
        self.camera_metrics = camera_metrics
        self.stop_event = stop_event
        self.detector = AudioTfl(stop_event, self.camera_config.audio.num_threads)
        self.shape = (int(round(AUDIO_DURATION * AUDIO_SAMPLE_RATE)),)
        self.chunk_size = int(round(AUDIO_DURATION * AUDIO_SAMPLE_RATE * 2))
        self.logger = logging.getLogger(f"audio.{self.camera_config.name}")
        self.ffmpeg_cmd = get_ffmpeg_command(self.camera_config.ffmpeg)
        self.logpipe = LogPipe(f"ffmpeg.{self.camera_config.name}.audio")
        self.audio_listener = None
        self.audio_transcription_model_runner = audio_transcription_model_runner
        self.transcription_processor = None
        self.transcription_thread = None

        # create communication for audio detections
        self.requestor = InterProcessRequestor()
        self.config_subscriber = CameraConfigUpdateSubscriber(
            None,
            {self.camera_config.name: self.camera_config},
            [
                CameraConfigUpdateEnum.audio,
                CameraConfigUpdateEnum.enabled,
                CameraConfigUpdateEnum.audio_transcription,
            ],
        )
        self.detection_publisher = DetectionPublisher(DetectionTypeEnum.audio.value)

        if self.config.audio_transcription.enabled:
            # init the transcription processor for this camera
            self.transcription_processor = AudioTranscriptionRealTimeProcessor(
                config=self.config,
                camera_config=self.camera_config,
                requestor=self.requestor,
                model_runner=self.audio_transcription_model_runner,
                metrics=self.camera_metrics[self.camera_config.name],
                stop_event=self.stop_event,
            )

            self.transcription_thread = threading.Thread(
                target=self.transcription_processor.run,
                name=f"{self.camera_config.name}_transcription_processor",
                daemon=True,
            )
            self.transcription_thread.start()

        self.was_enabled = camera.enabled

    def detect_audio(self, audio) -> None:
        if not self.camera_config.audio.enabled or self.stop_event.is_set():
            return

        audio_as_float = audio.astype(np.float32)
        rms, dBFS = self.calculate_audio_levels(audio_as_float)

        self.camera_metrics[self.camera_config.name].audio_rms.value = rms
        self.camera_metrics[self.camera_config.name].audio_dBFS.value = dBFS

        audio_detections: list[Tuple[str, float]] = []

        # only run audio detection when volume is above min_volume
        if rms >= self.camera_config.audio.min_volume:
            # create waveform relative to max range and look for detections
            waveform = (audio / AUDIO_MAX_BIT_RANGE).astype(np.float32)
            model_detections = self.detector.detect(waveform)

            for label, score, _ in model_detections:
                self.logger.debug(
                    f"{self.camera_config.name} heard {label} with a score of {score}"
                )

                if label not in self.camera_config.audio.listen:
                    continue

                if score > dict(
                    (self.camera_config.audio.filters or {}).get(label, {})
                ).get("threshold", 0.8):
                    audio_detections.append((label, score))

            # send audio detection data
            self.detection_publisher.publish(
                (
                    self.camera_config.name,
                    datetime.datetime.now().timestamp(),
                    dBFS,
                    [label for label, _ in audio_detections],
                )
            )

        # send audio activity update
        self.requestor.send_data(
            UPDATE_AUDIO_ACTIVITY,
            {self.camera_config.name: {"detections": audio_detections}},
        )

        # run audio transcription
        if self.transcription_processor is not None:
            if self.camera_config.audio_transcription.live_enabled:
                # process audio until we've reached the endpoint
                self.transcription_processor.process_audio(
                    {
                        "id": f"{self.camera_config.name}_audio",
                        "camera": self.camera_config.name,
                    },
                    audio,
                )
            else:
                self.transcription_processor.check_unload_model()

    def calculate_audio_levels(self, audio_as_float: np.float32) -> Tuple[float, float]:
        # Calculate RMS (Root-Mean-Square) which represents the average signal amplitude
        # Note: np.float32 isn't serializable, we must use np.float64 to publish the message
        rms = np.sqrt(np.mean(np.absolute(np.square(audio_as_float))))

        # Transform RMS to dBFS (decibels relative to full scale)
        if rms > 0:
            dBFS = 20 * np.log10(np.abs(rms) / AUDIO_MAX_BIT_RANGE)
        else:
            dBFS = 0

        self.requestor.send_data(f"{self.camera_config.name}/audio/dBFS", float(dBFS))
        self.requestor.send_data(f"{self.camera_config.name}/audio/rms", float(rms))

        return float(rms), float(dBFS)

    def start_or_restart_ffmpeg(self) -> None:
        self.audio_listener = start_or_restart_ffmpeg(
            self.ffmpeg_cmd,
            self.logger,
            self.logpipe,
            self.chunk_size,
            self.audio_listener,
        )
        self.requestor.send_data(f"{self.camera_config.name}/status/audio", "online")

    def read_audio(self) -> None:
        def log_and_restart() -> None:
            if self.stop_event.is_set():
                return

            time.sleep(self.camera_config.ffmpeg.retry_interval)
            self.logpipe.dump()
            self.start_or_restart_ffmpeg()

        try:
            chunk = self.audio_listener.stdout.read(self.chunk_size)

            if not chunk:
                if self.audio_listener.poll() is not None:
                    self.requestor.send_data(
                        f"{self.camera_config.name}/status/audio", "offline"
                    )
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
        if self.camera_config.enabled:
            self.start_or_restart_ffmpeg()

        while not self.stop_event.is_set():
            enabled = self.camera_config.enabled
            if enabled != self.was_enabled:
                if enabled:
                    self.logger.debug(
                        f"Enabling audio detections for {self.camera_config.name}"
                    )
                    self.start_or_restart_ffmpeg()
                else:
                    self.requestor.send_data(
                        f"{self.camera_config.name}/status/audio", "disabled"
                    )
                    self.logger.debug(
                        f"Disabling audio detections for {self.camera_config.name}, ending events"
                    )
                    self.requestor.send_data(
                        EXPIRE_AUDIO_ACTIVITY, self.camera_config.name
                    )
                    stop_ffmpeg(self.audio_listener, self.logger)
                    self.audio_listener = None
                self.was_enabled = enabled
                continue

            if not enabled:
                time.sleep(0.1)
                continue

            # check if there is an updated config
            self.config_subscriber.check_for_updates()

            self.read_audio()

        if self.audio_listener:
            stop_ffmpeg(self.audio_listener, self.logger)
        if self.transcription_thread:
            self.transcription_thread.join(timeout=2)
            if self.transcription_thread.is_alive():
                self.logger.warning(
                    f"Audio transcription thread {self.transcription_thread.name} is still alive"
                )
        self.logpipe.close()
        self.requestor.stop()
        self.config_subscriber.stop()
        self.detection_publisher.stop()


class AudioTfl:
    def __init__(self, stop_event: threading.Event, num_threads=2):
        self.stop_event = stop_event
        self.num_threads = num_threads
        self.labels = load_labels("/audio-labelmap.txt", prefill=521)
        # Suppress TFLite delegate creation messages that bypass Python logging
        with suppress_stderr_during("tflite_interpreter_init"):
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
