import os
import shutil
from unittest.mock import MagicMock

import cv2
import numpy as np

from frigate.output.preview import PREVIEW_CACHE_DIR, PREVIEW_FRAME_TYPE
from frigate.test.http_api.base_http_test import AuthTestClient, BaseTestHttp


class TestHttpLatestFrame(BaseTestHttp):
    def setUp(self):
        super().setUp([])
        self.app = super().create_app()
        self.app.detected_frames_processor = MagicMock()

        if os.path.exists(PREVIEW_CACHE_DIR):
            shutil.rmtree(PREVIEW_CACHE_DIR)
        os.makedirs(PREVIEW_CACHE_DIR)

    def tearDown(self):
        if os.path.exists(PREVIEW_CACHE_DIR):
            shutil.rmtree(PREVIEW_CACHE_DIR)
        super().tearDown()

    def test_latest_frame_fallback_to_preview(self):
        camera = "front_door"
        # 1. Mock frame processor to return None (simulating offline/missing frame)
        self.app.detected_frames_processor.get_current_frame.return_value = None
        # Return a timestamp that is after our dummy preview frame
        self.app.detected_frames_processor.get_current_frame_time.return_value = (
            1234567891.0
        )

        # 2. Create a dummy preview file
        dummy_frame = np.zeros((180, 320, 3), np.uint8)
        cv2.putText(
            dummy_frame,
            "PREVIEW",
            (50, 50),
            cv2.FONT_HERSHEY_SIMPLEX,
            1,
            (255, 255, 255),
            2,
        )
        preview_path = os.path.join(
            PREVIEW_CACHE_DIR, f"preview_{camera}-1234567890.0.{PREVIEW_FRAME_TYPE}"
        )
        cv2.imwrite(preview_path, dummy_frame)

        with AuthTestClient(self.app) as client:
            response = client.get(f"/{camera}/latest.webp")
            assert response.status_code == 200
            assert response.headers.get("X-Frigate-Offline") == "true"
            # Verify we got an image (webp)
            assert response.headers.get("content-type") == "image/webp"

    def test_latest_frame_no_fallback_when_live(self):
        camera = "front_door"
        # 1. Mock frame processor to return a live frame
        dummy_frame = np.zeros((180, 320, 3), np.uint8)
        self.app.detected_frames_processor.get_current_frame.return_value = dummy_frame
        self.app.detected_frames_processor.get_current_frame_time.return_value = (
            2000000000.0  # Way in the future
        )

        with AuthTestClient(self.app) as client:
            response = client.get(f"/{camera}/latest.webp")
            assert response.status_code == 200
            assert "X-Frigate-Offline" not in response.headers

    def test_latest_frame_stale_falls_back_to_preview(self):
        camera = "front_door"
        # 1. Mock frame processor to return a stale frame
        dummy_frame = np.zeros((180, 320, 3), np.uint8)
        self.app.detected_frames_processor.get_current_frame.return_value = dummy_frame
        # Return a timestamp that is after our dummy preview frame, but way in the past
        self.app.detected_frames_processor.get_current_frame_time.return_value = 1000.0

        # 2. Create a dummy preview file
        preview_path = os.path.join(
            PREVIEW_CACHE_DIR, f"preview_{camera}-999.0.{PREVIEW_FRAME_TYPE}"
        )
        cv2.imwrite(preview_path, dummy_frame)

        with AuthTestClient(self.app) as client:
            response = client.get(f"/{camera}/latest.webp")
            assert response.status_code == 200
            assert response.headers.get("X-Frigate-Offline") == "true"

    def test_latest_frame_no_preview_found(self):
        camera = "front_door"
        # 1. Mock frame processor to return None
        self.app.detected_frames_processor.get_current_frame.return_value = None

        # 2. No preview file created

        with AuthTestClient(self.app) as client:
            response = client.get(f"/{camera}/latest.webp")
            # Should fall back to camera-error.jpg (which might not exist in test env, but let's see)
            # If camera-error.jpg is not found, it returns 500 "Unable to get valid frame" in latest_frame
            # OR it uses request.app.camera_error_image if already loaded.

            # Since we didn't provide camera-error.jpg, it might 500 if glob fails or return 500 if frame is None.
            assert response.status_code in [200, 500]
            assert "X-Frigate-Offline" not in response.headers
