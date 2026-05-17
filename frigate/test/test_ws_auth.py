"""Tests for WebSocket authorization checks."""

import unittest

from frigate.comms.ws import _check_ws_authorization
from frigate.const import INSERT_MANY_RECORDINGS, UPDATE_CAMERA_ACTIVITY


class TestCheckWsAuthorization(unittest.TestCase):
    """Tests for the _check_ws_authorization pure function."""

    DEFAULT_SEPARATOR = ","

    # --- IPC topic blocking (unconditional, regardless of role) ---

    def test_ipc_topic_blocked_for_admin(self):
        self.assertFalse(
            _check_ws_authorization(
                INSERT_MANY_RECORDINGS, "admin", self.DEFAULT_SEPARATOR
            )
        )

    def test_ipc_topic_blocked_for_viewer(self):
        self.assertFalse(
            _check_ws_authorization(
                UPDATE_CAMERA_ACTIVITY, "viewer", self.DEFAULT_SEPARATOR
            )
        )

    def test_ipc_topic_blocked_when_no_role(self):
        self.assertFalse(
            _check_ws_authorization(
                INSERT_MANY_RECORDINGS, None, self.DEFAULT_SEPARATOR
            )
        )

    # --- Viewer allowed topics ---

    def test_viewer_can_send_on_connect(self):
        self.assertTrue(
            _check_ws_authorization("onConnect", "viewer", self.DEFAULT_SEPARATOR)
        )

    def test_viewer_can_send_model_state(self):
        self.assertTrue(
            _check_ws_authorization("modelState", "viewer", self.DEFAULT_SEPARATOR)
        )

    def test_viewer_can_send_audio_transcription_state(self):
        self.assertTrue(
            _check_ws_authorization(
                "audioTranscriptionState", "viewer", self.DEFAULT_SEPARATOR
            )
        )

    def test_viewer_can_send_birdseye_layout(self):
        self.assertTrue(
            _check_ws_authorization("birdseyeLayout", "viewer", self.DEFAULT_SEPARATOR)
        )

    def test_viewer_can_send_embeddings_reindex_progress(self):
        self.assertTrue(
            _check_ws_authorization(
                "embeddingsReindexProgress", "viewer", self.DEFAULT_SEPARATOR
            )
        )

    # --- Viewer blocked from admin topics ---

    def test_viewer_blocked_from_restart(self):
        self.assertFalse(
            _check_ws_authorization("restart", "viewer", self.DEFAULT_SEPARATOR)
        )

    def test_viewer_blocked_from_camera_detect_set(self):
        self.assertFalse(
            _check_ws_authorization(
                "front_door/detect/set", "viewer", self.DEFAULT_SEPARATOR
            )
        )

    def test_viewer_blocked_from_camera_ptz(self):
        self.assertFalse(
            _check_ws_authorization("front_door/ptz", "viewer", self.DEFAULT_SEPARATOR)
        )

    def test_viewer_blocked_from_global_notifications_set(self):
        self.assertFalse(
            _check_ws_authorization(
                "notifications/set", "viewer", self.DEFAULT_SEPARATOR
            )
        )

    def test_viewer_blocked_from_camera_notifications_suspend(self):
        self.assertFalse(
            _check_ws_authorization(
                "front_door/notifications/suspend", "viewer", self.DEFAULT_SEPARATOR
            )
        )

    def test_viewer_blocked_from_arbitrary_unknown_topic(self):
        self.assertFalse(
            _check_ws_authorization(
                "some_random_topic", "viewer", self.DEFAULT_SEPARATOR
            )
        )

    # --- Admin access ---

    def test_admin_can_send_restart(self):
        self.assertTrue(
            _check_ws_authorization("restart", "admin", self.DEFAULT_SEPARATOR)
        )

    def test_admin_can_send_camera_detect_set(self):
        self.assertTrue(
            _check_ws_authorization(
                "front_door/detect/set", "admin", self.DEFAULT_SEPARATOR
            )
        )

    def test_admin_can_send_camera_ptz(self):
        self.assertTrue(
            _check_ws_authorization("front_door/ptz", "admin", self.DEFAULT_SEPARATOR)
        )

    # --- Comma-separated roles ---

    def test_comma_separated_admin_viewer_grants_admin(self):
        self.assertTrue(
            _check_ws_authorization("restart", "admin,viewer", self.DEFAULT_SEPARATOR)
        )

    def test_comma_separated_viewer_admin_grants_admin(self):
        self.assertTrue(
            _check_ws_authorization("restart", "viewer,admin", self.DEFAULT_SEPARATOR)
        )

    def test_comma_separated_with_spaces(self):
        self.assertTrue(
            _check_ws_authorization("restart", "viewer, admin", self.DEFAULT_SEPARATOR)
        )

    # --- Custom separator ---

    def test_pipe_separator(self):
        self.assertTrue(_check_ws_authorization("restart", "viewer|admin", "|"))

    def test_pipe_separator_no_admin(self):
        self.assertFalse(_check_ws_authorization("restart", "viewer|editor", "|"))

    # --- No role header (fail-closed) ---

    def test_no_role_header_blocks_admin_topics(self):
        self.assertFalse(
            _check_ws_authorization("restart", None, self.DEFAULT_SEPARATOR)
        )

    def test_no_role_header_allows_viewer_topics(self):
        self.assertTrue(
            _check_ws_authorization("onConnect", None, self.DEFAULT_SEPARATOR)
        )


if __name__ == "__main__":
    unittest.main()
