"""Tests for Dispatcher runtime state persistence wiring."""

import os
import tempfile
import unittest
from unittest.mock import MagicMock, patch

from frigate.app import FrigateApp
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


class TestReapplyRuntimeStateToConfig(unittest.TestCase):
    """The silent re-apply corrects the config object with no side effects."""

    def _dispatcher_with(
        self, cameras: dict[str, MagicMock], state: dict
    ) -> Dispatcher:
        dispatcher = _build_dispatcher(cameras)
        dispatcher._runtime_state = MagicMock(spec=RuntimeStatePersistence)
        dispatcher._runtime_state.load.return_value = state
        dispatcher.publish = MagicMock()
        return dispatcher

    def test_mutates_every_tracked_field(self) -> None:
        cameras = {"front_door": _make_camera_mock()}
        dispatcher = self._dispatcher_with(
            cameras,
            {
                "front_door": {
                    "enabled": False,
                    "detect": False,
                    "snapshots": False,
                    "recordings": False,
                    "audio": False,
                }
            },
        )

        dispatcher.reapply_runtime_state_to_config()

        cam = cameras["front_door"]
        self.assertFalse(cam.enabled)
        self.assertFalse(cam.detect.enabled)
        self.assertFalse(cam.snapshots.enabled)
        self.assertFalse(cam.record.enabled)
        self.assertFalse(cam.audio.enabled)

    def test_makes_no_zmq_mqtt_or_disk_writes(self) -> None:
        dispatcher = self._dispatcher_with(
            {"front_door": _make_camera_mock()},
            {"front_door": {"enabled": False}},
        )

        dispatcher.reapply_runtime_state_to_config()

        dispatcher.config_updater.publish_update.assert_not_called()
        dispatcher._runtime_state.set.assert_not_called()
        dispatcher.publish.assert_not_called()

    def test_respects_enabled_in_config_gate(self) -> None:
        # an ON override for a camera disabled in yaml must not enable it
        cameras = {
            "front_door": _make_camera_mock(enabled=False, enabled_in_config=False)
        }
        dispatcher = self._dispatcher_with(cameras, {"front_door": {"enabled": True}})

        dispatcher.reapply_runtime_state_to_config()

        self.assertFalse(cameras["front_door"].enabled)

    def test_respects_recordings_and_audio_gates(self) -> None:
        # ON overrides for recordings/audio not enabled in yaml must be ignored
        cameras = {
            "front_door": _make_camera_mock(
                record_enabled=False,
                record_enabled_in_config=False,
                audio_enabled=False,
                audio_enabled_in_config=False,
            )
        }
        dispatcher = self._dispatcher_with(
            cameras, {"front_door": {"recordings": True, "audio": True}}
        )

        dispatcher.reapply_runtime_state_to_config()

        self.assertFalse(cameras["front_door"].record.enabled)
        self.assertFalse(cameras["front_door"].audio.enabled)

    def test_applies_on_override_when_gate_passes(self) -> None:
        # a camera off in yaml but enabled_in_config keeps its runtime-on state
        cameras = {
            "front_door": _make_camera_mock(enabled=False, enabled_in_config=True)
        }
        dispatcher = self._dispatcher_with(cameras, {"front_door": {"enabled": True}})

        dispatcher.reapply_runtime_state_to_config()

        self.assertTrue(cameras["front_door"].enabled)

    def test_detect_on_couples_motion(self) -> None:
        cam = _make_camera_mock(detect_enabled=False)
        cam.motion.enabled = False
        dispatcher = self._dispatcher_with(
            {"front_door": cam}, {"front_door": {"detect": True}}
        )

        dispatcher.reapply_runtime_state_to_config()

        self.assertTrue(cam.detect.enabled)
        self.assertTrue(cam.motion.enabled)

    def test_skips_camera_not_in_config(self) -> None:
        dispatcher = self._dispatcher_with(
            {"front_door": _make_camera_mock()}, {"ghost": {"enabled": False}}
        )

        # a stale entry for a deleted camera must be ignored, not raise
        dispatcher.reapply_runtime_state_to_config()


class TestStartupAppliesConfigLayersBeforeWorkersStart(unittest.TestCase):
    """Both layers must reach the config before config-carrying workers start.

    A worker started before a layer is applied keeps the yaml value for the
    rest of the session: the config_updater broadcast sent later is dropped
    for subscribers that have not connected yet, and nothing re-sends it.
    """

    CONFIG_LAYERS = (
        "profile_manager.restore_persisted_profile_to_config",
        "dispatcher.reapply_runtime_state_to_config",
    )

    # started with a copy of the camera config
    CONFIG_CARRYING_WORKERS = (
        "start_video_output_processor",
        "start_ptz_autotracker",
        "start_detected_frames_processor",
        "start_camera_processor",
        "start_audio_processor",
    )

    def _start_call_order(self) -> list[str]:
        """Return the names FrigateApp.start() calls, in order."""
        app = MagicMock()

        with (
            patch("frigate.app.set_file_limit"),
            patch("frigate.app.cleanup_replay_cameras"),
            patch("frigate.app.reap_stale_exports"),
            patch("frigate.app.create_fastapi_app"),
            patch("frigate.app.uvicorn"),
        ):
            FrigateApp.start(app)

        return [name for name, _, _ in app.mock_calls]

    def test_applied_before_any_config_carrying_worker(self) -> None:
        order = self._start_call_order()

        for layer in self.CONFIG_LAYERS:
            for worker in self.CONFIG_CARRYING_WORKERS:
                self.assertLess(order.index(layer), order.index(worker))

    def test_applied_after_the_dispatcher_exists(self) -> None:
        order = self._start_call_order()

        for layer in self.CONFIG_LAYERS:
            self.assertLess(order.index("init_dispatcher"), order.index(layer))

    def test_applied_after_the_profile_base_is_snapshotted(self) -> None:
        # ProfileManager snapshots the config as the "no profile" base that
        # deactivation resets to, so neither layer may be in the config yet
        order = self._start_call_order()

        for layer in self.CONFIG_LAYERS:
            self.assertLess(order.index("init_profile_manager"), order.index(layer))

    def test_layers_applied_in_order(self) -> None:
        # a runtime toggle is the layer the user set last, so it goes on top
        order = self._start_call_order()

        self.assertLess(
            order.index("profile_manager.restore_persisted_profile_to_config"),
            order.index("dispatcher.reapply_runtime_state_to_config"),
        )

    def test_overrides_still_re_applied_after_the_profile_is_restored(self) -> None:
        # activation resets the sections it owns to the base first, so the
        # overrides have to land on top again
        order = self._start_call_order()

        self.assertLess(
            order.index("profile_manager.restore_persisted_profile"),
            order.index("dispatcher.restore_runtime_state"),
        )

    def test_broadcast_replay_still_runs_at_the_end(self) -> None:
        # the broadcast is the only channel for the recording, review, and
        # embeddings processes, which start before the config can be corrected
        order = self._start_call_order()

        for replay in (
            "profile_manager.restore_persisted_profile",
            "dispatcher.restore_runtime_state",
        ):
            self.assertLess(order.index("start_audio_processor"), order.index(replay))


if __name__ == "__main__":
    unittest.main()
