"""Tests for Dispatcher runtime state persistence wiring."""

import os
import tempfile
import unittest
from unittest.mock import MagicMock, patch

from frigate.comms.dispatcher import Dispatcher
from frigate.comms.runtime_state import RuntimeStatePersistence


def _make_camera_mock(
    *,
    enabled: bool = True,
    enabled_in_config: bool = True,
    detect_enabled: bool = True,
    record_enabled: bool = True,
    record_enabled_in_config: bool = True,
    snapshots_enabled: bool = True,
    audio_enabled: bool = True,
    audio_enabled_in_config: bool = True,
) -> MagicMock:
    """Build a camera config mock with the fields the in-scope handlers read."""
    camera = MagicMock()
    camera.enabled = enabled
    camera.enabled_in_config = enabled_in_config
    camera.detect.enabled = detect_enabled
    camera.motion.enabled = True  # avoid the detect→motion side-effect path
    camera.record.enabled = record_enabled
    camera.record.enabled_in_config = record_enabled_in_config
    camera.snapshots.enabled = snapshots_enabled
    camera.audio.enabled = audio_enabled
    camera.audio.enabled_in_config = audio_enabled_in_config
    return camera


def _build_dispatcher(cameras: dict[str, MagicMock]) -> Dispatcher:
    """Construct a Dispatcher with the bare-minimum mocks the tests need."""
    config = MagicMock()
    config.cameras = cameras
    config_updater = MagicMock()
    onvif = MagicMock()
    ptz_metrics: dict = {}
    communicators: list = []

    with (
        patch("frigate.comms.dispatcher.CameraActivityManager"),
        patch("frigate.comms.dispatcher.AudioActivityManager"),
    ):
        return Dispatcher(config, config_updater, onvif, ptz_metrics, communicators)


class TestRestoreRuntimeState(unittest.TestCase):
    """Verify replay routes through handlers and tolerates missing entries."""

    def setUp(self) -> None:
        self.dispatcher = _build_dispatcher(
            {
                "front_door": _make_camera_mock(),
                "back_yard": _make_camera_mock(),
            }
        )
        # Swap each in-scope handler for a MagicMock so we can assert calls
        # without exercising the handler's own logic.
        self.handler_mocks: dict[str, MagicMock] = {}
        for topic in ("enabled", "detect", "snapshots", "recordings", "audio"):
            mock = MagicMock()
            self.dispatcher._camera_settings_handlers[topic] = mock
            self.handler_mocks[topic] = mock

    def test_replays_each_stored_entry_through_its_handler(self) -> None:
        self.dispatcher._runtime_state = MagicMock(
            spec=RuntimeStatePersistence,
            load=MagicMock(
                return_value={
                    "front_door": {"detect": False, "recordings": False},
                    "back_yard": {"audio": False},
                }
            ),
        )
        self.dispatcher.restore_runtime_state()

        self.handler_mocks["detect"].assert_called_once_with("front_door", "OFF")
        self.handler_mocks["recordings"].assert_called_once_with("front_door", "OFF")
        self.handler_mocks["audio"].assert_called_once_with("back_yard", "OFF")
        self.handler_mocks["enabled"].assert_not_called()
        self.handler_mocks["snapshots"].assert_not_called()

    def test_skips_unknown_cameras(self) -> None:
        self.dispatcher._runtime_state = MagicMock(
            spec=RuntimeStatePersistence,
            load=MagicMock(return_value={"removed_cam": {"detect": False}}),
        )
        self.dispatcher.restore_runtime_state()
        for mock in self.handler_mocks.values():
            mock.assert_not_called()

    def test_skips_unknown_topics(self) -> None:
        self.dispatcher._runtime_state = MagicMock(
            spec=RuntimeStatePersistence,
            load=MagicMock(return_value={"front_door": {"some_old_topic": True}}),
        )
        self.dispatcher.restore_runtime_state()
        for mock in self.handler_mocks.values():
            mock.assert_not_called()

    def test_continues_after_handler_exception(self) -> None:
        self.handler_mocks["detect"].side_effect = RuntimeError("boom")
        self.dispatcher._runtime_state = MagicMock(
            spec=RuntimeStatePersistence,
            load=MagicMock(
                return_value={
                    "front_door": {"detect": False, "recordings": False},
                }
            ),
        )
        # Must not raise; the recordings handler must still run.
        self.dispatcher.restore_runtime_state()
        self.handler_mocks["recordings"].assert_called_once_with("front_door", "OFF")

    def test_true_value_routes_as_on_payload(self) -> None:
        self.dispatcher._runtime_state = MagicMock(
            spec=RuntimeStatePersistence,
            load=MagicMock(return_value={"front_door": {"detect": True}}),
        )
        self.dispatcher.restore_runtime_state()
        self.handler_mocks["detect"].assert_called_once_with("front_door", "ON")

    def test_apply_runtime_state_replays_through_handlers(self) -> None:
        """The extracted method replays every stored entry."""
        with patch.object(
            self.dispatcher._runtime_state,
            "load",
            return_value={"front_door": {"enabled": False, "detect": True}},
        ):
            self.dispatcher.apply_runtime_state()

        self.handler_mocks["enabled"].assert_called_once_with("front_door", "OFF")
        self.handler_mocks["detect"].assert_called_once_with("front_door", "ON")

    def test_apply_runtime_state_returns_applied_entries(self) -> None:
        """Callers get back what was replayed, for logging and assertions."""
        with patch.object(
            self.dispatcher._runtime_state,
            "load",
            return_value={"front_door": {"enabled": False}, "nope": {"enabled": True}},
        ):
            applied = self.dispatcher.apply_runtime_state()

        self.assertEqual(applied, {"front_door": {"enabled": False}})

    def test_restore_runtime_state_still_replays(self) -> None:
        """The startup entry point keeps working after the extraction."""
        with patch.object(
            self.dispatcher._runtime_state,
            "load",
            return_value={"back_yard": {"snapshots": False}},
        ):
            self.dispatcher.restore_runtime_state()

        self.handler_mocks["snapshots"].assert_called_once_with("back_yard", "OFF")


