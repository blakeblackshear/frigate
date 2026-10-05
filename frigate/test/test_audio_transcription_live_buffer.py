"""Live GenAI transcription: sliding overlapped windows and their lifecycle."""

import io
import threading
import unittest
import wave
from unittest.mock import MagicMock, patch

import numpy as np

from frigate.config import FrigateConfig
from frigate.const import AUDIO_DURATION, AUDIO_SAMPLE_RATE
from frigate.data_processing.real_time.audio_transcription import (
    GENAI_WINDOW_CHUNKS,
    AudioTranscriptionRealTimeProcessor,
)

CHUNK_SAMPLES = int(round(AUDIO_DURATION * AUDIO_SAMPLE_RATE))


def _chunk(amplitude: int) -> np.ndarray:
    """One audio-detector-sized chunk of int16 samples at a constant amplitude."""
    return np.full(CHUNK_SAMPLES, amplitude, dtype=np.int16)


class TestLiveGenAITranscription(unittest.TestCase):
    def setUp(self):
        self.config = FrigateConfig(
            **{
                "mqtt": {"host": "mqtt"},
                "genai": {
                    "whisper_cloud": {
                        "provider": "openai",
                        "model": "gpt-4o-transcribe",
                        "api_key": "k",
                        "roles": ["transcribe"],
                    }
                },
                "audio_transcription": {
                    "enabled": True,
                    "model": "whisper_cloud",
                    "language": "en",
                },
                "cameras": {
                    "back": {
                        "ffmpeg": {
                            "inputs": [
                                {
                                    "path": "rtsp://10.0.0.1:554/video",
                                    "roles": ["detect", "audio"],
                                }
                            ]
                        },
                        "detect": {"height": 1080, "width": 1920, "fps": 5},
                        "audio": {"enabled": True},
                    }
                },
            }
        )

        self.client = MagicMock()
        self.client.transcribe.return_value = "hello"
        self.manager = MagicMock()
        self.manager.transcribe_client = self.client
        self.requestor = MagicMock()

        self.processor = AudioTranscriptionRealTimeProcessor(
            config=self.config,
            camera_config=self.config.cameras["back"],
            requestor=self.requestor,
            model_runner=None,
            metrics=MagicMock(),
            stop_event=threading.Event(),
            genai_manager=self.manager,
        )

    def _feed(self, chunk: np.ndarray):
        return (
            self.processor._AudioTranscriptionRealTimeProcessor__process_audio_stream(
                chunk
            )
        )

    def _sent_wav(self, call_index: int) -> wave.Wave_read:
        payload = self.client.transcribe.call_args_list[call_index].args[0]
        return wave.open(io.BytesIO(payload), "rb")

    def test_uses_genai_path(self):
        self.assertTrue(self.processor._use_genai)

    def test_first_chunk_does_not_transcribe(self):
        self.assertIsNone(self._feed(_chunk(4000)))
        self.client.transcribe.assert_not_called()

    def test_full_window_transcribes_two_chunks(self):
        self._feed(_chunk(4000))
        result = self._feed(_chunk(4000))

        self.assertEqual(result, ("hello", False))
        self.client.transcribe.assert_called_once()
        self.assertEqual(
            self.client.transcribe.call_args.kwargs["language"],
            "en",
        )

        with self._sent_wav(0) as wav:
            self.assertEqual(wav.getnchannels(), 1)
            self.assertEqual(wav.getsampwidth(), 2)
            self.assertEqual(wav.getframerate(), AUDIO_SAMPLE_RATE)
            self.assertEqual(wav.getnframes(), CHUNK_SAMPLES * GENAI_WINDOW_CHUNKS)

    def test_window_slides_with_overlap(self):
        """The third chunk's window is chunks 2+3, not 3 alone and not 1+2+3."""
        self.client.transcribe.side_effect = ["one two", "two three"]

        self._feed(_chunk(1000))
        self._feed(_chunk(2000))
        result = self._feed(_chunk(3000))

        self.assertEqual(self.client.transcribe.call_count, 2)

        with self._sent_wav(1) as wav:
            self.assertEqual(wav.getnframes(), CHUNK_SAMPLES * GENAI_WINDOW_CHUNKS)
            samples = np.frombuffer(wav.readframes(wav.getnframes()), dtype=np.int16)

        self.assertEqual(samples[0], 2000)
        self.assertEqual(samples[-1], 3000)

        # the shared "two" appears once
        self.assertEqual(result, ("one two three", False))

    def test_silent_window_is_not_uploaded(self):
        self._feed(_chunk(0))
        self.assertIsNone(self._feed(_chunk(0)))
        self.client.transcribe.assert_not_called()

    def test_silent_window_ends_a_pending_utterance(self):
        self._feed(_chunk(4000))
        self._feed(_chunk(4000))

        # the gate covers the whole window, so it takes GENAI_WINDOW_CHUNKS
        # silent chunks to push the last speech out of it
        self._feed(_chunk(0))

        self.assertEqual(self._feed(_chunk(0)), ("hello", True))

    def test_empty_transcript_ends_a_pending_utterance(self):
        self.client.transcribe.side_effect = ["hello", ""]

        self._feed(_chunk(4000))
        self._feed(_chunk(4000))

        self.assertEqual(self._feed(_chunk(4000)), ("hello", True))

    def test_empty_transcript_with_nothing_pending_returns_none(self):
        self.client.transcribe.return_value = ""

        self._feed(_chunk(4000))
        self.assertIsNone(self._feed(_chunk(4000)))

    def test_reset_clears_committed_text_and_window(self):
        self._feed(_chunk(4000))
        self._feed(_chunk(4000))

        self.processor.reset()

        self.assertEqual(self.processor._genai_committed, "")
        self.assertEqual(len(self.processor._genai_window), 0)

        # a fresh window is required again before the next request
        self.client.transcribe.reset_mock()
        self._feed(_chunk(4000))
        self.client.transcribe.assert_not_called()

    def test_check_unload_model_clears_once_then_is_idempotent(self):
        self._feed(_chunk(4000))
        self._feed(_chunk(4000))

        self.processor.check_unload_model()

        self.requestor.send_data.assert_called_once_with("back/audio/transcription", "")
        self.assertEqual(self.processor._genai_committed, "")
        self.assertEqual(len(self.processor._genai_window), 0)

        self.processor.check_unload_model()
        self.requestor.send_data.assert_called_once()

    def test_build_recognizer_never_loads_a_local_model(self):
        with patch(
            "frigate.data_processing.real_time.audio_transcription.FasterWhisperASR"
        ) as whisper:
            self.processor._AudioTranscriptionRealTimeProcessor__build_recognizer()

        whisper.assert_not_called()
        self.assertIsNone(self.processor.stream)

    def test_clear_audio_recognizer_request_only_resets(self):
        self._feed(_chunk(4000))
        self._feed(_chunk(4000))

        with patch.object(
            self.processor,
            "_AudioTranscriptionRealTimeProcessor__build_recognizer",
        ) as build:
            result = self.processor.handle_request("clear_audio_recognizer", {})

        build.assert_not_called()
        self.assertTrue(result["success"])
        self.assertEqual(self.processor._genai_committed, "")

    def test_missing_client_logs_and_returns_none(self):
        self.manager.transcribe_client = None

        self.assertIsNone(self._feed(_chunk(4000)))
        self.assertIsNone(self._feed(_chunk(4000)))

    def test_dropped_audio_discards_the_buffered_window(self):
        """A gap in the stream must not be spliced into a single window.

        Dropping a queued chunk leaves the next one non-adjacent to what is
        buffered, so concatenating them would hand the provider audio with a
        hole in it and break the 50% overlap the stitcher relies on.
        """
        self._feed(_chunk(4000))
        self.assertEqual(len(self.processor._genai_window), 1)

        # the producer discards a chunk while the consumer is blocked
        self.processor._audio_dropped.set()

        self._feed(_chunk(5000))

        # the buffered chunk was discarded, so this one starts a fresh window
        self.assertEqual(len(self.processor._genai_window), 1)
        self.client.transcribe.assert_not_called()

        # and the window that does go out holds only contiguous audio
        self._feed(_chunk(5000))
        self.client.transcribe.assert_called_once()

        with self._sent_wav(0) as wav:
            samples = np.frombuffer(wav.readframes(wav.getnframes()), dtype=np.int16)

        self.assertEqual(wav.getnframes(), CHUNK_SAMPLES * GENAI_WINDOW_CHUNKS)
        self.assertTrue((samples == 5000).all(), "window spliced across the gap")

    def test_dropped_audio_ends_a_pending_utterance(self):
        """Committed text cannot be stitched across missing speech."""
        self._feed(_chunk(4000))
        self._feed(_chunk(4000))
        self.assertEqual(self.processor._genai_committed, "hello")

        self.processor._audio_dropped.set()

        self.assertEqual(self._feed(_chunk(4000)), ("hello", True))
        self.assertEqual(len(self.processor._genai_window), 0)

    def test_drop_flag_is_consumed_once(self):
        self.processor._audio_dropped.set()
        self._feed(_chunk(4000))

        self.assertFalse(self.processor._audio_dropped.is_set())

    def test_full_queue_flags_a_drop(self):
        for i in range(self.processor.audio_queue.maxsize + 1):
            self.processor.process_audio({"id": "back_audio"}, _chunk(i + 1))

        self.assertTrue(self.processor._audio_dropped.is_set())

    def test_queue_is_bounded_and_drops_oldest(self):
        maxsize = self.processor.audio_queue.maxsize
        self.assertGreater(maxsize, 0)

        for i in range(maxsize + 5):
            self.processor.process_audio({"id": "back_audio"}, _chunk(i + 1))

        self.assertEqual(self.processor.audio_queue.qsize(), maxsize)

        # the newest chunk survived, the oldest did not
        remaining = []
        while not self.processor.audio_queue.empty():
            remaining.append(self.processor.audio_queue.get_nowait()[1][0])

        self.assertEqual(remaining[-1], maxsize + 5)
        self.assertNotIn(1, remaining)


if __name__ == "__main__":
    unittest.main()
