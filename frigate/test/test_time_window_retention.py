import unittest

from frigate.config.camera.record import (
    RecordRetainConfig,
    _matches_time_window,
    _parse_time_window,
)


class TestTimeWindowParsing(unittest.TestCase):
    def test_parse_time_only(self):
        result = _parse_time_window("07:00-18:00")
        self.assertIsNone(result["weekdays"])
        self.assertEqual(result["start"], 7 * 60)
        self.assertEqual(result["end"], 18 * 60)

    def test_parse_single_day(self):
        result = _parse_time_window("mon 09:00-17:00")
        self.assertEqual(result["weekdays"], [0])
        self.assertEqual(result["start"], 9 * 60)
        self.assertEqual(result["end"], 17 * 60)

    def test_parse_day_range(self):
        result = _parse_time_window("mon-fri 07:00-23:00")
        self.assertEqual(result["weekdays"], [0, 1, 2, 3, 4])

    def test_parse_day_range_wrap(self):
        result = _parse_time_window("fri-mon 10:00-16:00")
        self.assertEqual(result["weekdays"], [4, 5, 6, 0])

    def test_parse_full_day_names(self):
        result = _parse_time_window("monday-friday 08:00-18:00")
        self.assertEqual(result["weekdays"], [0, 1, 2, 3, 4])

    def test_parse_invalid_format(self):
        with self.assertRaises(ValueError):
            _parse_time_window("invalid")

    def test_parse_invalid_weekday(self):
        with self.assertRaises(ValueError):
            _parse_time_window("xyz 10:00-12:00")


class TestTimeWindowMatching(unittest.TestCase):
    def test_match_all_days(self):
        windows = [_parse_time_window("07:00-23:00")]
        self.assertTrue(_matches_time_window(windows, 0, 12, 0))
        self.assertTrue(_matches_time_window(windows, 6, 12, 0))
        self.assertFalse(_matches_time_window(windows, 0, 3, 0))

    def test_match_weekday_range(self):
        windows = [_parse_time_window("mon-fri 09:00-17:00")]
        self.assertTrue(_matches_time_window(windows, 2, 12, 0))
        self.assertFalse(_matches_time_window(windows, 5, 12, 0))
        self.assertFalse(_matches_time_window(windows, 2, 8, 0))

    def test_match_overnight(self):
        windows = [_parse_time_window("22:00-06:00")]
        self.assertTrue(_matches_time_window(windows, 0, 23, 0))
        self.assertTrue(_matches_time_window(windows, 0, 3, 0))
        self.assertFalse(_matches_time_window(windows, 0, 12, 0))

    def test_match_multiple_windows(self):
        windows = [
            _parse_time_window("mon-fri 07:00-18:00"),
            _parse_time_window("sat-sun 10:00-16:00"),
        ]
        self.assertTrue(_matches_time_window(windows, 0, 12, 0))
        self.assertTrue(_matches_time_window(windows, 5, 12, 0))
        self.assertFalse(_matches_time_window(windows, 5, 8, 0))


class TestRecordRetainConfig(unittest.TestCase):
    def test_no_hours_always_retained(self):
        config = RecordRetainConfig()
        self.assertTrue(config.is_in_retention_window(0, 3, 0))

    def test_hours_filters_correctly(self):
        config = RecordRetainConfig(hours=["mon-fri 09:00-17:00"])
        self.assertTrue(config.is_in_retention_window(0, 12, 0))
        self.assertFalse(config.is_in_retention_window(0, 20, 0))

    def test_defaults(self):
        config = RecordRetainConfig()
        self.assertIsNone(config.days)
        self.assertEqual(config.always_retain, 24)
