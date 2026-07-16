"""Tests for frigate.util.builtin helpers."""

import unittest
from unittest.mock import patch

from frigate.util.builtin import EventsPerSecond


class TestEventsPerSecond(unittest.TestCase):
    def test_eps_is_zero_before_any_events(self) -> None:
        eps = EventsPerSecond()
        with patch("frigate.util.builtin.time.monotonic", return_value=100.0):
            self.assertEqual(eps.eps(), 0.0)

    def test_eps_counts_events_in_window(self) -> None:
        eps = EventsPerSecond(last_n_seconds=10)
        clock = [1000.0]
        with patch("frigate.util.builtin.time.monotonic", side_effect=lambda: clock[0]):
            eps.start()
            # one event per second for five seconds
            for _ in range(5):
                clock[0] += 1.0
                eps.update()
            # five events over the five seconds since start
            self.assertAlmostEqual(eps.eps(), 1.0)

    def test_old_timestamps_expire_from_window(self) -> None:
        eps = EventsPerSecond(last_n_seconds=10)
        clock = [0.0]
        with patch("frigate.util.builtin.time.monotonic", side_effect=lambda: clock[0]):
            eps.start()
            for _ in range(10):
                clock[0] += 1.0
                eps.update()
            # jump well past the window so every timestamp ages out
            clock[0] += 100.0
            self.assertEqual(eps.eps(), 0.0)


if __name__ == "__main__":
    unittest.main()
