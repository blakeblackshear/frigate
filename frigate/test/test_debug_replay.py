"""Tests for DebugReplayManager state machine and async startup."""

import unittest

from frigate.debug_replay import DebugReplayManager, ReplayState


class TestDebugReplayManagerState(unittest.TestCase):
    def test_initial_state_is_idle(self):
        manager = DebugReplayManager()

        self.assertEqual(manager.state, ReplayState.idle)
        self.assertIsNone(manager.error_message)
        self.assertFalse(manager.active)

    def test_active_property_true_for_preparing_starting_and_active_states(self):
        manager = DebugReplayManager()

        manager._set_state(ReplayState.preparing_clip)
        self.assertTrue(manager.active)

        manager._set_state(ReplayState.starting_camera)
        self.assertTrue(manager.active)

        manager._set_state(ReplayState.active)
        self.assertTrue(manager.active)

    def test_active_property_false_for_idle_and_error_states(self):
        manager = DebugReplayManager()

        manager._set_state(ReplayState.idle)
        self.assertFalse(manager.active)

        manager._set_state(ReplayState.error, error_message="boom")
        self.assertFalse(manager.active)
        self.assertEqual(manager.error_message, "boom")
