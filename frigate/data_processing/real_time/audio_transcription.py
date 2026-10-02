"""Handle processing audio for speech transcription using sherpa-onnx with FFmpeg pipe."""

import collections
import logging
import os
import queue
import threading
import time
from typing import TYPE_CHECKING, Any

import numpy as np

from frigate.comms.inter_process import InterProcessRequestor
from frigate.config import CameraConfig, FrigateConfig
from frigate.config.classification import AudioTranscriptionModelEnum
from frigate.const import AUDIO_DURATION, MODEL_CACHE_DIR
from frigate.data_processing.common.audio_transcription.model import (
    AudioTranscriptionModelRunner,
)
from frigate.data_processing.real_time.whisper_online import (
    FasterWhisperASR,
    OnlineASRProcessor,
)
from frigate.util.audio import (
    clean_transcript,
    pcm16_to_wav,
    resolve_language,
    stitch_transcripts,
)

from ..types import DataProcessorMetrics
from .api import RealTimeProcessorApi

if TYPE_CHECKING:
    # importing frigate.genai eagerly would pull the provider SDKs into the
    # audio process even when transcription runs on a local model
    from frigate.genai.manager import GenAIClientManager

logger = logging.getLogger(__name__)

# Number of ~0.975s audio detector chunks per GenAI request. The window advances
# one chunk at a time, so two chunks means a 50% overlap: every word lands whole
# in at least one window, which whisper-family models need to avoid hallucinating
# on a clipped clip. The cadence is fixed by the audio detector's frame size, so
# this is a constant rather than a config knob.
GENAI_WINDOW_CHUNKS = 2

# Bound the queue at ~30s of audio so a slow or hung provider cannot grow it
# without limit. The producer is the ffmpeg read thread and must never block.
AUDIO_QUEUE_MAXSIZE = int(30 / AUDIO_DURATION)

# A backed-up queue drops a chunk per cycle, so warning on each one would spam
# the log once a second per camera for as long as the provider stays slow.
AUDIO_DROP_WARN_INTERVAL = 10.0


