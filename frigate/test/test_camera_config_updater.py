"""Tests for dynamic camera config updates recreating ffmpeg commands."""

import unittest
from unittest.mock import patch

from frigate.config import CameraConfig, FrigateConfig
from frigate.config.camera.updater import (
    CameraConfigUpdateEnum,
    CameraConfigUpdateSubscriber,
)
from frigate.const import SUB_CACHE_TAG
from frigate.detectors.detector_config import SceneEnum


def _build_scene_frigate_config(scene: str | None) -> FrigateConfig:
    detect = {"height": 1080, "width": 1920, "fps": 5}
    if scene is not None:
        detect["scene"] = scene
    return FrigateConfig(
        **{
            "mqtt": {"host": "mqtt"},
            "models": [
                {"devices": ["cpu"]},
                {"scene": "outdoor", "devices": ["openvino:CPU"]},
            ],
            "cameras": {
                "front_door": {
                    "ffmpeg": {
                        "inputs": [
                            {"path": "rtsp://10.0.0.1:554/video", "roles": ["detect"]}
                        ]
                    },
                    "detect": detect,
                }
            },
        }
    )


def _build_camera_config(sub_enabled: bool) -> CameraConfig:
    config = FrigateConfig(
        **{
            "mqtt": {"host": "mqtt"},
            "cameras": {
                "front_door": {
                    "ffmpeg": {
                        "inputs": [
                            {
                                "path": "rtsp://10.0.0.1:554/video",
                                "roles": ["detect", "record"],
                            },
                            {
                                "path": "rtsp://10.0.0.1:554/video2",
                                "roles": ["record_sub"],
                            },
                        ]
                    },
                    "record": {"enabled": True, "sub": {"enabled": sub_enabled}},
                }
            },
        }
    )
    return config.cameras["front_door"]


def _has_sub_output(camera_config: CameraConfig) -> bool:
    return any(
        SUB_CACHE_TAG in part for c in camera_config.ffmpeg_cmds for part in c["cmd"]
    )


class TestRecordUpdateRecreatesFfmpegCmds(unittest.TestCase):
    def setUp(self):
        # avoid binding a real ZMQ socket; updates are fed directly through
        # the mocked subscriber below
        patcher = patch("frigate.config.camera.updater.ConfigSubscriber")
        patcher.start()
        self.addCleanup(patcher.stop)

    def _push_record_update(
        self, subscriber: CameraConfigUpdateSubscriber, record_config
    ) -> None:
        subscriber.subscriber.check_for_update.side_effect = [
            ("config/cameras/front_door/record", record_config),
            (None, None),
        ]
        subscriber.check_for_updates()

    def test_enabling_sub_recreates_ffmpeg_cmds(self):
        camera_config = _build_camera_config(sub_enabled=False)
        subscriber = CameraConfigUpdateSubscriber(
            None, {"front_door": camera_config}, [CameraConfigUpdateEnum.record]
        )
        assert not _has_sub_output(camera_config)

        self._push_record_update(
            subscriber, _build_camera_config(sub_enabled=True).record
        )

        assert _has_sub_output(camera_config)

    def test_disabling_sub_recreates_ffmpeg_cmds(self):
        camera_config = _build_camera_config(sub_enabled=True)
        subscriber = CameraConfigUpdateSubscriber(
            None, {"front_door": camera_config}, [CameraConfigUpdateEnum.record]
        )
        assert _has_sub_output(camera_config)

        self._push_record_update(
            subscriber, _build_camera_config(sub_enabled=False).record
        )

        assert not _has_sub_output(camera_config)

    @patch("frigate.detectors.detector_config.load_labels")
    def test_removed_camera_readded_without_scene_gets_fresh_model(self, mock_labels):
        mock_labels.return_value = {}
        config = _build_scene_frigate_config("outdoor")
        subscriber = CameraConfigUpdateSubscriber(
            config, {}, [CameraConfigUpdateEnum.add, CameraConfigUpdateEnum.remove]
        )
        assert config.model_for_camera("front_door").scene == SceneEnum.outdoor

        subscriber.subscriber.check_for_update.side_effect = [
            ("config/cameras/front_door/remove", config.cameras["front_door"]),
            (None, None),
        ]
        subscriber.check_for_updates()

        # recreating the camera through the wizard leaves the scene unset,
        # so the removed camera's cached model must not carry over
        readded = _build_scene_frigate_config(None).cameras["front_door"]
        subscriber.subscriber.check_for_update.side_effect = [
            ("config/cameras/front_door/add", readded),
            (None, None),
        ]
        subscriber.check_for_updates()

        assert config.model_for_camera("front_door").scene == SceneEnum.all

    def test_unchanged_record_update_keeps_existing_cmds(self):
        camera_config = _build_camera_config(sub_enabled=False)
        subscriber = CameraConfigUpdateSubscriber(
            None, {"front_door": camera_config}, [CameraConfigUpdateEnum.record]
        )
        cmds_before = camera_config.ffmpeg_cmds

        # neither enabled_in_config nor sub.enabled changed, so the
        # commands should not be rebuilt
        self._push_record_update(
            subscriber, _build_camera_config(sub_enabled=False).record
        )

        assert camera_config.ffmpeg_cmds is cmds_before
