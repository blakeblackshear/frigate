from unittest import TestCase, main


class TestMoveRelativeParsing(TestCase):
    """Test the move_relative command parameter parsing logic."""

    def _parse_move_relative(self, param: str):
        """Replicate the parsing logic from OnvifController.handle_command_async."""
        parts = param.split("_")
        _, pan, tilt = parts[0], parts[1], parts[2]
        zoom = float(parts[3]) if len(parts) > 3 else 0
        return float(pan), float(tilt), zoom

    def test_pan_tilt_only(self):
        pan, tilt, zoom = self._parse_move_relative("move_0.5_-0.3")
        self.assertAlmostEqual(pan, 0.5)
        self.assertAlmostEqual(tilt, -0.3)
        self.assertAlmostEqual(zoom, 0)

    def test_pan_tilt_with_zoom(self):
        pan, tilt, zoom = self._parse_move_relative("move_0.5_-0.3_0.8")
        self.assertAlmostEqual(pan, 0.5)
        self.assertAlmostEqual(tilt, -0.3)
        self.assertAlmostEqual(zoom, 0.8)

    def test_zero_zoom(self):
        pan, tilt, zoom = self._parse_move_relative("move_0.0_0.0_0.0")
        self.assertAlmostEqual(pan, 0.0)
        self.assertAlmostEqual(tilt, 0.0)
        self.assertAlmostEqual(zoom, 0.0)

    def test_negative_values(self):
        pan, tilt, zoom = self._parse_move_relative("move_-1.0_-1.0_0.5")
        self.assertAlmostEqual(pan, -1.0)
        self.assertAlmostEqual(tilt, -1.0)
        self.assertAlmostEqual(zoom, 0.5)


if __name__ == "__main__":
    main(verbosity=2)
