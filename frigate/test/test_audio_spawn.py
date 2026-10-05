"""Tests for audio maintainer spawning on runtime camera adds."""

import threading
import unittest
from unittest.mock import MagicMock, patch

from frigate.config import FrigateConfig
from frigate.events.audio import AudioProcessor


def _build_config() -> FrigateConfig:
    return FrigateConfig(
        **{
            "mqtt": {"host": "mqtt"},
            "cameras": {
                "front_door": {
                    "ffmpeg": {
                        "inputs": [
                            {
                                "path": "rtsp://10.0.0.1:554/video",
                                "roles": ["detect", "audio"],
                            }
                        ]
                    },
                    "audio": {"enabled": True},
                }
            },
        }
    )


class TestAudioSpawnIfNeeded(unittest.TestCase):
    def _processor(self, config: FrigateConfig, camera_metrics: dict) -> AudioProcessor:
        processor = AudioProcessor.__new__(AudioProcessor)
        processor.config = config
        processor.camera_metrics = camera_metrics
        processor.embeddings_metrics = MagicMock()
        processor.audio_threads = {}
        processor.transcription_model_runner = None
        processor.genai_manager = None
        processor.stop_event = threading.Event()
        processor.logger = MagicMock()
        return processor

    def test_skips_camera_whose_metrics_have_not_been_created_yet(self):
        """The camera maintainer creates metrics on its own poll of the add
        update, so the audio processor can see the camera first."""
        config = _build_config()
        processor = self._processor(config, {})

        with patch("frigate.events.audio.AudioEventMaintainer") as maintainer:
            processor.spawn_if_needed(config.cameras["front_door"])

        maintainer.assert_not_called()
        assert processor.audio_threads == {}

    def test_spawns_once_metrics_exist_and_passes_the_metrics_object(self):
        config = _build_config()
        metrics = object()
        processor = self._processor(config, {"front_door": metrics})

        with patch("frigate.events.audio.AudioEventMaintainer") as maintainer:
            processor.spawn_if_needed(config.cameras["front_door"])

        assert maintainer.call_args.args[2] is metrics
        assert "front_door" in processor.audio_threads
        maintainer.return_value.start.assert_called_once()

    def test_does_not_respawn_for_a_camera_already_running(self):
        config = _build_config()
        processor = self._processor(config, {"front_door": object()})
        processor.audio_threads["front_door"] = MagicMock()

        with patch("frigate.events.audio.AudioEventMaintainer") as maintainer:
            processor.spawn_if_needed(config.cameras["front_door"])

        maintainer.assert_not_called()

    def test_skips_camera_whose_ffmpeg_update_has_not_arrived_yet(self):
        """The add update carries the camera before its ffmpeg inputs are
        applied, so the audio role can be briefly missing."""
        config = _build_config()
        camera = config.cameras["front_door"]
        camera.ffmpeg.inputs[0].roles = ["detect"]
        processor = self._processor(config, {"front_door": object()})

        with patch("frigate.events.audio.AudioEventMaintainer") as maintainer:
            processor.spawn_if_needed(camera)

        maintainer.assert_not_called()
