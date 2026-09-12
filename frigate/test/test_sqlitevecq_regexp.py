"""Tests for the REGEXP function registered on the main Frigate database.

Regression coverage for GHSA-q8jx-q884-jcq9: an attacker-controlled
catastrophic (ReDoS) pattern reaching the REGEXP sink must not be able to
stall the serialized database worker thread.
"""

import sqlite3
import time
import unittest

from frigate.db.sqlitevecq import REGEXP_TIMEOUT_SECONDS, SqliteVecQueueDatabase


class TestRegexpFunction(unittest.TestCase):
    def setUp(self) -> None:
        # autostart=False keeps the queue worker thread from spinning up; we
        # only need the REGEXP registration, exercised on our own connection.
        self.db = SqliteVecQueueDatabase(":memory:", autostart=False)
        self.conn = sqlite3.connect(":memory:")
        self.db._register_regexp(self.conn)

    def tearDown(self) -> None:
        self.conn.close()

    def _regexp(self, value: str | None, pattern: str) -> int | None:
        # SQLite maps "value REGEXP pattern" to regexp(pattern, value).
        return self.conn.execute("SELECT ? REGEXP ?", (value, pattern)).fetchone()[0]

    def test_normal_patterns_still_match(self) -> None:
        self.assertTrue(self._regexp("ABC123", "^ABC"))
        self.assertTrue(self._regexp("ABC123", "ABC.*"))
        self.assertTrue(self._regexp("ABC123", "[0-9]+$"))
        self.assertFalse(self._regexp("ABC123", "^XYZ"))

    def test_null_value_does_not_match(self) -> None:
        self.assertFalse(self._regexp(None, ".*"))

    def test_invalid_pattern_does_not_raise(self) -> None:
        self.assertFalse(self._regexp("ABC123", "(unclosed"))

    def test_catastrophic_pattern_is_time_bounded(self) -> None:
        # Without the timeout this evaluation backtracks for minutes to hours
        # and wedges the whole database thread (GHSA-q8jx-q884-jcq9).
        catastrophic = "(a{2,})+c"
        subject = "a" * 4000

        start = time.monotonic()
        result = self._regexp(subject, catastrophic)
        elapsed = time.monotonic() - start

        # The pattern does not match; the guarantee is that it returns quickly.
        self.assertFalse(result)
        self.assertLess(elapsed, REGEXP_TIMEOUT_SECONDS + 2.0)
