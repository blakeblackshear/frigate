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


class TestAnalyticsReporter(unittest.TestCase):
    def setUp(self):
        self.dir = tempfile.TemporaryDirectory()
        self.addCleanup(self.dir.cleanup)
        self.path = os.path.join(self.dir.name, ".analytics.json")
        self.config_path = os.path.join(self.dir.name, "config.yml")
        self.save_config("telemetry:\n  analytics: true\n")
        self.now = 1_790_000_000.0
        self.send = Mock(return_value=SendOutcome.accepted)
        self.registry = Mock()
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

    def save_config(self, text: str) -> None:
        with open(self.config_path, "w") as f:
            f.write(text)

    def seed_state(self, last_attempt_at: float = 0.0) -> None:
        save_state(AnalyticsState("a" * 32, last_attempt_at), self.path)

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
            config_path=self.config_path,
            url="https://example.test/report",
            send=self.send,
            clock=lambda: self.now,
            rng=rng,
        )

    def advance(self, seconds: float) -> None:
        self.now += seconds

    def test_waits_for_the_startup_delay_then_sends(self):
        self.seed_state()
        reporter = self.reporter()

        reporter.tick()
        self.send.assert_not_called()

        self.advance(FIRST_DELAY_S[0])
        reporter.tick()

        self.send.assert_called_once_with(
            "https://example.test/report", '{"report": 1}'
        )
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
        self.seed_state(self.now)
        reporter = self.reporter()

        self.advance(FIRST_DELAY_S[0])
        reporter.tick()

        self.send.assert_not_called()

    def test_a_failed_send_waits_a_full_interval(self):
        self.send.return_value = SendOutcome.failed
        self.seed_state()
        reporter = self.reporter()
        self.advance(FIRST_DELAY_S[0])

        reporter.tick()
        self.advance(WAKE_S)
        reporter.tick()

        self.assertEqual(self.send.call_count, 1)

    def assert_reset_before_the_state_file(self) -> None:
        # the baseline must be in place before the file names the new ID
        self.registry.reset_analytics_baseline.side_effect = lambda: self.assertIsNone(
            load_state(self.path)
        )

    def test_the_opt_in_resets_the_baseline_and_writes_the_identity(self):
        self.assert_reset_before_the_state_file()
        reporter = self.reporter()

        # consent is seen on the first wake, well before the first send
        reporter.tick()
        self.registry.reset_analytics_baseline.assert_called_once()
        self.assertIsNotNone(load_state(self.path))
        self.send.assert_not_called()

        # the first report counts from that reset, so nothing resets again
        self.advance(FIRST_DELAY_S[0])
        reporter.tick()

        self.send.assert_called_once()
        self.registry.reset_analytics_baseline.assert_called_once()

    def test_a_restart_with_saved_state_keeps_the_baseline(self):
        self.seed_state()
        reporter = self.reporter()
        self.advance(FIRST_DELAY_S[0])

        reporter.tick()

        self.send.assert_called_once()
        self.registry.reset_analytics_baseline.assert_not_called()

    def test_a_settings_opt_in_resets_the_baseline_when_saved(self):
        self.holder.set(make_config())
        reporter = self.reporter()
        reporter.tick()

        self.holder.set(make_config({"telemetry": {"analytics": True}}))

        self.registry.reset_analytics_baseline.assert_called_once()
        self.assertIsNotNone(load_state(self.path))

    def test_a_re_opt_in_during_the_request_keeps_its_new_identity(self):
        self.seed_state()
        reporter = self.reporter()
        self.advance(FIRST_DELAY_S[0])
        created = []

        def flip_consent(*args):
            self.holder.set(make_config())
            self.holder.set(make_config({"telemetry": {"analytics": True}}))
            created.append(load_state(self.path))
            return SendOutcome.accepted

        self.send.side_effect = flip_consent
        reporter.tick()

        # nothing after the send touches the new identity or its baseline
        self.assertNotEqual(created[0].install_id, "a" * 32)
        self.assertEqual(load_state(self.path), created[0])
        self.registry.reset_analytics_baseline.assert_called_once()

    def test_an_opt_in_without_a_writable_state_file_resets_again_later(self):
        state_dir = os.path.join(self.dir.name, "missing")
        reporter = self.reporter(os.path.join(state_dir, ".analytics.json"))

        with self.assertLogs("frigate.analytics.reporter", "WARNING"):
            reporter.tick()
            self.advance(FIRST_DELAY_S[0])
            reporter.tick()

        self.send.assert_not_called()
        os.mkdir(state_dir)
        self.registry.reset_analytics_baseline.reset_mock()
        self.advance(WAKE_S)
        reporter.tick()

        self.send.assert_called_once()
        self.registry.reset_analytics_baseline.assert_called_once()

    def test_an_opt_out_saved_only_to_the_file_stops_the_send(self):
        self.seed_state()
        self.save_config("telemetry:\n  analytics: false\n")
        reporter = self.reporter()
        self.advance(FIRST_DELAY_S[0])

        reporter.tick()

        self.send.assert_not_called()
        self.assertFalse(os.path.exists(self.path))
        self.raise_notice.assert_not_called()

    def test_reversing_a_file_only_opt_out_resets_the_baseline(self):
        self.seed_state()
        self.save_config("telemetry:\n  analytics: false\n")
        reporter = self.reporter()
        self.advance(FIRST_DELAY_S[0])
        reporter.tick()

        self.save_config("telemetry:\n  analytics: true\n")
        self.assert_reset_before_the_state_file()
        self.advance(WAKE_S)
        reporter.tick()

        self.assertNotEqual(load_state(self.path).install_id, "a" * 32)
        self.registry.reset_analytics_baseline.assert_called_once()
        self.send.assert_called_once()

    def test_yaml_truthy_spellings_in_the_file_count_as_consent(self):
        for value in ("yes", "on", "1", "'true'"):
            with self.subTest(value=value):
                self.seed_state()
                self.send.reset_mock()
                self.save_config(f"telemetry:\n  analytics: {value}\n")
                reporter = self.reporter()
                self.advance(FIRST_DELAY_S[0])

                reporter.tick()

                self.send.assert_called_once()
                self.assertTrue(os.path.exists(self.path))

    def test_an_unreadable_config_file_falls_back_to_the_live_config(self):
        self.seed_state()
        self.save_config("telemetry: [unclosed\n")
        reporter = self.reporter()
        self.advance(FIRST_DELAY_S[0])

        reporter.tick()

        self.send.assert_called_once()

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
        self.seed_state()
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
        self.seed_state()
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
        self.seed_state()
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
        self.seed_state(self.now + 10 * INTERVAL_S)
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
