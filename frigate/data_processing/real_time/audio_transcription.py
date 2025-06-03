"""Handle processing audio for speech transcription using sherpa-onnx with FFmpeg pipe."""

import logging
import os
import queue
import threading
from typing import Optional

import numpy as np

from frigate.comms.inter_process import InterProcessRequestor
from frigate.config import CameraConfig, FrigateConfig
from frigate.const import MODEL_CACHE_DIR
from frigate.data_processing.common.audio_transcription.model import (
    AudioTranscriptionModelRunner,
)
from frigate.data_processing.real_time.whisper_online import (
    FasterWhisperASR,
    OnlineASRProcessor,
)

from ..types import DataProcessorMetrics
from .api import RealTimeProcessorApi

logger = logging.getLogger(__name__)


class AudioTranscriptionRealTimeProcessor(RealTimeProcessorApi):
    def __init__(
        self,
        config: FrigateConfig,
        camera_config: CameraConfig,
        requestor: InterProcessRequestor,
        model_runner: AudioTranscriptionModelRunner,
        metrics: DataProcessorMetrics,
        stop_event: threading.Event,
    ):
        super().__init__(config, metrics)
        self.config = config
        self.camera_config = camera_config
        self.requestor = requestor
        self.stream = None
        self.whisper_model = None
        self.model_runner = model_runner
        self.transcription_segments = []
        self.audio_queue = queue.Queue()
        self.stop_event = stop_event

    def __build_recognizer(self) -> None:
        try:
            if self.config.audio_transcription.model_size == "large":
                # Whisper models need to be per-process and can only run one stream at a time
                # TODO: try parallel: https://github.com/SYSTRAN/faster-whisper/issues/100
                logger.debug(f"Loading Whisper model for {self.camera_config.name}")
                self.whisper_model = FasterWhisperASR(
                    modelsize="tiny",
                    device="cuda"
                    if self.config.audio_transcription.device == "GPU"
                    else "cpu",
                    lan=self.config.audio_transcription.language,
                    model_dir=os.path.join(MODEL_CACHE_DIR, "whisper"),
                )
                self.whisper_model.use_vad()
                self.stream = OnlineASRProcessor(
                    asr=self.whisper_model,
                )
            else:
                logger.debug(f"Loading sherpa stream for {self.camera_config.name}")
                self.stream = self.model_runner.model.create_stream()
            logger.debug(
                f"Audio transcription (live) initialized for {self.camera_config.name}"
            )
        except Exception as e:
            logger.error(
                f"Failed to initialize live streaming audio transcription: {e}"
            )

    def __process_audio_stream(
        self, audio_data: np.ndarray
    ) -> Optional[tuple[str, bool]]:
        if (
            self.model_runner.model is None
            and self.config.audio_transcription.model_size == "small"
        ):
            logger.debug("Audio transcription (live) model not initialized")
            return None

        if not self.stream:
            self.__build_recognizer()

        try:
            if audio_data.dtype != np.float32:
                audio_data = audio_data.astype(np.float32)

            if audio_data.max() > 1.0 or audio_data.min() < -1.0:
                audio_data = audio_data / 32768.0  # Normalize from int16

            rms = float(np.sqrt(np.mean(np.absolute(np.square(audio_data)))))
            logger.debug(f"Audio chunk size: {audio_data.size}, RMS: {rms:.4f}")

            if self.config.audio_transcription.model_size == "large":
                # large model
                self.stream.insert_audio_chunk(audio_data)
                output = self.stream.process_iter()
                text = output[2].strip()
                is_endpoint = (
                    text.endswith((".", "!", "?"))
                    and sum(len(str(lines)) for lines in self.transcription_segments)
                    > 300
                )

                if text:
                    self.transcription_segments.append(text)
                concatenated_text = " ".join(self.transcription_segments)
                logger.debug(f"Concatenated transcription: '{concatenated_text}'")
                text = concatenated_text

            else:
                # small model
                self.stream.accept_waveform(16000, audio_data)

                while self.model_runner.model.is_ready(self.stream):
                    self.model_runner.model.decode_stream(self.stream)

                text = self.model_runner.model.get_result(self.stream).strip()
                is_endpoint = self.model_runner.model.is_endpoint(self.stream)

            logger.debug(f"Transcription result: '{text}'")

            if not text:
                logger.debug("No transcription, returning")
                return None

            logger.debug(f"Endpoint detected: {is_endpoint}")

            if is_endpoint and self.config.audio_transcription.model_size == "small":
                # reset sherpa if we've reached an endpoint
                self.model_runner.model.reset(self.stream)

            return text, is_endpoint
        except Exception as e:
            logger.error(f"Error processing audio stream: {e}")
            return None

    def process_frame(self, obj_data: dict[str, any], frame: np.ndarray) -> None:
        pass

    def process_audio(self, obj_data: dict[str, any], audio: np.ndarray) -> bool | None:
        if audio is None or audio.size == 0:
            logger.debug("No audio data provided for transcription")
            return None

        # enqueue audio data for processing in the thread
        self.audio_queue.put((obj_data, audio))
        return None

    def run(self) -> None:
        """Run method for the transcription thread to process queued audio data."""
        logger.debug(
            f"Starting audio transcription thread for {self.camera_config.name}"
        )

        # start with an empty transcription
        self.requestor.send_data(
            f"{self.camera_config.name}/audio/transcription",
            "",
        )

        while not self.stop_event.is_set():
            try:
                # Get audio data from queue with a timeout to check stop_event
                _, audio = self.audio_queue.get(timeout=0.1)
                result = self.__process_audio_stream(audio)

                if not result:
                    continue

                text, is_endpoint = result
                logger.debug(f"Transcribed audio: '{text}', Endpoint: {is_endpoint}")

                self.requestor.send_data(
                    f"{self.camera_config.name}/audio/transcription", text
                )

                self.audio_queue.task_done()

                if is_endpoint:
                    self.reset()

            except queue.Empty:
                continue
            except Exception as e:
                logger.error(f"Error processing audio in thread: {e}")
                self.audio_queue.task_done()

        logger.debug(
            f"Stopping audio transcription thread for {self.camera_config.name}"
        )

    def clear_audio_queue(self) -> None:
        # Clear the audio queue
        while not self.audio_queue.empty():
            try:
                self.audio_queue.get_nowait()
                self.audio_queue.task_done()
            except queue.Empty:
                break

    def reset(self) -> None:
        if self.config.audio_transcription.model_size == "large":
            # get final output from whisper
            output = self.stream.finish()
            self.transcription_segments = []

            self.requestor.send_data(
                f"{self.camera_config.name}/audio/transcription",
                (output[2].strip() + " "),
            )

            # reset whisper
            self.stream.init()
            self.transcription_segments = []
        else:
            # reset sherpa
            self.model_runner.model.reset(self.stream)

        logger.debug("Stream reset")

    def check_unload_model(self) -> None:
        # regularly called in the loop in audio maintainer
        if (
            self.config.audio_transcription.model_size == "large"
            and self.whisper_model is not None
        ):
            logger.debug(f"Unloading Whisper model for {self.camera_config.name}")
            self.clear_audio_queue()
            self.transcription_segments = []
            self.stream = None
            self.whisper_model = None

            self.requestor.send_data(
                f"{self.camera_config.name}/audio/transcription",
                "",
            )
        if (
            self.config.audio_transcription.model_size == "small"
            and self.stream is not None
        ):
            logger.debug(f"Clearing sherpa stream for {self.camera_config.name}")
            self.stream = None

            self.requestor.send_data(
                f"{self.camera_config.name}/audio/transcription",
                "",
            )

    def stop(self) -> None:
        """Stop the transcription thread and clean up."""
        self.stop_event.set()
        # Clear the queue to prevent processing stale data
        while not self.audio_queue.empty():
            try:
                self.audio_queue.get_nowait()
                self.audio_queue.task_done()
            except queue.Empty:
                break
        logger.debug(
            f"Transcription thread stop signaled for {self.camera_config.name}"
        )

    def handle_request(
        self, topic: str, request_data: dict[str, any]
    ) -> dict[str, any] | None:
        if topic == "clear_audio_recognizer":
            self.stream = None
            self.__build_recognizer()
            return {"message": "Audio recognizer cleared and rebuilt", "success": True}
        return None

    def expire_object(self, object_id: str) -> None:
        pass
