import unittest

from frigate.util.time import get_normalized_tz_name


class TestGetNormalizedTzName(unittest.TestCase):
    def test_valid(self):
        cases = [
            ("utc", "UTC"),
            ("america/new_york", "America/New_York"),
        ]

        for tz_name, expected in cases:
            with self.subTest(tz_name=tz_name):
                self.assertEqual(get_normalized_tz_name(tz_name), expected)

    def test_invalid(self):
        with self.assertRaisesRegex(ValueError, r"Unknown timezone: foo/bar"):
            get_normalized_tz_name("foo/bar")
