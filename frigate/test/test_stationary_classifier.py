"""Tests for stationary object classification thresholds."""

import unittest

from frigate.track.stationary_classifier import (
    DEFAULT_OBJECT_THRESHOLDS,
    DYNAMIC_OBJECT_THRESHOLDS,
    NON_STATIONARY_OBJECT_THRESHOLDS,
    STATIONARY_OBJECT_THRESHOLDS,
    StationaryThresholds,
    get_stationary_threshold,
)


class TestStationaryThresholds(unittest.TestCase):
    def test_known_labels_return_expected_singletons(self) -> None:
        self.assertIs(get_stationary_threshold("package"), STATIONARY_OBJECT_THRESHOLDS)
        self.assertIs(get_stationary_threshold("car"), DYNAMIC_OBJECT_THRESHOLDS)
        self.assertIs(
            get_stationary_threshold("license_plate"),
            NON_STATIONARY_OBJECT_THRESHOLDS,
        )

    def test_unknown_label_returns_shared_default(self) -> None:
        # an unknown label must reuse the shared default instance, not allocate
        # a fresh one on every call (this runs per object per frame)
        first = get_stationary_threshold("person")
        second = get_stationary_threshold("dog")
        self.assertIs(first, DEFAULT_OBJECT_THRESHOLDS)
        self.assertIs(second, DEFAULT_OBJECT_THRESHOLDS)

    def test_default_matches_a_fresh_instance(self) -> None:
        # the shared default must be value-equivalent to the previous
        # per-call StationaryThresholds()
        self.assertEqual(DEFAULT_OBJECT_THRESHOLDS, StationaryThresholds())


if __name__ == "__main__":
    unittest.main()
