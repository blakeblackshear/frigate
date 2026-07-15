"""Tests for Birdseye canvas sizing and layout behavior."""

import unittest
from multiprocessing import Event

from frigate.config import FrigateConfig
from frigate.output.birdseye import BirdsEyeFrameManager, get_canvas_shape


class TestBirdseye(unittest.TestCase):
    def _build_manager(
        self, camera_dimensions: dict[str, tuple[int, int]]
    ) -> BirdsEyeFrameManager:
        config = {
            "mqtt": {"host": "mqtt"},
            "birdseye": {"width": 1280, "height": 720},
            "cameras": {},
        }

        for order, (camera, dimensions) in enumerate(
            camera_dimensions.items(), start=1
        ):
            config["cameras"][camera] = {
                "ffmpeg": {
                    "inputs": [
                        {
                            "path": f"rtsp://10.0.0.1:554/{camera}",
                            "roles": ["detect"],
                        }
                    ]
                },
                "detect": {
                    "width": dimensions[0],
                    "height": dimensions[1],
                    "fps": 5,
                },
                "birdseye": {"order": order},
            }

        return BirdsEyeFrameManager(FrigateConfig(**config), Event())

    def _assert_no_overlaps(
        self, layout: list[list[tuple[str, tuple[int, int, int, int]]]]
    ):
        rectangles = [position for row in layout for _, position in row]

        for index, rect in enumerate(rectangles):
            x1, y1, width1, height1 = rect
            for other in rectangles[index + 1 :]:
                x2, y2, width2, height2 = other
                overlap = (
                    x1 < x2 + width2
                    and x2 < x1 + width1
                    and y1 < y2 + height2
                    and y2 < y1 + height1
                )
                self.assertFalse(
                    overlap,
                    msg=f"Overlapping rectangles found: {rect} and {other}",
                )

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

    def test_portrait_camera_does_not_overlap_next_row(self):
        """Portrait cameras should reserve their real horizontal position on the next row."""
        manager = self._build_manager(
            {
                "cam_a": (1280, 720),
                "cam_p": (360, 640),
                "cam_b": (1280, 720),
                "cam_c": (640, 480),
            }
        )

        layout = manager.calculate_layout(["cam_a", "cam_p", "cam_b", "cam_c"], 3)

        self.assertIsNotNone(layout)
        assert layout is not None
        self._assert_no_overlaps(layout)

        cam_c = [
            position for row in layout for camera, position in row if camera == "cam_c"
        ][0]
        self.assertEqual(cam_c[0], 0)

    def test_portrait_reservation_only_applies_to_next_row(self):
        """Portrait reservations should not push later rows after the span ends."""
        manager = self._build_manager(
            {
                "cam_a": (1280, 720),
                "cam_p": (360, 640),
                "cam_b": (1280, 720),
                "cam_c": (1280, 720),
                "cam_d": (1280, 720),
                "cam_e": (1280, 720),
            }
        )

        layout = manager.calculate_layout(
            ["cam_a", "cam_p", "cam_b", "cam_c", "cam_d", "cam_e"],
            3,
        )

        self.assertIsNotNone(layout)
        assert layout is not None
        self._assert_no_overlaps(layout)

        cam_e = [
            position for row in layout for camera, position in row if camera == "cam_e"
        ][0]
        self.assertEqual(cam_e[0], 0)

    def test_multiple_portraits_reserve_distinct_ranges(self):
        """Multiple portrait cameras in one row should reserve separate spans below them."""
        manager = self._build_manager(
            {
                "cam_a": (640, 480),
                "cam_p1": (360, 640),
                "cam_p2": (360, 640),
                "cam_b": (640, 480),
                "cam_c": (1280, 720),
                "cam_d": (640, 480),
            }
        )

        layout = manager.calculate_layout(
            ["cam_a", "cam_p1", "cam_p2", "cam_b", "cam_c", "cam_d"],
            4,
        )

        self.assertIsNotNone(layout)
        assert layout is not None
        self._assert_no_overlaps(layout)

    def test_two_landscapes_then_portrait_then_two_landscapes(self):
        """A portrait after two landscapes should reserve only its own tail span."""
        manager = self._build_manager(
            {
                "cam_a": (1280, 720),
                "cam_b": (1280, 720),
                "cam_p": (360, 640),
                "cam_c": (1280, 720),
                "cam_d": (1280, 720),
            }
        )

        layout = manager.calculate_layout(
            ["cam_a", "cam_b", "cam_p", "cam_c", "cam_d"],
            3,
        )

        self.assertIsNotNone(layout)
        assert layout is not None
        self._assert_no_overlaps(layout)

        cam_c = [
            position for row in layout for camera, position in row if camera == "cam_c"
        ][0]
        cam_d = [
            position for row in layout for camera, position in row if camera == "cam_d"
        ][0]
        self.assertEqual(cam_c[0], 0)
        self.assertEqual(cam_d[0], cam_c[0] + cam_c[2])