class AudioTranscriptionRealTimeProcessor(RealTimeProcessorApi):
    def __init__(
        self,
        config: FrigateConfig,
        camera_config: CameraConfig,
        requestor: InterProcessRequestor,
        model_runner: AudioTranscriptionModelRunner | None,
        metrics: DataProcessorMetrics,
        stop_event: threading.Event,
        genai_manager: "GenAIClientManager | None" = None,
    ):
        super().__init__(config, metrics)
        self.config = config
        self.camera_config = camera_config
        self.requestor = requestor
        self.stream: Any = None
        self.whisper_model: FasterWhisperASR | None = None
        self.model_runner = model_runner
        self.genai_manager = genai_manager
        self.transcription_segments: list[str] = []
        self.audio_queue: queue.Queue[tuple[dict[str, Any], np.ndarray]] = queue.Queue(
            maxsize=AUDIO_QUEUE_MAXSIZE
        )
        self.stop_event = stop_event
        self._use_genai = not isinstance(
            config.audio_transcription.model, AudioTranscriptionModelEnum
        )
        # sliding window of raw int16 chunks; the deque's maxlen is what evicts
        # the oldest chunk and so produces the overlap
        self._genai_window: collections.deque[np.ndarray] = collections.deque(
            maxlen=GENAI_WINDOW_CHUNKS
        )
        self._genai_committed = ""
        # set by the producer when it discards a chunk, so the consumer knows the
        # audio it is about to receive is not contiguous with what it buffered
        self._audio_dropped = threading.Event()
        self._last_drop_warning = 0.0

    def __build_recognizer(self) -> None:
        if self._use_genai:
            # nothing local to load; never import sherpa or FasterWhisperASR
            return

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
            elif self.model_runner is not None:
                logger.debug(f"Loading sherpa stream for {self.camera_config.name}")
                self.stream = self.model_runner.model.create_stream()
            logger.debug(
                f"Audio transcription (live) initialized for {self.camera_config.name}"
            )
        except Exception as e:
            logger.error(
                f"Failed to initialize live streaming audio transcription: {e}"
            )

    def __process_audio_stream(self, audio_data: np.ndarray) -> tuple[str, bool] | None:
        # must precede both the model_runner guard (model_runner is None on this
        # path) and the float32 normalization below (GenAI wants untouched int16)
        if self._use_genai:
            return self.__process_audio_genai(audio_data)

        if self.model_runner is None:
            logger.debug("Audio transcription (live) model runner not initialized")
            return None

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

    def __process_audio_genai(self, audio_data: np.ndarray) -> tuple[str, bool] | None:
        """Transcribe a sliding overlapped window through the GenAI provider."""
        client = self.genai_manager.transcribe_client if self.genai_manager else None

        if not client:
            logger.error(
                "audio_transcription.model is '%s' (GenAI provider) but no transcribe "
                "client is configured. Ensure the GenAI provider has 'transcribe' in its roles",
                self.config.audio_transcription.model,
            )
            return None

        if self._audio_dropped.is_set():
            self._audio_dropped.clear()

            # Chunks were discarded between what is buffered and this one, so
            # concatenating them would splice non-adjacent audio into one window
            # and destroy the overlap the stitcher depends on.
            self._genai_window.clear()

            if self._genai_committed:
                # the transcript has a gap in it; close the utterance out rather
                # than stitching across missing speech
                return self.__end_genai_utterance()

        self._genai_window.append(audio_data)

        if len(self._genai_window) < GENAI_WINDOW_CHUNKS:
            # wait for a full window so the first request is never a clipped clip
            return None

        window = np.concatenate(list(self._genai_window))

        # Silence gate, using the same threshold audio detection uses. Gate the
        # whole window rather than individual chunks; this is the primary cost
        # and privacy brake and is what keeps a quiet camera near zero requests.
        window_as_float = window.astype(np.float32)
        rms = float(np.sqrt(np.mean(np.absolute(np.square(window_as_float)))))

        if rms < self.camera_config.audio.min_volume:
            logger.debug(
                f"Window RMS {rms:.1f} below min_volume, skipping transcription"
            )
            return self.__end_genai_utterance()

        text = client.transcribe(
            pcm16_to_wav(window),
            language=resolve_language(self.config.audio_transcription.language),
        )

        # cleaning has to come first: a silent window often comes back as the
        # model's preamble alone, which is silence, not a word to commit
        cleaned = clean_transcript(text)

        if not cleaned:
            return self.__end_genai_utterance()

        self._genai_committed = stitch_transcripts(self._genai_committed, cleaned)

        # no VAD on this path, so mirror the whisper branch's heuristic endpoint
        is_endpoint = (
            self._genai_committed.endswith((".", "!", "?"))
            and len(self._genai_committed) > 300
        )

        logger.debug(f"GenAI transcription: '{self._genai_committed}'")

        return self._genai_committed, is_endpoint

    def __end_genai_utterance(self) -> tuple[str, bool] | None:
        """Close out the current utterance when a window carries no speech."""
        if not self._genai_committed:
            return None

        return self._genai_committed, True

    def process_frame(self, obj_data: dict[str, Any], frame: np.ndarray) -> None:
        pass

    def process_audio(self, obj_data: dict[str, Any], audio: np.ndarray) -> bool | None:
        if audio is None or audio.size == 0:
            logger.debug("No audio data provided for transcription")
            return None

        # enqueue audio data for processing in the thread. never block: the
        # producer is the ffmpeg read thread that audio detection depends on,
        # so on a backlog drop the oldest chunk instead.
        try:
            self.audio_queue.put_nowait((obj_data, audio))
        except queue.Full:
            try:
                self.audio_queue.get_nowait()
                self.audio_queue.task_done()
            except queue.Empty:
                pass

            # the stream now has a hole in it, which the consumer has to know
            # about before it splices the next chunk onto what it already holds
            self._audio_dropped.set()

            now = time.monotonic()

            if now - self._last_drop_warning >= AUDIO_DROP_WARN_INTERVAL:
                self._last_drop_warning = now
                logger.warning(
                    "Audio transcription queue for %s is full, dropping audio. The "
                    "provider is not keeping up with the %.2fs chunk rate",
                    self.camera_config.name,
                    AUDIO_DURATION,
                )

            try:
                self.audio_queue.put_nowait((obj_data, audio))
            except queue.Full:
                pass

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
        if self._use_genai:
            self._genai_committed = ""
            # stale audio carried across an utterance boundary would be
            # re-transcribed into the next one
            self._genai_window.clear()
            logger.debug("Stream reset")
            return

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
        elif self.model_runner is not None:
            # reset sherpa
            self.model_runner.model.reset(self.stream)

        logger.debug("Stream reset")

    def check_unload_model(self) -> None:
        # regularly called in the loop in audio maintainer
        if self._use_genai:
            # no model to unload, but this is the hook that fires when
            # live_enabled flips off. guard on emptiness: called ~1x/s per camera.
            if self._genai_committed or self._genai_window:
                logger.debug(
                    f"Clearing GenAI transcription state for {self.camera_config.name}"
                )
                self.clear_audio_queue()
                self._genai_committed = ""
                self._genai_window.clear()

                self.requestor.send_data(
                    f"{self.camera_config.name}/audio/transcription",
                    "",
                )

            return

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
        self, topic: str, request_data: dict[str, Any]
    ) -> dict[str, Any] | None:
        if topic == "clear_audio_recognizer":
            if self._use_genai:
                self.reset()
                return {"message": "Audio transcription state cleared", "success": True}

            self.stream = None
            self.__build_recognizer()
            return {"message": "Audio recognizer cleared and rebuilt", "success": True}
        return None

    def expire_object(self, object_id: str, camera: str) -> None:
        pass
