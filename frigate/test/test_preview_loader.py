import os
import shutil
import unittest

from frigate.output.preview import (
    PREVIEW_CACHE_DIR,
    PREVIEW_FRAME_TYPE,
    get_most_recent_preview_frame,
)


class TestPreviewLoader(unittest.TestCase):
    def setUp(self):
        if os.path.exists(PREVIEW_CACHE_DIR):
            shutil.rmtree(PREVIEW_CACHE_DIR)
        os.makedirs(PREVIEW_CACHE_DIR)

    def tearDown(self):
        if os.path.exists(PREVIEW_CACHE_DIR):
            shutil.rmtree(PREVIEW_CACHE_DIR)

    def test_get_most_recent_preview_frame_missing(self):
        self.assertIsNone(get_most_recent_preview_frame("test_camera"))

    def test_get_most_recent_preview_frame_exists(self):
        camera = "test_camera"
        # create dummy preview files
        for ts in ["1000.0", "2000.0", "1500.0"]:
            with open(
                os.path.join(
                    PREVIEW_CACHE_DIR, f"preview_{camera}-{ts}.{PREVIEW_FRAME_TYPE}"
                ),
                "w",
            ) as f:
                f.write(f"test_{ts}")

        expected_path = os.path.join(
            PREVIEW_CACHE_DIR, f"preview_{camera}-2000.0.{PREVIEW_FRAME_TYPE}"
        )
        self.assertEqual(get_most_recent_preview_frame(camera), expected_path)

    def test_get_most_recent_preview_frame_before(self):
        camera = "test_camera"
        # create dummy preview files
        for ts in ["1000.0", "2000.0"]:
            with open(
                os.path.join(
                    PREVIEW_CACHE_DIR, f"preview_{camera}-{ts}.{PREVIEW_FRAME_TYPE}"
                ),
                "w",
            ) as f:
                f.write(f"test_{ts}")

        # Test finding frame before or at 1500
        expected_path = os.path.join(
            PREVIEW_CACHE_DIR, f"preview_{camera}-1000.0.{PREVIEW_FRAME_TYPE}"
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
                PREVIEW_CACHE_DIR, f"preview_{other_camera}-3000.0.{PREVIEW_FRAME_TYPE}"
            ),
            "w",
        ) as f:
            f.write("test")

        self.assertIsNone(get_most_recent_preview_frame(camera))

    def test_get_most_recent_preview_frame_no_directory(self):
        shutil.rmtree(PREVIEW_CACHE_DIR)
        self.assertIsNone(get_most_recent_preview_frame("test_camera"))
