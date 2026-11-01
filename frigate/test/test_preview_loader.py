import os
import shutil
import tempfile
import unittest
from unittest.mock import patch

from frigate.output.preview import PREVIEW_FRAME_TYPE, get_most_recent_preview_frame


class TestPreviewLoader(unittest.TestCase):
    def setUp(self):
        # a directory of its own so test groups running in parallel can't
        # delete each other's preview frames
        self.preview_dir = tempfile.mkdtemp()
        self.addCleanup(shutil.rmtree, self.preview_dir, ignore_errors=True)
        cache_dir_patch = patch(
            "frigate.output.preview.PREVIEW_CACHE_DIR", self.preview_dir
        )
        cache_dir_patch.start()
        self.addCleanup(cache_dir_patch.stop)

    def test_get_most_recent_preview_frame_missing(self):
        self.assertIsNone(get_most_recent_preview_frame("test_camera"))

    def test_get_most_recent_preview_frame_exists(self):
        camera = "test_camera"
        # create dummy preview files
        for ts in ["1000.0", "2000.0", "1500.0"]:
            with open(
                os.path.join(
                    self.preview_dir, f"preview_{camera}-{ts}.{PREVIEW_FRAME_TYPE}"
                ),
                "w",
            ) as f:
                f.write(f"test_{ts}")

        expected_path = os.path.join(
            self.preview_dir, f"preview_{camera}-2000.0.{PREVIEW_FRAME_TYPE}"
        )
        self.assertEqual(get_most_recent_preview_frame(camera), expected_path)

    def test_get_most_recent_preview_frame_before(self):
        camera = "test_camera"
        # create dummy preview files
        for ts in ["1000.0", "2000.0"]:
            with open(
                os.path.join(
                    self.preview_dir, f"preview_{camera}-{ts}.{PREVIEW_FRAME_TYPE}"
                ),
                "w",
            ) as f:
                f.write(f"test_{ts}")

        # Test finding frame before or at 1500
        expected_path = os.path.join(
            self.preview_dir, f"preview_{camera}-1000.0.{PREVIEW_FRAME_TYPE}"
        )
        self.assertEqual(
            get_most_recent_preview_frame(camera, before=1500.0), expected_path
        )

        # Test finding frame before or at 999
        self.assertIsNone(get_most_recent_preview_frame(camera, before=999.0))

    def test_get_most_recent_preview_frame_other_camera(self):
        camera = "test_camera"
        other_camera = "other_camera"
        with open(
            os.path.join(
                self.preview_dir, f"preview_{other_camera}-3000.0.{PREVIEW_FRAME_TYPE}"
            ),
            "w",
        ) as f:
            f.write("test")

        self.assertIsNone(get_most_recent_preview_frame(camera))

    def test_get_most_recent_preview_frame_hyphenated_camera(self):
        for name in ("preview_front-2000.0", "preview_front-door-3000.0"):
            with open(
                os.path.join(self.preview_dir, f"{name}.{PREVIEW_FRAME_TYPE}"), "w"
            ) as f:
                f.write("test")

        expected_path = os.path.join(
            self.preview_dir, f"preview_front-2000.0.{PREVIEW_FRAME_TYPE}"
        )
        self.assertEqual(get_most_recent_preview_frame("front"), expected_path)
        self.assertEqual(
            get_most_recent_preview_frame("front", before=5000.0), expected_path
        )

    def test_get_most_recent_preview_frame_no_directory(self):
        shutil.rmtree(self.preview_dir)
        self.assertIsNone(get_most_recent_preview_frame("test_camera"))
