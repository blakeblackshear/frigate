from enum import Enum
from unittest import TestCase, main


class OnvifCommandEnum(str, Enum):
    """Subset of commands needed for testing (avoids importing onvif module)."""

    init = "init"
    move_down = "move_down"
    move_left = "move_left"
    move_relative = "move_relative"
    move_right = "move_right"
    move_up = "move_up"
    preset = "preset"
    stop = "stop"
    zoom_in = "zoom_in"
    zoom_out = "zoom_out"
    focus_in = "focus_in"
    focus_out = "focus_out"


class TestMoveRelativeParsing(TestCase):
    """Test the move_relative command parameter parsing logic.

    NOTE: _parse_move_relative replicates logic from
    OnvifController.handle_command_async (frigate/ptz/onvif.py).
    If that parsing changes, this helper must be updated to match.
    """

    def _parse_move_relative(self, param: str):
        """Replicate the parsing logic from OnvifController.handle_command_async."""
        parts = param.split("_")
        _, pan, tilt = parts[0], parts[1], parts[2]
        zoom = float(parts[3]) if len(parts) > 3 else 0
        return float(pan), float(tilt), zoom

    def test_pan_tilt_only(self):
        pan, tilt, zoom = self._parse_move_relative("relative_0.5_-0.3")
        self.assertAlmostEqual(pan, 0.5)
        self.assertAlmostEqual(tilt, -0.3)
        self.assertAlmostEqual(zoom, 0)

    def test_pan_tilt_with_zoom(self):
        pan, tilt, zoom = self._parse_move_relative("relative_0.5_-0.3_0.8")
        self.assertAlmostEqual(pan, 0.5)
        self.assertAlmostEqual(tilt, -0.3)
        self.assertAlmostEqual(zoom, 0.8)

    def test_zero_zoom(self):
        pan, tilt, zoom = self._parse_move_relative("relative_0.0_0.0_0.0")
        self.assertAlmostEqual(pan, 0.0)
        self.assertAlmostEqual(tilt, 0.0)
        self.assertAlmostEqual(zoom, 0.0)

    def test_negative_values(self):
        pan, tilt, zoom = self._parse_move_relative("relative_-1.0_-1.0_0.5")
        self.assertAlmostEqual(pan, -1.0)
        self.assertAlmostEqual(tilt, -1.0)
        self.assertAlmostEqual(zoom, 0.5)


class TestDispatcherPtzParsing(TestCase):
    """Test the dispatcher's _on_ptz_command parsing pipeline.

    Replicates the logic from FrigateDispatcher._on_ptz_command
    (frigate/comms/dispatcher.py) to verify that MQTT payloads are
    correctly decomposed into command + param.
    If that parsing changes, this helper must be updated to match.
    """

    def _parse_ptz_payload(self, payload: str):
        """Replicate dispatcher parsing from _on_ptz_command."""
        preset = payload.lower()

        if "preset" in preset:
            command = OnvifCommandEnum.preset
            param = preset[preset.index("_") + 1 :]
        elif "move_relative" in preset:
            command = OnvifCommandEnum.move_relative
            param = preset[preset.index("_") + 1 :]
        else:
            command = OnvifCommandEnum[preset]
            param = ""

        return command, param

    def test_move_relative_pan_tilt(self):
        command, param = self._parse_ptz_payload("move_relative_0.5_-0.3")
        self.assertEqual(command, OnvifCommandEnum.move_relative)
        self.assertEqual(param, "relative_0.5_-0.3")

    def test_move_relative_pan_tilt_zoom(self):
        command, param = self._parse_ptz_payload("move_relative_0.5_-0.3_0.8")
        self.assertEqual(command, OnvifCommandEnum.move_relative)
        self.assertEqual(param, "relative_0.5_-0.3_0.8")

    def test_simple_commands(self):
        for cmd_name in [
            "move_up",
            "move_down",
            "move_left",
            "move_right",
            "stop",
            "zoom_in",
            "zoom_out",
        ]:
            command, param = self._parse_ptz_payload(cmd_name)
            self.assertEqual(command, OnvifCommandEnum[cmd_name])
            self.assertEqual(param, "")

    def test_preset_command(self):
        command, param = self._parse_ptz_payload("preset_home")
        self.assertEqual(command, OnvifCommandEnum.preset)
        self.assertEqual(param, "home")

    def test_full_pipeline_pan_tilt_only(self):
        """Verify dispatcher param flows correctly into onvif parsing."""
        _, param = self._parse_ptz_payload("move_relative_0.5_-0.3")
        # Now parse as onvif.handle_command_async would
        parts = param.split("_")
        _, pan, tilt = parts[0], parts[1], parts[2]
        zoom = float(parts[3]) if len(parts) > 3 else 0
        self.assertAlmostEqual(float(pan), 0.5)
        self.assertAlmostEqual(float(tilt), -0.3)
        self.assertAlmostEqual(zoom, 0)

    def test_full_pipeline_with_zoom(self):
        """Verify dispatcher param flows correctly into onvif parsing with zoom."""
        _, param = self._parse_ptz_payload("move_relative_-0.2_0.7_0.65")
        parts = param.split("_")
        _, pan, tilt = parts[0], parts[1], parts[2]
        zoom = float(parts[3]) if len(parts) > 3 else 0
        self.assertAlmostEqual(float(pan), -0.2)
        self.assertAlmostEqual(float(tilt), 0.7)
        self.assertAlmostEqual(zoom, 0.65)


