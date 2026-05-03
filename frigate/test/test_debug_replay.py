"""Tests for the simplified DebugReplayManager.

Startup orchestration lives in ``frigate.jobs.debug_replay`` (covered by
``test_debug_replay_job``). The manager owns only session presence and
cleanup.
"""

import unittest
import unittest.mock
from unittest.mock import MagicMock, patch


class TestDebugReplayManagerSession(unittest.TestCase):
    def test_inactive_by_default(self) -> None:
        from frigate.debug_replay import DebugReplayManager

        manager = DebugReplayManager()

        self.assertFalse(manager.active)
        self.assertIsNone(manager.replay_camera_name)
        self.assertIsNone(manager.source_camera)
        self.assertIsNone(manager.clip_path)
        self.assertIsNone(manager.start_ts)
        self.assertIsNone(manager.end_ts)

    def test_mark_starting_sets_session_pointers_and_active(self) -> None:
        from frigate.debug_replay import DebugReplayManager

        manager = DebugReplayManager()

        manager.mark_starting(
            source_camera="front",
            replay_camera_name="_replay_front",
            start_ts=100.0,
            end_ts=200.0,
        )

        self.assertTrue(manager.active)
        self.assertEqual(manager.replay_camera_name, "_replay_front")
        self.assertEqual(manager.source_camera, "front")
        self.assertEqual(manager.start_ts, 100.0)
        self.assertEqual(manager.end_ts, 200.0)
        self.assertIsNone(manager.clip_path)

    def test_mark_session_ready_sets_clip_path(self) -> None:
        from frigate.debug_replay import DebugReplayManager

        manager = DebugReplayManager()
        manager.mark_starting("front", "_replay_front", 100.0, 200.0)

        manager.mark_session_ready(clip_path="/tmp/replay/_replay_front.mp4")

        self.assertEqual(manager.clip_path, "/tmp/replay/_replay_front.mp4")
        self.assertTrue(manager.active)

    def test_clear_session_resets_all_pointers(self) -> None:
        from frigate.debug_replay import DebugReplayManager

        manager = DebugReplayManager()
        manager.mark_starting("front", "_replay_front", 100.0, 200.0)
        manager.mark_session_ready("/tmp/replay/clip.mp4")

        manager.clear_session()

        self.assertFalse(manager.active)
        self.assertIsNone(manager.replay_camera_name)
        self.assertIsNone(manager.source_camera)
        self.assertIsNone(manager.clip_path)
        self.assertIsNone(manager.start_ts)
        self.assertIsNone(manager.end_ts)


class TestDebugReplayManagerStop(unittest.TestCase):
    def test_stop_when_inactive_is_a_noop(self) -> None:
        from frigate.debug_replay import DebugReplayManager

        manager = DebugReplayManager()
        frigate_config = MagicMock()
        frigate_config.cameras = {}
        publisher = MagicMock()

        # Should not raise; should not publish any events.
        manager.stop(frigate_config=frigate_config, config_publisher=publisher)

        publisher.publish_update.assert_not_called()

    def test_stop_publishes_remove_when_camera_was_published(self) -> None:
        from frigate.config.camera.updater import CameraConfigUpdateEnum
        from frigate.debug_replay import DebugReplayManager

        manager = DebugReplayManager()
        manager.mark_starting("front", "_replay_front", 100.0, 200.0)
        manager.mark_session_ready("/tmp/replay/_replay_front.mp4")

        camera_config = MagicMock()
        frigate_config = MagicMock()
        frigate_config.cameras = {"_replay_front": camera_config}
        publisher = MagicMock()

        with (
            patch.object(manager, "_cleanup_db"),
            patch.object(manager, "_cleanup_files"),
            patch(
                "frigate.debug_replay.cancel_debug_replay_job", return_value=False
            ),
        ):
            manager.stop(frigate_config=frigate_config, config_publisher=publisher)

        # One publish_update call with a remove topic.
        self.assertEqual(publisher.publish_update.call_count, 1)
        topic_arg = publisher.publish_update.call_args.args[0]
        self.assertEqual(topic_arg.update_type, CameraConfigUpdateEnum.remove)
        self.assertFalse(manager.active)

    def test_stop_skips_remove_publish_when_camera_not_in_config(self) -> None:
        """Cancellation during preparing_clip: no camera was published yet."""
        from frigate.debug_replay import DebugReplayManager

        manager = DebugReplayManager()
        manager.mark_starting("front", "_replay_front", 100.0, 200.0)
        # clip_path stays None because we cancelled before camera publish.

        frigate_config = MagicMock()
        frigate_config.cameras = {}  # _replay_front not present
        publisher = MagicMock()

        with (
            patch.object(manager, "_cleanup_db"),
            patch.object(manager, "_cleanup_files"),
            patch(
                "frigate.debug_replay.cancel_debug_replay_job", return_value=True
            ),
        ):
            manager.stop(frigate_config=frigate_config, config_publisher=publisher)

        publisher.publish_update.assert_not_called()
        self.assertFalse(manager.active)

    def test_stop_calls_cancel_debug_replay_job(self) -> None:
        from frigate.debug_replay import DebugReplayManager

        manager = DebugReplayManager()
        manager.mark_starting("front", "_replay_front", 100.0, 200.0)

        frigate_config = MagicMock()
        frigate_config.cameras = {}
        publisher = MagicMock()

        with (
            patch.object(manager, "_cleanup_db"),
            patch.object(manager, "_cleanup_files"),
            patch(
                "frigate.debug_replay.cancel_debug_replay_job",
                return_value=True,
            ) as mock_cancel,
        ):
            manager.stop(frigate_config=frigate_config, config_publisher=publisher)

        mock_cancel.assert_called_once()


class TestDebugReplayManagerPublishCamera(unittest.TestCase):
    def test_publish_camera_invokes_publisher_with_add_topic(self) -> None:
        from frigate.config.camera.updater import CameraConfigUpdateEnum
        from frigate.debug_replay import DebugReplayManager

        manager = DebugReplayManager()

        source_config = MagicMock()
        new_camera_config = MagicMock()
        frigate_config = MagicMock()
        frigate_config.cameras = {"front": source_config}
        publisher = MagicMock()

        with (
            patch.object(
                manager,
                "_build_camera_config_dict",
                return_value={"enabled": True},
            ),
            patch("frigate.debug_replay.find_config_file", return_value="/cfg.yml"),
            patch("frigate.debug_replay.YAML") as yaml_cls,
            patch("frigate.debug_replay.FrigateConfig.parse_object") as parse_object,
            patch("builtins.open", unittest.mock.mock_open(read_data="cameras:\n")),
        ):
            yaml_instance = yaml_cls.return_value
            yaml_instance.load.return_value = {"cameras": {}}
            parsed = MagicMock()
            parsed.cameras = {"_replay_front": new_camera_config}
            parse_object.return_value = parsed

            manager.publish_camera(
                source_camera="front",
                replay_name="_replay_front",
                clip_path="/tmp/clip.mp4",
                frigate_config=frigate_config,
                config_publisher=publisher,
            )

        # Camera registered into the live config dict
        self.assertIn("_replay_front", frigate_config.cameras)
        # Publisher invoked with an add topic
        self.assertEqual(publisher.publish_update.call_count, 1)
        topic_arg = publisher.publish_update.call_args.args[0]
        self.assertEqual(topic_arg.update_type, CameraConfigUpdateEnum.add)


if __name__ == "__main__":
    unittest.main()
