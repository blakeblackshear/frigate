"""Tests for OSError resilience when writing tracked object media to disk."""

import builtins
import errno
import os
import tempfile
import unittest
from pathlib import Path
from typing import Any
from unittest.mock import patch

from frigate.config import FrigateConfig
from frigate.track.tracked_object import TrackedObject


def _build_tracked_object() -> TrackedObject:
    config = FrigateConfig(
        **{
            "mqtt": {"enabled": False},
            "cameras": {
                "cam": {
                    "ffmpeg": {
                        "inputs": [
                            {"path": "rtsp://10.0.0.1:554/video", "roles": ["detect"]}
                        ]
                    },
                    "detect": {"width": 640, "height": 480, "fps": 5},
                    "objects": {"track": ["car"]},
                }
            },
        }
    )
    camera_config = config.cameras["cam"]
    obj_data = {
        "id": "1000.0-abcdef",
        "label": "car",
        "frame_time": 1000.0,
        "start_time": 1000.0,
        "score": 0.9,
        "box": (100, 100, 200, 200),
        "area": 10000,
        "ratio": 1.0,
        "region": (0, 0, 640, 480),
        "centroid": (150, 150),
        "position_changes": 1,
        "motionless_count": 0,
        "attributes": [],
        "score_history": [0.9],
    }
    return TrackedObject(
        config.model_for_camera("cam"),
        camera_config,
        config.ui,
        {},
        obj_data,
    )


class TestTrackedObjectDiskErrors(unittest.TestCase):
    def setUp(self):
        self.obj = _build_tracked_object()

    def test_write_thumbnail_logs_warning_on_open_oserror(self):
        with tempfile.TemporaryDirectory() as tmpdir:
            orig_open = builtins.open

            def flaky_open(file: Any, *args: Any, **kwargs: Any) -> Any:
                if str(file).endswith("1000.0-abcdef.webp"):
                    raise TimeoutError(
                        errno.ETIMEDOUT, "Connection timed out", str(file)
                    )
                return orig_open(file, *args, **kwargs)

            with (
                patch("frigate.track.tracked_object.THUMB_DIR", tmpdir),
                patch.object(self.obj, "get_thumbnail", return_value=b"webp"),
                patch("builtins.open", side_effect=flaky_open),
                self.assertLogs("frigate.track.tracked_object", level="WARNING") as cm,
            ):
                self.obj.write_thumbnail_to_disk()

            self.assertTrue(
                any("Failed to write thumbnail" in line for line in cm.output)
            )
            self.assertTrue(Path(tmpdir, "cam").is_dir())

    def test_write_thumbnail_logs_warning_on_makedirs_oserror(self):
        with tempfile.TemporaryDirectory() as tmpdir:
            with (
                patch("frigate.track.tracked_object.THUMB_DIR", tmpdir),
                patch.object(
                    os,
                    "makedirs",
                    side_effect=PermissionError(errno.EACCES, "Permission denied"),
                ),
                self.assertLogs("frigate.track.tracked_object", level="WARNING") as cm,
            ):
                self.obj.write_thumbnail_to_disk()

            self.assertTrue(
                any("Failed to write thumbnail" in line for line in cm.output)
            )

    def test_write_snapshot_logs_warning_on_open_oserror(self):
        with tempfile.TemporaryDirectory() as tmpdir:
            orig_open = builtins.open

            def flaky_open(file: Any, *args: Any, **kwargs: Any) -> Any:
                if str(file).endswith("cam-1000.0-abcdef-clean.webp"):
                    raise TimeoutError(
                        errno.ETIMEDOUT, "Connection timed out", str(file)
                    )
                return orig_open(file, *args, **kwargs)

            with (
                patch("frigate.track.tracked_object.CLIPS_DIR", tmpdir),
                patch.object(self.obj, "get_clean_webp", return_value=b"webp"),
                patch("builtins.open", side_effect=flaky_open),
                self.assertLogs("frigate.track.tracked_object", level="WARNING") as cm,
            ):
                self.obj.write_snapshot_to_disk()

            self.assertTrue(
                any("Failed to write snapshot" in line for line in cm.output)
            )


if __name__ == "__main__":
    unittest.main()