class TestDragToZoomCalculation(TestCase):
    """Test the drag-to-zoom math from LiveCameraView.

    Replicates the zoom calculation logic from handleOverlayMouseUp:
    given a drag rectangle on the video overlay, compute the pan, tilt,
    and zoom values sent to the backend.
    """

    def _calculate_drag_zoom(
        self, drag_start, drag_end, rect_left, rect_top, rect_width, rect_height
    ):
        """Replicate the drag-to-zoom calculation from LiveCameraView."""
        x1 = min(drag_start[0], drag_end[0])
        y1 = min(drag_start[1], drag_end[1])
        x2 = max(drag_start[0], drag_end[0])
        y2 = max(drag_start[1], drag_end[1])

        norm_x1 = (x1 - rect_left) / rect_width
        norm_y1 = (y1 - rect_top) / rect_height
        norm_x2 = (x2 - rect_left) / rect_width
        norm_y2 = (y2 - rect_top) / rect_height

        box_w = norm_x2 - norm_x1
        box_h = norm_y2 - norm_y1

        frame_aspect = rect_width / rect_height
        box_aspect = box_w / box_h
        if box_aspect > frame_aspect:
            box_h = box_w / frame_aspect
        else:
            box_w = box_h * frame_aspect

        center_x = (norm_x1 + norm_x2) / 2
        center_y = (norm_y1 + norm_y2) / 2
        pan = (center_x - 0.5) * 2
        tilt = (0.5 - center_y) * 2

        zoom = 1 - max(box_w, box_h)
        clamped_zoom = max(0, min(1, zoom))

        return pan, tilt, clamped_zoom

    def test_center_drag_half_frame(self):
        """Drag a box covering the center 50% of a 2:1 frame.

        Box is 500x250 = 0.5x0.5 normalized, but frame is 2:1.
        Aspect correction expands width: box_w = 0.5 * 2.0 = 1.0.
        zoom = 1 - max(1.0, 0.5) = 0.0.
        """
        pan, tilt, zoom = self._calculate_drag_zoom(
            (250, 125), (750, 375), 0, 0, 1000, 500
        )
        self.assertAlmostEqual(pan, 0.0)
        self.assertAlmostEqual(tilt, 0.0)
        self.assertAlmostEqual(zoom, 0.0)

    def test_center_drag_proportional_box(self):
        """Drag a box matching the frame's 2:1 aspect ratio at 50% size."""
        # Frame 1000x500, box 500x125 at center = 0.5 x 0.25 normalized
        # box_aspect = 0.5/0.25 = 2.0 = frame_aspect, no expansion
        # zoom = 1 - max(0.5, 0.25) = 0.5
        pan, tilt, zoom = self._calculate_drag_zoom(
            (250, 187), (750, 312), 0, 0, 1000, 500
        )
        self.assertAlmostEqual(pan, 0.0)
        self.assertAlmostEqual(tilt, 0.002)  # slight offset due to rounding
        self.assertAlmostEqual(zoom, 0.5)

    def test_top_left_drag(self):
        """Drag a box in the top-left quadrant of a 2:1 frame.

        Box is 0.5x0.5 normalized, aspect correction expands to 1.0 wide.
        """
        pan, tilt, zoom = self._calculate_drag_zoom((0, 0), (500, 250), 0, 0, 1000, 500)
        self.assertAlmostEqual(pan, -0.5)
        self.assertAlmostEqual(tilt, 0.5)
        self.assertAlmostEqual(zoom, 0.0)

    def test_bottom_right_drag(self):
        """Drag a box in the bottom-right quadrant of a 2:1 frame."""
        pan, tilt, zoom = self._calculate_drag_zoom(
            (500, 250), (1000, 500), 0, 0, 1000, 500
        )
        self.assertAlmostEqual(pan, 0.5)
        self.assertAlmostEqual(tilt, -0.5)
        self.assertAlmostEqual(zoom, 0.0)

    def test_full_frame_drag_no_zoom(self):
        """Dragging the entire frame should produce zero zoom."""
        pan, tilt, zoom = self._calculate_drag_zoom(
            (0, 0), (1000, 500), 0, 0, 1000, 500
        )
        self.assertAlmostEqual(pan, 0.0)
        self.assertAlmostEqual(tilt, 0.0)
        self.assertAlmostEqual(zoom, 0.0)

    def test_small_box_high_zoom(self):
        """A small box should produce high zoom."""
        # 10% box at center of 1000x500 frame
        # box is 100x50px = 0.1 x 0.1 normalized
        # box_aspect = 1.0 < frame_aspect 2.0, expand width: 0.1 * 2.0 = 0.2
        # zoom = 1 - max(0.2, 0.1) = 0.8
        pan, tilt, zoom = self._calculate_drag_zoom(
            (450, 225), (550, 275), 0, 0, 1000, 500
        )
        self.assertAlmostEqual(pan, 0.0)
        self.assertAlmostEqual(tilt, 0.0)
        self.assertAlmostEqual(zoom, 0.8)

    def test_aspect_ratio_correction_tall_box(self):
        """A tall narrow box should be expanded to match frame aspect ratio."""
        # Frame is 1000x500 (2:1 aspect)
        # Drag a tall box: 100px wide x 250px tall at center
        pan, tilt, zoom = self._calculate_drag_zoom(
            (450, 125), (550, 375), 0, 0, 1000, 500
        )
        # Raw box: 0.1 wide x 0.5 tall
        # box_aspect = 0.1/0.5 = 0.2, frame_aspect = 2.0
        # box is taller -> expand width: box_w = 0.5 * 2.0 = 1.0
        # zoom = 1 - max(1.0, 0.5) = 0.0
        self.assertAlmostEqual(pan, 0.0)
        self.assertAlmostEqual(tilt, 0.0)
        self.assertAlmostEqual(zoom, 0.0)

    def test_aspect_ratio_correction_wide_box(self):
        """A wide short box should be expanded to match frame aspect ratio."""
        # Frame is 1000x500 (2:1 aspect)
        # Drag a wide box: 800px wide x 100px tall at center
        pan, tilt, zoom = self._calculate_drag_zoom(
            (100, 200), (900, 300), 0, 0, 1000, 500
        )
        # Raw box: 0.8 wide x 0.2 tall
        # box_aspect = 0.8/0.2 = 4.0 > frame_aspect 2.0
        # box is wider -> expand height: box_h = 0.8/2.0 = 0.4
        # zoom = 1 - max(0.8, 0.4) = 0.2
        self.assertAlmostEqual(pan, 0.0)
        self.assertAlmostEqual(tilt, 0.0)
        self.assertAlmostEqual(zoom, 0.2)

    def test_offset_frame(self):
        """Frame not at origin (simulating element offset on page)."""
        # Frame at (100, 50), size 800x400 (2:1 aspect)
        # Drag center half: (300, 150) to (700, 350)
        # Normalized: 0.5x0.5, aspect correction expands width to 1.0
        # zoom = 1 - 1.0 = 0.0
        pan, tilt, zoom = self._calculate_drag_zoom(
            (300, 150), (700, 350), 100, 50, 800, 400
        )
        self.assertAlmostEqual(pan, 0.0)
        self.assertAlmostEqual(tilt, 0.0)
        self.assertAlmostEqual(zoom, 0.0)

    def test_reversed_drag_direction(self):
        """Dragging bottom-right to top-left should give same result as top-left to bottom-right."""
        result1 = self._calculate_drag_zoom((250, 125), (750, 375), 0, 0, 1000, 500)
        result2 = self._calculate_drag_zoom((750, 375), (250, 125), 0, 0, 1000, 500)
        for a, b in zip(result1, result2):
            self.assertAlmostEqual(a, b)


if __name__ == "__main__":
    main(verbosity=2)
