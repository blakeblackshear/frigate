"""Tests for the analytics state file."""

import os
import tempfile
import unittest

from frigate.analytics.state import (
    AnalyticsState,
    delete_state,
    load_state,
    new_state,
    save_state,
)


class TestAnalyticsState(unittest.TestCase):
    def setUp(self):
        self.dir = tempfile.TemporaryDirectory()
        self.addCleanup(self.dir.cleanup)
        self.path = os.path.join(self.dir.name, ".analytics.json")

    def write(self, content: str) -> None:
        with open(self.path, "w") as f:
            f.write(content)

    def test_missing_file_loads_as_none(self):
        self.assertIsNone(load_state(self.path))

    def test_save_then_load_round_trips(self):
        state = AnalyticsState(install_id="a" * 32, last_attempt_at=1790000000.5)

        self.assertTrue(save_state(state, self.path))
        self.assertEqual(load_state(self.path), state)

    def test_unusable_files_load_as_none(self):
        for content in (
            "{not json",
            '["a"]',
            '{"install_id": "short", "last_attempt_at": 1}',
            '{"install_id": "' + "a" * 32 + '"}',
            '{"install_id": "' + "a" * 32 + '", "last_attempt_at": true}',
        ):
            with self.subTest(content=content):
                self.write(content)
                self.assertIsNone(load_state(self.path))

    def test_save_reports_failure_instead_of_raising(self):
        missing = os.path.join(self.dir.name, "missing", ".analytics.json")

        self.assertFalse(save_state(new_state(), missing))

    def test_new_state_has_a_hex_id_and_no_attempt(self):
        state = new_state()

        self.assertRegex(state.install_id, r"^[0-9a-f]{32}$")
        self.assertEqual(state.last_attempt_at, 0.0)

    def test_delete_removes_the_file_and_tolerates_a_missing_one(self):
        save_state(new_state(), self.path)

        delete_state(self.path)
        delete_state(self.path)

        self.assertFalse(os.path.exists(self.path))
