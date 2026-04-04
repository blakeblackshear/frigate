import unittest

from pydantic import ValidationError

from frigate.config.camera.notification import (
    NotificationConfig,
    parse_duration_to_minutes,
)


class TestParseDurationToMinutes(unittest.TestCase):
    def test_minutes(self):
        self.assertEqual(parse_duration_to_minutes("5m"), 5)
        self.assertEqual(parse_duration_to_minutes("1m"), 1)
        self.assertEqual(parse_duration_to_minutes("120m"), 120)

    def test_hours(self):
        self.assertEqual(parse_duration_to_minutes("1h"), 60)
        self.assertEqual(parse_duration_to_minutes("24h"), 24 * 60)

    def test_days(self):
        self.assertEqual(parse_duration_to_minutes("1d"), 24 * 60)
        self.assertEqual(parse_duration_to_minutes("7d"), 7 * 24 * 60)

    def test_weeks(self):
        self.assertEqual(parse_duration_to_minutes("1w"), 7 * 24 * 60)
        self.assertEqual(parse_duration_to_minutes("2w"), 2 * 7 * 24 * 60)

    def test_case_insensitive(self):
        self.assertEqual(parse_duration_to_minutes("5M"), 5)
        self.assertEqual(parse_duration_to_minutes("1H"), 60)

    def test_whitespace_stripped(self):
        self.assertEqual(parse_duration_to_minutes("  5m  "), 5)
        self.assertEqual(parse_duration_to_minutes(" 1h"), 60)

    def test_invalid_format(self):
        with self.assertRaises(ValueError):
            parse_duration_to_minutes("abc")
        with self.assertRaises(ValueError):
            parse_duration_to_minutes("5x")
        with self.assertRaises(ValueError):
            parse_duration_to_minutes("m5")
        with self.assertRaises(ValueError):
            parse_duration_to_minutes("")

    def test_zero_rejected_by_regex(self):
        with self.assertRaises(ValueError):
            parse_duration_to_minutes("0h")

    def test_plain_zero_rejected(self):
        with self.assertRaises(ValueError):
            parse_duration_to_minutes("0")


class TestNotificationConfigSuspendDurations(unittest.TestCase):
    def test_default_durations(self):
        config = NotificationConfig()
        self.assertEqual(
            config.suspend_durations,
            ["5m", "10m", "30m", "1h", "12h", "24h", "until_restart"],
        )

    def test_empty_list_rejected(self):
        with self.assertRaises(ValidationError):
            NotificationConfig(suspend_durations=[])

    def test_invalid_duration_rejected(self):
        with self.assertRaises(ValidationError):
            NotificationConfig(suspend_durations=["5m", "10m", "invalid"])

    def test_durations_sorted_ascending(self):
        config = NotificationConfig(suspend_durations=["1h", "5m", "24h", "10m"])
        self.assertEqual(config.suspend_durations, ["5m", "10m", "1h", "24h"])

    def test_until_restart_always_last(self):
        config = NotificationConfig(suspend_durations=["until_restart", "1h", "5m"])
        self.assertEqual(config.suspend_durations, ["5m", "1h", "until_restart"])


if __name__ == "__main__":
    unittest.main()
