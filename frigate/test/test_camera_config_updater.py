"""Tests for dynamic camera config updates recreating ffmpeg commands."""

import unittest
from unittest.mock import patch

from frigate.config import CameraConfig, FrigateConfig
from frigate.config.camera.updater import (
    CameraConfigUpdateEnum,
    CameraConfigUpdateSubscriber,
)
from frigate.const import SUB_CACHE_TAG


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
