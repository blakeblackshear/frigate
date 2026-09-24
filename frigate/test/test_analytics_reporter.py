"""Tests for the analytics reporter's schedule and consent handling."""

import os
import tempfile
import threading
import unittest
from unittest.mock import Mock, patch

from frigate.analytics import reporter as reporter_module
from frigate.analytics.reporter import (
    FIRST_DELAY_S,
    INTERVAL_S,
    JITTER_S,
    PROMPT_KIND,
    WAKE_S,
    AnalyticsReporter,
)
from frigate.analytics.state import AnalyticsState, load_state, save_state
from frigate.analytics.transport import SendOutcome
from frigate.config.holder import ConfigHolder
from frigate.test.analytics_helpers import make_config

SNAPSHOT = [
    {
        "kind": "detector_stuck",
        "occurrences": 3,
        "dismissals": 0,
        "reported_occurrences": 1,
        "reported_dismissals": 0,
    }
]


class TestAnalyticsReporter(unittest.TestCase):
    def setUp(self):
        self.dir = tempfile.TemporaryDirectory()
        self.addCleanup(self.dir.cleanup)
        self.path = os.path.join(self.dir.name, ".analytics.json")
        self.now = 1_790_000_000.0
        self.send = Mock(return_value=SendOutcome.accepted)
        self.registry = Mock()
        self.registry.stats.return_value = SNAPSHOT
        self.stats = Mock()
        self.stats.get_latest_stats.return_value = {}
        self.holder = ConfigHolder(make_config({"telemetry": {"analytics": True}}))

        for name in ("raise_notice", "resolve_notice"):
            patcher = patch.object(reporter_module, name)
            setattr(self, name, patcher.start())
            self.addCleanup(patcher.stop)

        self.built = Mock()
        self.built.model_dump_json.return_value = '{"report": 1}'
        patcher = patch.object(reporter_module, "build_report", return_value=self.built)
        self.build_report = patcher.start()
        self.addCleanup(patcher.stop)

    def reporter(self, path: str | None = None) -> AnalyticsReporter:
        # uniform(a, b) returns a: the shortest startup delay and interval
        rng = Mock()
        rng.uniform.side_effect = lambda low, high: low

        return AnalyticsReporter(
            self.holder,
            self.stats,
            self.registry,
            threading.Event(),
            state_path=path or self.path,
            url="https://example.test/report",
            send=self.send,
            clock=lambda: self.now,
            rng=rng,
        )

    def advance(self, seconds: float) -> None:
        self.now += seconds

    def test_waits_for_the_startup_delay_then_sends(self):
        reporter = self.reporter()

        reporter.tick()
        self.send.assert_not_called()

        self.advance(FIRST_DELAY_S[0])
        reporter.tick()

        self.send.assert_called_once_with(
            "https://example.test/report", '{"report": 1}'
        )
        self.registry.mark_reported.assert_called_once_with(SNAPSHOT)
        self.assertEqual(load_state(self.path).last_attempt_at, self.now)

    def test_sends_once_per_interval(self):
        reporter = self.reporter()
        self.advance(FIRST_DELAY_S[0])
        reporter.tick()

        self.advance(WAKE_S)
        reporter.tick()
        self.assertEqual(self.send.call_count, 1)

        self.advance(INTERVAL_S - JITTER_S)
        reporter.tick()
        self.assertEqual(self.send.call_count, 2)

    def test_a_restart_inside_the_interval_does_not_send(self):
        save_state(AnalyticsState("a" * 32, self.now), self.path)
        reporter = self.reporter()

        self.advance(FIRST_DELAY_S[0])
        reporter.tick()

        self.send.assert_not_called()

    def test_a_failed_send_keeps_watermarks_and_waits_a_full_interval(self):
        self.send.return_value = SendOutcome.failed
        reporter = self.reporter()
        self.advance(FIRST_DELAY_S[0])

        reporter.tick()
        self.advance(WAKE_S)
        reporter.tick()

        self.assertEqual(self.send.call_count, 1)
        self.registry.mark_reported.assert_not_called()

    def test_an_accepted_report_without_health_keeps_the_watermarks(self):
        self.built.health = None
        reporter = self.reporter()
        self.advance(FIRST_DELAY_S[0])

        reporter.tick()

        self.send.assert_called_once()
        self.registry.mark_reported.assert_not_called()

    def test_consent_withdrawn_while_the_report_builds_stops_the_send(self):
        reporter = self.reporter()
        self.advance(FIRST_DELAY_S[0])

        def withdraw(*args, **kwargs):
            self.holder.set(make_config())
            return self.built

        self.build_report.side_effect = withdraw
        reporter.tick()

        self.send.assert_not_called()
        self.assertFalse(os.path.exists(self.path))

    def test_turning_sharing_off_and_on_between_wakes_starts_a_fresh_identity(self):
        save_state(AnalyticsState("a" * 32, 0.0), self.path)
        reporter = self.reporter()
        reporter.tick()

        self.holder.set(make_config())
        self.holder.set(make_config({"telemetry": {"analytics": True}}))
        self.advance(FIRST_DELAY_S[0])
        reporter.tick()

        self.raise_notice.assert_called_once_with(PROMPT_KIND)
        self.assertNotEqual(load_state(self.path).install_id, "a" * 32)

    def test_opting_out_raises_the_prompt_once_and_deletes_the_state(self):
        self.holder.set(make_config())
        save_state(AnalyticsState("a" * 32, 0.0), self.path)
        reporter = self.reporter()

        reporter.tick()
        reporter.tick()

        self.raise_notice.assert_called_once_with(PROMPT_KIND)
        self.assertFalse(os.path.exists(self.path))
        self.send.assert_not_called()

    def test_opting_in_resolves_the_prompt(self):
        self.holder.set(make_config())
        reporter = self.reporter()
        reporter.tick()

        self.holder.set(make_config({"telemetry": {"analytics": True}}))
        reporter.tick()

        self.resolve_notice.assert_called_once_with(PROMPT_KIND)

    def test_safe_mode_touches_nothing(self):
        self.holder.set(make_config({"safe_mode": True}))
        save_state(AnalyticsState("a" * 32, 0.0), self.path)
        reporter = self.reporter()

        self.advance(FIRST_DELAY_S[0])
        reporter.tick()

        self.raise_notice.assert_not_called()
        self.assertTrue(os.path.exists(self.path))
        self.send.assert_not_called()

    def test_an_unwritable_config_dir_skips_sending_and_warns_once(self):
        reporter = self.reporter(os.path.join(self.dir.name, "missing", "x.json"))
        self.advance(FIRST_DELAY_S[0])

        with self.assertLogs("frigate.analytics.reporter", "WARNING") as logs:
            reporter.tick()
            self.advance(WAKE_S)
            reporter.tick()

        self.send.assert_not_called()
        self.assertEqual(len(logs.output), 1)

    def test_a_last_attempt_in_the_future_is_ignored(self):
        save_state(AnalyticsState("a" * 32, self.now + 10 * INTERVAL_S), self.path)
        reporter = self.reporter()

        self.advance(FIRST_DELAY_S[0])
        reporter.tick()

        self.send.assert_called_once()

    def test_the_loop_survives_a_failing_tick(self):
        reporter = self.reporter()
        reporter.stop_event.set()

        with (
            patch.object(reporter, "tick", side_effect=RuntimeError("boom")),
            self.assertLogs("frigate.analytics.reporter", "ERROR"),
        ):
            reporter.run()
