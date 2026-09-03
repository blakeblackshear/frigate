"""Tests for the daily latest version refresh and the update notice."""

import unittest
from unittest.mock import MagicMock, patch

from frigate.stats import emitter
from frigate.stats.util import is_newer_version


class TestIsNewerVersion(unittest.TestCase):
    def test_newer(self):
        self.assertTrue(is_newer_version("0.18.1-abcdef", "0.19.0"))
        self.assertTrue(is_newer_version("0.19.0-abcdef", "0.19.1"))
        self.assertTrue(is_newer_version("0.19.0-abcdef", "1.0.0"))

    def test_not_newer(self):
        self.assertFalse(is_newer_version("0.19.0-abcdef", "0.19.0"))
        self.assertFalse(is_newer_version("0.19.1-abcdef", "0.19.0"))
        self.assertFalse(is_newer_version("0.19.0-abcdef", "0.19.0-beta2"))

    def test_prerelease_is_behind_its_final_release(self):
        self.assertTrue(is_newer_version("0.19.0-beta2", "0.19.0"))
        self.assertTrue(is_newer_version("0.19.0-rc1", "0.19.0"))
        self.assertTrue(is_newer_version("0.19.0-RC1", "0.19.0"))

    def test_prerelease_of_a_later_line_is_not_behind(self):
        self.assertFalse(is_newer_version("0.20.0-beta1", "0.19.0"))
        self.assertFalse(is_newer_version("0.19.0-beta2", "0.19.0-beta2"))

    def test_unparseable_is_never_newer(self):
        self.assertFalse(is_newer_version("0.19.0-abcdef", "disabled"))
        self.assertFalse(is_newer_version("0.19.0-abcdef", "unknown"))
        self.assertFalse(is_newer_version("dev", "0.19.0"))


class TestUpdateNotice(unittest.TestCase):
    def _emitter(self, latest: str) -> emitter.StatsEmitter:
        stats_emitter = emitter.StatsEmitter.__new__(emitter.StatsEmitter)
        stats_emitter.config = MagicMock()
        stats_emitter.stats_tracking = {"latest_frigate_version": latest}
        stats_emitter.notice_registry = MagicMock()
        return stats_emitter

    def test_newer_release_raises(self):
        stats_emitter = self._emitter("0.19.0")

        with patch.object(emitter, "VERSION", "0.18.1-abcdef"):
            stats_emitter._check_update_notice()

        stats_emitter.notice_registry.raise_notice.assert_called_once_with(
            "update_available", params={"version": "0.19.0"}
        )
        stats_emitter.notice_registry.resolve.assert_not_called()

    def test_current_or_disabled_resolves(self):
        for latest in ("0.18.1", "disabled", "unknown"):
            stats_emitter = self._emitter(latest)

            with patch.object(emitter, "VERSION", "0.18.1-abcdef"):
                stats_emitter._check_update_notice()

            stats_emitter.notice_registry.raise_notice.assert_not_called()
            stats_emitter.notice_registry.resolve.assert_called_once_with(
                "update_available"
            )

    def test_refresh_updates_tracking_on_a_thread_then_checks(self):
        stats_emitter = self._emitter("0.18.0")

        with (
            patch.object(emitter, "get_latest_version", return_value="0.19.0"),
            patch.object(emitter, "VERSION", "0.18.1-abcdef"),
            patch.object(emitter.threading, "Thread") as thread,
        ):
            stats_emitter._refresh_latest_version()
            thread.return_value.start.assert_called_once()
            # run the thread body inline
            thread.call_args.kwargs["target"]()

        self.assertEqual(
            stats_emitter.stats_tracking["latest_frigate_version"], "0.19.0"
        )
        stats_emitter.notice_registry.raise_notice.assert_called_once()
