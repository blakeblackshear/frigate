"""Config validation and the historical path for the audio_transcription GenAI backend."""

import unittest
from copy import deepcopy
from unittest.mock import MagicMock, patch

from pydantic import ValidationError

from frigate.config import FrigateConfig
from frigate.config.camera.genai import GenAIConfig, GenAIRoleEnum
from frigate.config.classification import AudioTranscriptionModelEnum
from frigate.const import UPDATE_EVENT_DESCRIPTION
from frigate.data_processing.post.audio_transcription import (
    AudioTranscriptionPostProcessor,
)
from frigate.data_processing.types import PostProcessDataEnum


class TestAudioTranscriptionGenAIConfig(unittest.TestCase):
    def setUp(self):
        self.base = {
            "mqtt": {"host": "mqtt"},
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

    def _config(self, **overrides) -> dict:
        config = deepcopy(self.base)
        config.update(deepcopy(overrides))
        return config

    def _provider(self, roles: list[str]) -> dict:
        return {
            "whisper_cloud": {
                "provider": "openai",
                "model": "gpt-4o-transcribe",
                "api_key": "k",
                "roles": roles,
            }
        }

    def test_default_model_is_whisper_enum(self):
        config = FrigateConfig(**self._config())
        self.assertEqual(
            config.audio_transcription.model, AudioTranscriptionModelEnum.whisper
        )

    def test_whisper_string_coerces_to_enum(self):
        config = FrigateConfig(
            **self._config(audio_transcription={"enabled": True, "model": "whisper"})
        )
        self.assertIsInstance(
            config.audio_transcription.model, AudioTranscriptionModelEnum
        )

    def test_provider_name_stays_a_string(self):
        config = FrigateConfig(
            **self._config(
                genai=self._provider(["transcribe"]),
                audio_transcription={"enabled": True, "model": "whisper_cloud"},
            )
        )
        self.assertNotIsInstance(
            config.audio_transcription.model, AudioTranscriptionModelEnum
        )
        self.assertEqual(config.audio_transcription.model, "whisper_cloud")

    def test_unspecified_model_falls_back_to_whisper(self):
        """An empty value must not read as a GenAI provider that resolves to no client."""
        for value in (None, "", "   "):
            with self.subTest(repr(value)):
                config = FrigateConfig(
                    **self._config(
                        audio_transcription={"enabled": True, "model": value}
                    )
                )
                self.assertIs(
                    config.audio_transcription.model,
                    AudioTranscriptionModelEnum.whisper,
                )

    def test_missing_genai_key_raises(self):
        with self.assertRaises(ValidationError) as ctx:
            FrigateConfig(
                **self._config(
                    audio_transcription={"enabled": True, "model": "nope"},
                )
            )
        self.assertIn("is not a valid GenAI config key", str(ctx.exception))

    def test_provider_without_role_raises(self):
        with self.assertRaises(ValidationError) as ctx:
            FrigateConfig(
                **self._config(
                    genai=self._provider(["descriptions"]),
                    audio_transcription={"enabled": True, "model": "whisper_cloud"},
                )
            )
        self.assertIn("must have 'transcribe' in its roles", str(ctx.exception))

    def test_global_off_camera_on_still_validates(self):
        """Global-off/camera-on is a supported deployment and must not skip the check."""
        config = self._config(
            genai=self._provider(["descriptions"]),
            audio_transcription={"enabled": False, "model": "whisper_cloud"},
        )
        config["cameras"]["back"]["audio_transcription"] = {"enabled": True}

        with self.assertRaises(ValidationError) as ctx:
            FrigateConfig(**config)

        self.assertIn("must have 'transcribe' in its roles", str(ctx.exception))

    def test_disabled_transcription_skips_validation(self):
        config = FrigateConfig(
            **self._config(audio_transcription={"enabled": False, "model": "nope"})
        )
        self.assertEqual(config.audio_transcription.model, "nope")

    def test_camera_level_model_is_rejected(self):
        config = self._config()
        config["cameras"]["back"]["audio_transcription"] = {
            "enabled": True,
            "model": "whisper",
        }

        with self.assertRaises(ValidationError):
            FrigateConfig(**config)

    def test_default_roles_do_not_include_transcribe(self):
        """Backward compatibility: existing providers must not silently claim it."""
        genai = GenAIConfig(provider="openai", model="gpt-4o")
        self.assertNotIn(GenAIRoleEnum.transcribe, genai.roles)

    def test_two_providers_claiming_transcribe_raises(self):
        genai = self._provider(["transcribe"])
        genai["other"] = {
            "provider": "gemini",
            "model": "gemini-2.0-flash",
            "api_key": "k",
            "roles": ["transcribe"],
        }

        with self.assertRaises(ValidationError) as ctx:
            FrigateConfig(
                **self._config(
                    genai=genai,
                    audio_transcription={"enabled": True, "model": "whisper_cloud"},
                )
            )

        self.assertIn("each role must have", str(ctx.exception))

    def test_transcribe_rejected_on_provider_without_audio_input(self):
        with self.assertRaises(ValidationError) as ctx:
            GenAIConfig(provider="ollama", model="llava", roles=["transcribe"])

        self.assertIn("does not support audio input", str(ctx.exception))


class TestAudioTranscriptionPostProcessorGenAI(unittest.TestCase):
    """The recorded-speech path must reach the provider and skip the local model."""

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
        self.client.transcribe.return_value = "recorded speech"
        self.manager = MagicMock()
        self.manager.transcribe_client = self.client
        self.requestor = MagicMock()

        self.processor = AudioTranscriptionPostProcessor(
            self.config,
            self.requestor,
            MagicMock(),
            MagicMock(),
            self.manager,
        )

    def _process(self):
        self.processor.process_data(
            {
                "event_id": "1234.5-abc",
                "camera": "back",
                "event": {
                    "id": "1234.5-abc",
                    "camera": "back",
                    "start_time": 100.0,
                    "end_time": 110.0,
                    "data": {},
                },
            },
            PostProcessDataEnum.tracked_object,
        )

    def test_local_recognizer_is_never_built(self):
        self.assertTrue(self.processor._use_genai)
        self.assertIsNone(self.processor.recognizer)

    def test_audio_bytes_and_language_reach_the_client(self):
        with patch(
            "frigate.data_processing.post.audio_transcription.get_audio_from_recording",
            return_value=b"RIFF....WAVE",
        ):
            self._process()

        self.client.transcribe.assert_called_once()
        self.assertEqual(self.client.transcribe.call_args.args[0], b"RIFF....WAVE")
        self.assertEqual(self.client.transcribe.call_args.kwargs["language"], "en")

    def test_transcript_is_published_as_the_description(self):
        with patch(
            "frigate.data_processing.post.audio_transcription.get_audio_from_recording",
            return_value=b"RIFF....WAVE",
        ):
            self._process()

        topics = [call.args[0] for call in self.requestor.send_data.call_args_list]
        self.assertIn(UPDATE_EVENT_DESCRIPTION, topics)

        payload = next(
            call.args[1]
            for call in self.requestor.send_data.call_args_list
            if call.args[0] == UPDATE_EVENT_DESCRIPTION
        )
        self.assertEqual(payload["description"], "recorded speech")
        self.assertEqual(payload["id"], "1234.5-abc")

    def test_missing_client_publishes_nothing(self):
        self.manager.transcribe_client = None

        with patch(
            "frigate.data_processing.post.audio_transcription.get_audio_from_recording",
            return_value=b"RIFF....WAVE",
        ):
            self._process()

        self.requestor.send_data.assert_not_called()


if __name__ == "__main__":
    unittest.main()
