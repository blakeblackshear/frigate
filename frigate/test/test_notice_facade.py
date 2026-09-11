"""Tests for raising and resolving notices through frigate.notices."""

import unittest
from unittest.mock import MagicMock, patch

from frigate import notices


class TestNoticeFacade(unittest.TestCase):
    def tearDown(self):
        notices.install_registry(None)

    def test_the_installed_registry_applies_each_update(self):
        registry = MagicMock()
        notices.install_registry(registry)

        notices.raise_notice("detector_stuck", scope="ov", params={"detector": "ov"})
        notices.resolve_notice("detector_stuck", "ov")
        notices.resolve_kind("update_available")

        self.assertEqual(
            [call.args[0] for call in registry.apply.call_args_list],
            [
                {
                    "action": "raise",
                    "kind": "detector_stuck",
                    "scope": "ov",
                    "params": {"detector": "ov"},
                },
                {"action": "resolve", "kind": "detector_stuck", "scope": "ov"},
                {"action": "resolve_kind", "kind": "update_available"},
            ],
        )

    def test_a_child_process_sends_over_ipc(self):
        with (
            patch.object(notices.mp, "parent_process", return_value=MagicMock()),
            patch.object(notices, "InterProcessRequestor") as requestor,
            patch.object(notices, "_requestor", None),
        ):
            notices.raise_notice("detector_stuck", scope="ov")
            notices.resolve_notice("detector_stuck", "ov")

        # one requestor serves every call in the process
        requestor.assert_called_once_with()
        send_data = requestor.return_value.send_data
        self.assertEqual(send_data.call_count, 2)
        self.assertEqual(
            send_data.call_args_list[0].args,
            (
                "update_notice",
                {
                    "action": "raise",
                    "kind": "detector_stuck",
                    "scope": "ov",
                    "params": {},
                },
            ),
        )

    def test_the_main_process_without_a_registry_drops_updates(self):
        with (
            patch.object(notices.mp, "parent_process", return_value=None),
            patch.object(notices, "InterProcessRequestor") as requestor,
        ):
            notices.raise_notice("detector_stuck", scope="ov")

        requestor.assert_not_called()

    def test_a_failing_registry_is_logged_not_raised(self):
        registry = MagicMock()
        registry.apply.side_effect = RuntimeError("db")
        notices.install_registry(registry)

        with self.assertLogs("frigate.notices", level="ERROR"):
            notices.raise_notice("detector_stuck", scope="ov")

    def test_flush_reaches_only_an_installed_registry(self):
        notices.flush_notices()

        registry = MagicMock()
        notices.install_registry(registry)
        notices.flush_notices()

        registry.flush.assert_called_once_with()
