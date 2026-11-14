"""Tests for relative and legacy zone coordinates."""

import unittest
from itertools import product

import numpy as np

from frigate.config.camera.zone import ZoneConfig


class TestZoneCoordinates(unittest.TestCase):
    def test_relative_coordinate_precision(self):
        expected = np.array([[0, 0], [200, 0], [200, 40], [0, 40]])

        for edge, as_list in product(
            ("1", "1.0", "1.00", "1.000", "1.000000"), (False, True)
        ):
            points = ["0,0", f"{edge},0", f"{edge},0.4", "0,0.4"]
            coordinates = points if as_list else ",".join(points)

            with self.subTest(coordinates=coordinates):
                zone = ZoneConfig(coordinates=coordinates)
                zone.generate_contour((100, 200))

                np.testing.assert_array_equal(zone.contour, expected)
                self.assertEqual(zone.coordinates, coordinates)

    def test_invalid_coordinates(self):
        for points in (
            ["invalid,0", "1,0", "1,0.4", "0,0.4"],
            ["0,invalid", "1,0", "1,0.4", "0,0.4"],
        ):
            for coordinates in (",".join(points), points):
                with self.subTest(coordinates=coordinates):
                    zone = ZoneConfig(coordinates=coordinates)
                    with self.assertRaisesRegex(
                        ValueError, "Invalid coordinates found in configuration file"
                    ):
                        zone.generate_contour((100, 200))

    def test_pixel_coordinates(self):
        points = ["0,0", "200,0", "200,40", "0,40"]
        expected = np.array([[0, 0], [200, 0], [200, 40], [0, 40]])

        for coordinates in (",".join(points), points):
            with self.subTest(coordinates=coordinates):
                zone = ZoneConfig(coordinates=coordinates)
                zone.generate_contour((100, 200))

                np.testing.assert_array_equal(zone.contour, expected)
                self.assertEqual(zone.coordinates, "0.0,0.0,1.0,0.0,1.0,0.4,0.0,0.4")
