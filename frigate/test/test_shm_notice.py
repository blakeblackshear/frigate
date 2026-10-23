"""Tests for the notice raised while /dev/shm is too small."""

import unittest
from unittest.mock import patch

from frigate.stats import emitter

TOO_SMALL = {"total": 64.0, "min_shm": 180}
BIG_ENOUGH = {"total": 512.0, "min_shm": 180}


class TestShmNotice(unittest.TestCase):
    def setUp(self):
        raise_patch = patch.object(emitter, "raise_notice")
        resolve_patch = patch.object(emitter, "resolve_notice")
        self.raise_notice = raise_patch.start()
        self.resolve_notice = resolve_patch.start()
        self.addCleanup(raise_patch.stop)
        self.addCleanup(resolve_patch.stop)

        self.emitter = emitter.StatsEmitter.__new__(emitter.StatsEmitter)
        self.emitter._shm_checked = False
        self.emitter._shm_params = None

    def test_too_small_raises_once(self):
        for _ in range(3):
            self.emitter._update_shm_notice(TOO_SMALL)

        self.raise_notice.assert_called_once_with(
            "shm_too_low", params={"total": 64.0, "min": 180}
        )
        self.resolve_notice.assert_not_called()

    def test_first_tick_clears_a_row_the_last_run_left(self):
        self.emitter._update_shm_notice(BIG_ENOUGH)
        self.emitter._update_shm_notice(BIG_ENOUGH)

        self.resolve_notice.assert_called_once_with("shm_too_low")
        self.raise_notice.assert_not_called()

    def test_a_new_requirement_updates_the_notice(self):
        self.emitter._update_shm_notice(TOO_SMALL)
        self.emitter._update_shm_notice({"total": 64.0, "min_shm": 200})

        self.assertEqual(self.raise_notice.call_count, 2)
        self.raise_notice.assert_called_with(
            "shm_too_low", params={"total": 64.0, "min": 200}
        )

    def test_growing_shm_resolves_the_notice(self):
        self.emitter._update_shm_notice(TOO_SMALL)
        self.emitter._update_shm_notice(BIG_ENOUGH)

        self.resolve_notice.assert_called_once_with("shm_too_low")

    def test_missing_shm_is_not_a_problem(self):
        self.emitter._update_shm_notice({})

        self.raise_notice.assert_not_called()
        self.resolve_notice.assert_called_once_with("shm_too_low")


if __name__ == "__main__":
    unittest.main()
