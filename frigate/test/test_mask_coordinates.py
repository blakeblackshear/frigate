"""Tests for mask coordinate normalization and rasterization."""

import unittest
from itertools import product

import numpy as np

from frigate.config.config import RuntimeFilterConfig, RuntimeMotionConfig


class TestMaskCoordinates(unittest.TestCase):
    def test_relative_coordinate_precision(self):
        cases = (
            ("0.000,0.000,{edge},0.000,{edge},0.400,0.000,0.400", slice(0, 41)),
            ("0.000,0.700,{edge},0.700,{edge},{edge},0.000,{edge}", slice(70, 100)),
        )
        for config_type, (template, rows), edge, as_list in product(
            (RuntimeMotionConfig, RuntimeFilterConfig),
            cases,
            ("1", "1.0", "1.00", "1.000", "1.000000"),
            (False, True),
        ):
            coordinates = template.format(edge=edge)
            if as_list:
                coordinates = [coordinates]
            with self.subTest(
                config_type=config_type.__name__, coordinates=coordinates
            ):
                config = config_type(
                    frame_shape=(100, 200),
                    mask={"test_mask": {"coordinates": coordinates}},
                )
                expected = np.full((100, 200), 255, dtype=np.uint8)
                expected[rows] = 0

                np.testing.assert_array_equal(config.rasterized_mask, expected)
                self.assertEqual(config.mask["test_mask"].coordinates, coordinates)

    def test_pixel_coordinates(self):
        pixel_mask = "0,0,200,0,200,40,0,40"
        relative_mask = "0.000,0.700,1.000,0.700,1.000,1.000,0.000,1.000"
        for config_type, coordinates in product(
            (RuntimeMotionConfig, RuntimeFilterConfig),
            (pixel_mask, [pixel_mask], [pixel_mask, relative_mask]),
        ):
            with self.subTest(
                config_type=config_type.__name__, coordinates=coordinates
            ):
                config = config_type(
                    frame_shape=(100, 200),
                    mask={"test_mask": {"coordinates": coordinates}},
                )
                expected = np.full((100, 200), 255, dtype=np.uint8)
                expected[:41] = 0
                if isinstance(coordinates, list) and len(coordinates) == 2:
                    expected[70:] = 0

                np.testing.assert_array_equal(config.rasterized_mask, expected)
