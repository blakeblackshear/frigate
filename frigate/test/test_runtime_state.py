"""Tests for RuntimeStatePersistence."""

import json
import os
import tempfile
import unittest
from unittest.mock import patch

from frigate.comms.runtime_state import RuntimeStatePersistence


class TestRuntimeStatePersistence(unittest.TestCase):
    """Unit tests for the JSON-backed runtime state store."""

    def setUp(self) -> None:
        self.tmp_dir = tempfile.mkdtemp()
        self.config_path = os.path.join(self.tmp_dir, "config.yml")
        # Touch a placeholder config.yml so find_config_file returns a real path
        with open(self.config_path, "w") as f:
            f.write("")
        self._patcher = patch(
            "frigate.comms.runtime_state.find_config_file",
            return_value=self.config_path,
        )
        self._patcher.start()
        self.store = RuntimeStatePersistence()

    def tearDown(self) -> None:
        self._patcher.stop()
        for name in os.listdir(self.tmp_dir):
            os.remove(os.path.join(self.tmp_dir, name))
        os.rmdir(self.tmp_dir)

    def test_load_returns_empty_when_file_missing(self) -> None:
        self.assertEqual(self.store.load(), {})

    def test_set_then_load_round_trip(self) -> None:
        self.store.set("front_door", "detect", False)
        self.store.set("front_door", "recordings", True)
        self.store.set("back_yard", "audio", False)

        result = self.store.load()
        self.assertEqual(
            result,
            {
                "front_door": {"detect": False, "recordings": True},
                "back_yard": {"audio": False},
            },
        )

    def test_set_with_untracked_topic_is_noop(self) -> None:
        self.store.set("front_door", "ptz_autotracker", True)
        self.assertEqual(self.store.load(), {})
        # File should not even be created if no tracked entries were written
        runtime_path = os.path.join(self.tmp_dir, ".runtime_state.json")
        self.assertFalse(os.path.exists(runtime_path))

    def test_set_overwrites_previous_value(self) -> None:
        self.store.set("front_door", "detect", True)
        self.store.set("front_door", "detect", False)
        self.assertEqual(self.store.load(), {"front_door": {"detect": False}})

    def test_load_returns_empty_when_file_corrupt(self) -> None:
        runtime_path = os.path.join(self.tmp_dir, ".runtime_state.json")
        with open(runtime_path, "w") as f:
            f.write("{not valid json")
        self.assertEqual(self.store.load(), {})

    def test_load_handles_unexpected_top_level_shape(self) -> None:
        runtime_path = os.path.join(self.tmp_dir, ".runtime_state.json")
        with open(runtime_path, "w") as f:
            json.dump(["unexpected", "list"], f)
        self.assertEqual(self.store.load(), {})

    def test_clear_for_yaml_keys_removes_matching_entries(self) -> None:
        self.store.set("front_door", "detect", False)
        self.store.set("front_door", "recordings", False)
        self.store.set("back_yard", "audio", False)

        self.store.clear_for_yaml_keys(
            [
                "cameras.front_door.detect.enabled",
                "cameras.back_yard.audio.enabled",
            ]
        )

        self.assertEqual(
            self.store.load(),
            {"front_door": {"recordings": False}},
        )

    def test_clear_for_yaml_keys_collapses_empty_camera_dict(self) -> None:
        self.store.set("front_door", "detect", False)
        self.store.clear_for_yaml_keys(["cameras.front_door.detect.enabled"])
        self.assertEqual(self.store.load(), {})

    def test_clear_for_yaml_keys_ignores_unrelated_keys(self) -> None:
        self.store.set("front_door", "detect", False)
        self.store.clear_for_yaml_keys(
            [
                "ui.theme",
                "go2rtc.streams.x",
                "cameras.front_door.ffmpeg.inputs",
                "not_cameras.front_door.detect.enabled",
            ]
        )
        self.assertEqual(self.store.load(), {"front_door": {"detect": False}})

    def test_clear_for_yaml_keys_handles_empty_iterable(self) -> None:
        self.store.set("front_door", "detect", False)
        self.store.clear_for_yaml_keys([])
        self.assertEqual(self.store.load(), {"front_door": {"detect": False}})

    def test_camera_level_enabled_uses_top_level_yaml_key(self) -> None:
        """`enabled` topic maps to the camera-level `cameras.<cam>.enabled` key."""
        self.store.set("front_door", "enabled", False)
        self.store.clear_for_yaml_keys(["cameras.front_door.enabled"])
        self.assertEqual(self.store.load(), {})

    def test_clear_all_wipes_every_entry(self) -> None:
        self.store.set("front_door", "detect", False)
        self.store.set("front_door", "recordings", True)
        self.store.set("back_yard", "audio", False)

        self.store.clear_all()

        self.assertEqual(self.store.load(), {})

    def test_clear_all_is_safe_when_file_missing(self) -> None:
        # No prior set() calls — file does not exist
        self.store.clear_all()
        self.assertEqual(self.store.load(), {})


if __name__ == "__main__":
    unittest.main()
