"""Tests for get_dst_transitions."""

import datetime
import unittest

from frigate.util.time import get_dst_transitions


class TestDstTransitions(unittest.TestCase):
    def test_dst_transition_splits_periods_at_the_transition(self):
        start = datetime.datetime(2026, 3, 7, 12, tzinfo=datetime.UTC).timestamp()
        end = start + 2 * 86400
        spring = datetime.datetime(2026, 3, 8, 7, tzinfo=datetime.UTC).timestamp()
        self.assertEqual(
            get_dst_transitions("America/New_York", start, end),
            [(start, spring, -18000), (spring, end, -14400)],
        )

    def test_dst_transition_is_not_reported_a_day_late(self):
        # local midnight on the day of the change used to report the
        # transition a full day after it actually happened
        start = datetime.datetime(2024, 3, 10, 5, tzinfo=datetime.UTC).timestamp()
        end = start + 3 * 86400
        spring = datetime.datetime(2024, 3, 10, 7, tzinfo=datetime.UTC).timestamp()
        self.assertEqual(
            get_dst_transitions("America/New_York", start, end),
            [(start, spring, -18000), (spring, end, -14400)],
        )

    def test_dst_transition_after_the_last_daily_probe_is_found(self):
        start = datetime.datetime(2024, 11, 2, 12, tzinfo=datetime.UTC).timestamp()
        end = datetime.datetime(2024, 11, 3, 10, tzinfo=datetime.UTC).timestamp()
        fall = datetime.datetime(2024, 11, 3, 6, tzinfo=datetime.UTC).timestamp()
        self.assertEqual(
            get_dst_transitions("America/New_York", start, end),
            [(start, fall, -14400), (fall, end, -18000)],
        )

    def test_no_transition_returns_a_single_period(self):
        start = datetime.datetime(2026, 6, 1, tzinfo=datetime.UTC).timestamp()
        end = start + 5 * 86400
        self.assertEqual(
            get_dst_transitions("America/New_York", start, end),
            [(start, end, -14400)],
        )

    def test_invalid_zone_retains_utc_fallback(self):
        self.assertEqual(
            get_dst_transitions("Invalid/Timezone", 100, 200), [(100, 200, 0)]
        )


if __name__ == "__main__":
    unittest.main(verbosity=2)
