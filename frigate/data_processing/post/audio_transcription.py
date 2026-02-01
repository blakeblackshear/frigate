"""Handle post-processing for audio transcription."""

import logging
import os
import threading
import time
from typing import Optional

from peewee import DoesNotExist

from frigate.comms.inter_process import InterProcessRequestor
from frigate.config import FrigateConfig
from frigate.const import (
    CACHE_DIR,
    MODEL_CACHE_DIR,
    UPDATE_AUDIO_TRANSCRIPTION_STATE,
    UPDATE_EVENT_DESCRIPTION,
)
from frigate.data_processing.types import PostProcessDataEnum
from frigate.types import TrackedObjectUpdateTypesEnum
from frigate.util.audio import get_audio_from_recording

from ..types import DataProcessorMetrics
from .api import PostProcessorApi

logger = logging.getLogger(__name__)


class AudioTranscriptionPostProcessor(PostProcessorApi):
    def __init__(
        self,
        config: FrigateConfig,
        requestor: InterProcessRequestor,
        embeddings,
        metrics: DataProcessorMetrics,
    ):
        super().__init__(config, metrics, None)
        self.config = config
        self.requestor = requestor
        self.embeddings = embeddings
        self.recognizer = None
        self.transcription_lock = threading.Lock()
        self.transcription_thread = None
        self.transcription_running = False

        # faster-whisper handles model downloading automatically
        self.model_path = os.path.join(MODEL_CACHE_DIR, "whisper")
        os.makedirs(self.model_path, exist_ok=True)

        self.__build_recognizer()

    def __build_recognizer(self) -> None:
        try:
            # Import dynamically to avoid crashes on systems without AVX support
            from faster_whisper import WhisperModel

            self.recognizer = WhisperModel(
                model_size_or_path="small",
                device="cuda"
                if self.config.audio_transcription.device == "GPU"
                else "cpu",
                download_root=self.model_path,
                local_files_only=False,  # Allow downloading if not cached
                compute_type="int8",
            )
            logger.debug("Audio transcription (recordings) initialized")
        except Exception as e:
            logger.error(f"Failed to initialize recordings audio transcription: {e}")
            self.recognizer = None

    def process_data(
        self, data: dict[str, any], data_type: PostProcessDataEnum
    ) -> None:
        """Transcribe audio from a recording.

        Args:
            data (dict): Contains data about the input (event_id, camera, etc.).
            data_type (enum): Describes the data being processed (recording or tracked_object).

        Returns:
            None
        """
        event_id = data["event_id"]
        camera_name = data["camera"]

        if data_type == PostProcessDataEnum.recording:
            start_ts = data["frame_time"]
            recordings_available_through = data["recordings_available"]
            end_ts = min(recordings_available_through, start_ts + 60)  # Default 60s

        elif data_type == PostProcessDataEnum.tracked_object:
            obj_data = data["event"]["data"]
            obj_data["id"] = data["event"]["id"]
            obj_data["camera"] = data["event"]["camera"]
            start_ts = data["event"]["start_time"]
            end_ts = data["event"].get(
                "end_time", start_ts + 60
            )  # Use end_time if available

        else:
            logger.error("No data type passed to audio transcription post-processing")
            return

        try:
            audio_data = get_audio_from_recording(
                self.config.cameras[camera_name].ffmpeg,
                camera_name,
                start_ts,
                end_ts,
                sample_rate=16000,
            )

            if not audio_data:
                logger.debug(f"No audio data extracted for {event_id}")
                return

            transcription = self.__transcribe_audio(audio_data)
            if not transcription:
                logger.debug("No transcription generated from audio")
                return

            logger.debug(f"Transcribed audio for {event_id}: '{transcription}'")

            self.requestor.send_data(
                UPDATE_EVENT_DESCRIPTION,
                {
                    "type": TrackedObjectUpdateTypesEnum.description,
                    "id": event_id,
                    "description": transcription,
                    "camera": camera_name,
                },
            )

            # Embed the description if semantic search is enabled
            if self.config.semantic_search.enabled:
                self.embeddings.embed_description(event_id, transcription)

        except DoesNotExist:
            logger.debug("No recording found for audio transcription post-processing")
            return
        except Exception as e:
            logger.error(f"Error in audio transcription post-processing: {e}")

    def __transcribe_audio(self, audio_data: bytes) -> Optional[tuple[str, float]]:
        """Transcribe WAV audio data using faster-whisper."""
        if not self.recognizer:
            logger.debug("Recognizer not initialized")
            return None

        try:
            # Save audio data to a temporary wav (faster-whisper expects a file)
            temp_wav = os.path.join(CACHE_DIR, f"temp_audio_{int(time.time())}.wav")
            with open(temp_wav, "wb") as f:
                f.write(audio_data)

            segments, info = self.recognizer.transcribe(
                temp_wav,
                language=self.config.audio_transcription.language,
                beam_size=5,
            )

            os.remove(temp_wav)

            # Combine all segment texts
            text = " ".join(segment.text.strip() for segment in segments)
            if not text:
                return None

            logger.debug(
                "Detected language '%s' with probability %f"
                % (info.language, info.language_probability)
            )

            return text
        except Exception as e:
            logger.error(f"Error transcribing audio: {e}")
            return None

    def _transcription_wrapper(self, event: dict[str, any]) -> None:
        """Wrapper to run transcription and reset running flag when done."""
        try:
            self.process_data(
                {
                    "event_id": event["id"],
                    "camera": event["camera"],
                    "event": event,
                },
                PostProcessDataEnum.tracked_object,
            )
        finally:
            with self.transcription_lock:
                self.transcription_running = False
                self.transcription_thread = None

            self.requestor.send_data(UPDATE_AUDIO_TRANSCRIPTION_STATE, "idle")

    def handle_request(self, topic: str, request_data: dict[str, any]) -> str | None:
        if topic == "transcribe_audio":
            event = request_data["event"]

            with self.transcription_lock:
                if self.transcription_running:
                    logger.warning(
                        "Audio transcription for a speech event is already running."
                    )
                    return "in_progress"

                # Mark as running and start the thread
                self.transcription_running = True
                self.requestor.send_data(UPDATE_AUDIO_TRANSCRIPTION_STATE, "processing")

                self.transcription_thread = threading.Thread(
                    target=self._transcription_wrapper, args=(event,), daemon=True
                )
                self.transcription_thread.start()
                return "started"

        return None
