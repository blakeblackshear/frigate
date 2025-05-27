"""Handle processing audio for speech transcription using sherpa-onnx with FFmpeg pipe."""

import logging
import os
import queue
import threading
from typing import Optional

import numpy as np
import sherpa_onnx

from frigate.comms.inter_process import InterProcessRequestor
from frigate.config import CameraConfig, FrigateConfig
from frigate.const import MODEL_CACHE_DIR
from frigate.util.downloader import ModelDownloader

from ..types import DataProcessorMetrics
from .api import RealTimeProcessorApi
from .whisper_online import FasterWhisperASR, OnlineASRProcessor

logger = logging.getLogger(__name__)


class AudioTranscriptionRealTimeProcessor(RealTimeProcessorApi):
    def __init__(
        self,
        config: FrigateConfig,
        camera_config: CameraConfig,
        requestor: InterProcessRequestor,
        metrics: DataProcessorMetrics,
        stop_event: threading.Event,
    ):
        super().__init__(config, metrics)
        self.config = config
        self.camera_config = camera_config
        self.requestor = requestor
        self.recognizer = None
        self.stream = None
        self.transcription_segments = []
        self.audio_queue = queue.Queue()
        self.stop_event = stop_event

        if self.config.audio_transcription.model_size == "large":
            self.asr = FasterWhisperASR(
                modelsize="tiny",
                device="cuda"
                if self.config.audio_transcription.device == "GPU"
                else "cpu",
                lan=config.audio_transcription.language,
                model_dir=os.path.join(MODEL_CACHE_DIR, "whisper"),
            )
            self.asr.use_vad()  # Enable Silero VAD for low-RMS audio

        else:
            # small model as default
            download_path = os.path.join(MODEL_CACHE_DIR, "sherpa-onnx")
            HF_ENDPOINT = os.environ.get("HF_ENDPOINT", "https://huggingface.co")
            self.model_files = {
                "encoder.onnx": f"{HF_ENDPOINT}/csukuangfj/sherpa-onnx-streaming-zipformer-en-2023-06-26/resolve/main/encoder-epoch-99-avg-1-chunk-16-left-128.onnx",
                "decoder.onnx": f"{HF_ENDPOINT}/csukuangfj/sherpa-onnx-streaming-zipformer-en-2023-06-26/resolve/main/decoder-epoch-99-avg-1-chunk-16-left-128.onnx",
                "joiner.onnx": f"{HF_ENDPOINT}/csukuangfj/sherpa-onnx-streaming-zipformer-en-2023-06-26/resolve/main/joiner-epoch-99-avg-1-chunk-16-left-128.onnx",
                "tokens.txt": f"{HF_ENDPOINT}/csukuangfj/sherpa-onnx-streaming-zipformer-en-2023-06-26/resolve/main/tokens.txt",
            }

            if not all(
                os.path.exists(os.path.join(download_path, n))
                for n in self.model_files.keys()
            ):
                self.downloader = ModelDownloader(
                    model_name="sherpa-onnx",
                    download_path=download_path,
                    file_names=self.model_files.keys(),
                    download_func=self.__download_models,
                    complete_func=self.__build_recognizer,
                )
                self.downloader.ensure_model_files()

        self.__build_recognizer()

    def __download_models(self, path: str) -> None:
        try:
            file_name = os.path.basename(path)
            ModelDownloader.download_from_url(self.model_files[file_name], path)
        except Exception as e:
            logger.error(f"Failed to download {path}: {e}")

    def __build_recognizer(self) -> None:
        try:
            if self.config.audio_transcription.model_size == "large":
                self.online = OnlineASRProcessor(
                    asr=self.asr,
                )
            else:
                self.recognizer = sherpa_onnx.OnlineRecognizer.from_transducer(
                    tokens=os.path.join(MODEL_CACHE_DIR, "sherpa-onnx/tokens.txt"),
                    encoder=os.path.join(MODEL_CACHE_DIR, "sherpa-onnx/encoder.onnx"),
                    decoder=os.path.join(MODEL_CACHE_DIR, "sherpa-onnx/decoder.onnx"),
                    joiner=os.path.join(MODEL_CACHE_DIR, "sherpa-onnx/joiner.onnx"),
                    num_threads=2,
                    sample_rate=16000,
                    feature_dim=80,
                    enable_endpoint_detection=True,
                    rule1_min_trailing_silence=2.4,
                    rule2_min_trailing_silence=1.2,
                    rule3_min_utterance_length=300,
                    decoding_method="greedy_search",
                    provider="cpu",
                )
                self.stream = self.recognizer.create_stream()
            logger.debug("Audio transcription (live) initialized")
        except Exception as e:
            logger.error(
                f"Failed to initialize live streaming audio transcription: {e}"
            )
            self.recognizer = None

    def __process_audio_stream(
        self, audio_data: np.ndarray
    ) -> Optional[tuple[str, bool]]:
        if (not self.recognizer or not self.stream) and not self.online:
            logger.debug(
                "Audio transcription (streaming) recognizer or stream not initialized"
            )
            return None

        try:
            if audio_data.dtype != np.float32:
                audio_data = audio_data.astype(np.float32)

            if audio_data.max() > 1.0 or audio_data.min() < -1.0:
                audio_data = audio_data / 32768.0  # Normalize from int16

            rms = float(np.sqrt(np.mean(np.absolute(np.square(audio_data)))))
            logger.debug(f"Audio chunk size: {audio_data.size}, RMS: {rms:.4f}")

            if self.config.audio_transcription.model_size == "large":
                # large model
                self.online.insert_audio_chunk(audio_data)
                output = self.online.process_iter()
                text = output[2].strip()
                is_endpoint = text.endswith((".", "!", "?"))

                if text:
                    self.transcription_segments.append(text)
                concatenated_text = " ".join(self.transcription_segments)
                logger.debug(f"Concatenated transcription: '{concatenated_text}'")
                text = concatenated_text

            else:
                # small model
                self.stream.accept_waveform(16000, audio_data)

                while self.recognizer.is_ready(self.stream):
                    self.recognizer.decode_stream(self.stream)

                text = self.recognizer.get_result(self.stream).strip()
                is_endpoint = self.recognizer.is_endpoint(self.stream)

            logger.debug(f"Transcription result: '{text}'")

            if not text:
                logger.debug("No transcription, returning")
                return None

            logger.debug(f"Endpoint detected: {is_endpoint}")

            if is_endpoint and self.config.audio_transcription.model_size == "small":
                # reset sherpa if we've reached an endpoint
                self.recognizer.reset(self.stream)

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
        while not self.stop_event.is_set():
            try:
                # Get audio data from queue with a timeout to check stop_event
                obj_data, audio = self.audio_queue.get(timeout=0.1)
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
                    self.reset(obj_data["camera"])

            except queue.Empty:
                continue
            except Exception as e:
                logger.error(f"Error processing audio in thread: {e}")
                self.audio_queue.task_done()

        logger.debug(
            f"Stopping audio transcription thread for {self.camera_config.name}"
        )

    def reset(self, camera: str) -> None:
        if self.config.audio_transcription.model_size == "large":
            # get final output from whisper
            output = self.online.finish()
            self.transcription_segments = []

            self.requestor.send_data(
                f"{self.camera_config.name}/audio/transcription",
                (output[2].strip() + " "),
            )

            # reset whisper
            self.online.init()
        else:
            # reset sherpa
            self.recognizer.reset(self.stream)

        # Clear the audio queue
        while not self.audio_queue.empty():
            try:
                self.audio_queue.get_nowait()
                self.audio_queue.task_done()
            except queue.Empty:
                break

        logger.debug("Stream reset")

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
            self.recognizer = None
            self.stream = None
            self.__build_recognizer()
            return {"message": "Audio recognizer cleared and rebuilt", "success": True}
        return None

    def expire_object(self, object_id: str) -> None:
        pass
