"""Test camera user and password cleanup."""

import multiprocessing as mp
import unittest

from frigate.config import FrigateConfig
from frigate.output.birdseye import BirdsEyeFrameManager, get_canvas_shape


class TestBirdseye(unittest.TestCase):
    def test_16x9(self):
        """Test 16x9 aspect ratio works as expected for birdseye."""
        width = 1280
        height = 720
        canvas_width, canvas_height = get_canvas_shape(width, height)
        assert canvas_width == width
        assert canvas_height == height

    def test_4x3(self):
        """Test 4x3 aspect ratio works as expected for birdseye."""
        width = 1280
        height = 960
        canvas_width, canvas_height = get_canvas_shape(width, height)
        assert canvas_width == width
        assert canvas_height == height

    def test_32x9(self):
        """Test 32x9 aspect ratio works as expected for birdseye."""
        width = 2560
        height = 720
        canvas_width, canvas_height = get_canvas_shape(width, height)
        assert canvas_width == width
        assert canvas_height == height

    def test_9x16(self):
        """Test 9x16 aspect ratio works as expected for birdseye."""
        width = 720
        height = 1280
        canvas_width, canvas_height = get_canvas_shape(width, height)
        assert canvas_width == width
        assert canvas_height == height

    def test_non_16x9(self):
        """Test non 16x9 aspect ratio fails for birdseye."""
        width = 1280
        height = 840
        canvas_width, canvas_height = get_canvas_shape(width, height)
        assert canvas_width == width  # width will be the same
        assert canvas_height != height


class TestBirdseyeCameraOrder(unittest.TestCase):
    """Test that birdseye reacts to camera order changes without a restart."""

    def setUp(self):
        config = {
            "mqtt": {"enabled": False},
            "birdseye": {"enabled": True, "mode": "continuous"},
            "cameras": {
                camera: {
                    "ffmpeg": {
                        "inputs": [
                            {"path": "rtsp://10.0.0.1:554/video", "roles": ["detect"]}
                        ]
                    },
                    "detect": {"height": 1080, "width": 1920, "fps": 5},
                }
                for camera in ("back", "front", "side")
            },
        }
        self.config = FrigateConfig(**config)
        self.manager = BirdsEyeFrameManager(self.config, mp.Event())

        # mark every camera as continuously active with no frame to draw, which
        # exercises the layout without needing real yuv frames
        for camera_data in self.manager.cameras.values():
            camera_data["current_frame"] = None
            camera_data["current_frame_time"] = 1.0
            camera_data["last_active_frame"] = 1.0

    def layout_order(self) -> list[str]:
        """Return the cameras in the order the current layout renders them."""
        return [position[0] for row in self.manager.camera_layout for position in row]

    def test_layout_uses_configured_order(self):
        """Test the layout is sorted by order, then by name when tied."""
        self.config.cameras["side"].birdseye.order = 0
        self.config.cameras["back"].birdseye.order = 10
        self.config.cameras["front"].birdseye.order = 20

        self.manager.update_frame()

        assert self.layout_order() == ["side", "back", "front"]

    def test_order_change_rebuilds_layout(self):
        """Test a reorder relayouts even though the active cameras are unchanged."""
        self.manager.update_frame()
        assert self.layout_order() == ["back", "front", "side"]

        # a stable active set means only an order change can reset the layout,
        # which is what a settings reorder publishes to this process
        self.config.cameras["side"].birdseye.order = -10

        _, layout_changed = self.manager.update_frame()

        assert layout_changed
        assert self.layout_order() == ["side", "back", "front"]

    def test_unchanged_order_keeps_layout(self):
        """Test a repeat update with no order change doesn't reset the layout."""
        self.manager.update_frame()

        _, layout_changed = self.manager.update_frame()

        assert not layout_changed
        assert self.layout_order() == ["back", "front", "side"]