class TestHandlersPersistViaSet(unittest.TestCase):
    """Verify each in-scope handler writes to the runtime state on success."""

    def setUp(self) -> None:
        self.tmp_dir = tempfile.mkdtemp()
        self.config_path = os.path.join(self.tmp_dir, "config.yml")
        with open(self.config_path, "w") as f:
            f.write("")
        self._patcher = patch(
            "frigate.comms.runtime_state.find_config_file",
            return_value=self.config_path,
        )
        self._patcher.start()

        # Start with everything OFF so each ON payload triggers a real change
        self.cameras = {
            "front_door": _make_camera_mock(
                enabled=False,
                detect_enabled=False,
                record_enabled=False,
                snapshots_enabled=False,
                audio_enabled=False,
            )
        }
        self.dispatcher = _build_dispatcher(self.cameras)

    def tearDown(self) -> None:
        self._patcher.stop()
        for name in os.listdir(self.tmp_dir):
            os.remove(os.path.join(self.tmp_dir, name))
        os.rmdir(self.tmp_dir)

    def _stored_state(self) -> dict:
        return RuntimeStatePersistence().load()

    def test_enabled_handler_persists(self) -> None:
        self.dispatcher._on_enabled_command("front_door", "ON")
        self.assertEqual(self._stored_state(), {"front_door": {"enabled": True}})

    def test_detect_handler_persists(self) -> None:
        self.dispatcher._on_detect_command("front_door", "ON")
        self.assertEqual(self._stored_state(), {"front_door": {"detect": True}})

    def test_recordings_handler_persists(self) -> None:
        self.dispatcher._on_recordings_command("front_door", "ON")
        self.assertEqual(self._stored_state(), {"front_door": {"recordings": True}})

    def test_snapshots_handler_persists(self) -> None:
        self.dispatcher._on_snapshots_command("front_door", "ON")
        self.assertEqual(self._stored_state(), {"front_door": {"snapshots": True}})

    def test_audio_handler_persists(self) -> None:
        self.dispatcher._on_audio_command("front_door", "ON")
        self.assertEqual(self._stored_state(), {"front_door": {"audio": True}})

    def test_enabled_in_config_gate_blocks_persistence(self) -> None:
        """An ON payload rejected by the gate must not be persisted."""
        cam = self.cameras["front_door"]
        cam.enabled_in_config = False
        cam.record.enabled_in_config = False
        cam.audio.enabled_in_config = False

        self.dispatcher._on_enabled_command("front_door", "ON")
        self.dispatcher._on_recordings_command("front_door", "ON")
        self.dispatcher._on_audio_command("front_door", "ON")

        self.assertEqual(self._stored_state(), {})


class TestClearPassthrough(unittest.TestCase):
    """The dispatcher's public clear methods delegate to the store."""

    def test_clear_runtime_state_for_yaml_keys_passthrough(self) -> None:
        dispatcher = _build_dispatcher({})
        dispatcher._runtime_state = MagicMock(spec=RuntimeStatePersistence)
        keys = ["cameras.front_door.detect.enabled"]
        dispatcher.clear_runtime_state_for_yaml_keys(keys)
        dispatcher._runtime_state.clear_for_yaml_keys.assert_called_once_with(keys)

    def test_clear_runtime_state_passthrough(self) -> None:
        dispatcher = _build_dispatcher({})
        dispatcher._runtime_state = MagicMock(spec=RuntimeStatePersistence)
        dispatcher.clear_runtime_state()
        dispatcher._runtime_state.clear_all.assert_called_once_with()

    def test_clear_runtime_state_for_camera_passthrough(self) -> None:
        dispatcher = _build_dispatcher({})
        dispatcher._runtime_state = MagicMock(spec=RuntimeStatePersistence)
        dispatcher.clear_runtime_state_for_camera("front_door")
        dispatcher._runtime_state.clear_camera.assert_called_once_with("front_door")


if __name__ == "__main__":
    unittest.main()
