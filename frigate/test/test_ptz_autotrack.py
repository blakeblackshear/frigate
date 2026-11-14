"""Tests for autotracker state that must survive runtime config changes.

Regression coverage for a family of bugs where per-camera autotracker state was
built once at startup and never revisited. A camera that is added or enabled
after startup, or has autotracking enabled from the UI, would either raise a
KeyError on the autotracker thread or silently keep the wrong state:

- autotracker_init only got an entry for cameras enabled when PtzAutoTracker was
  constructed, so runtime-enabled cameras raised KeyError on lookup.
- _disable only changed the main process config, so the camera process kept
  running its motion estimator for a camera that could not autotrack.
"""

import asyncio
import unittest
from unittest.mock import AsyncMock, MagicMock

import numpy as np

from frigate.camera import PTZMetrics
from frigate.config import FrigateConfig, ZoomingModeEnum
from frigate.config.camera.updater import CameraConfigUpdateEnum
from frigate.ptz.autotrack import PtzAutoTracker, calculate_max_target_box

CAMERA = "ptz_cam"


def _config(autotracking_enabled: bool) -> FrigateConfig:
    return FrigateConfig(
        **{
            "mqtt": {"enabled": False},
            "cameras": {
                CAMERA: {
                    "ffmpeg": {
                        "inputs": [
                            {"path": "rtsp://10.0.0.1:554/video", "roles": ["detect"]}
                        ]
                    },
                    "detect": {"width": 1920, "height": 1080},
                    "zones": {"zone": {"coordinates": "0,0,1,0,1,1,0,1"}},
                    "onvif": {
                        "host": "10.0.0.1",
                        "autotracking": {
                            "enabled": autotracking_enabled,
                            "required_zones": ["zone"],
                        },
                    },
                }
            },
        }
    )


def _make_tracker(autotracking_enabled: bool = True) -> PtzAutoTracker:
    """Build a PtzAutoTracker without invoking __init__, which would try to set up
    onvif over the network. Only the config/metrics state is relevant here."""
    tracker = PtzAutoTracker.__new__(PtzAutoTracker)
    tracker.config = _config(autotracking_enabled)
    tracker.ptz_metrics = {CAMERA: PTZMetrics()}
    tracker.onvif = MagicMock()
    tracker.dispatcher = MagicMock()
    tracker.config_subscriber = MagicMock()
    tracker.autotracker_init = {}
    tracker.calibrating = {}
    tracker.tracked_object = {}
    return tracker


class TestAutotrackerInitGuards(unittest.IsolatedAsyncioTestCase):
    async def test_camera_maintenance_returns_early_when_not_initialized(self) -> None:
        # a camera enabled at runtime has no autotracker_init entry, which used to
        # raise KeyError and kill the autotracker thread for every camera
        tracker = _make_tracker()
        self.assertNotIn(CAMERA, tracker.autotracker_init)

        await tracker.camera_maintenance(CAMERA)

        tracker.onvif.get_camera_status.assert_not_called()

    async def test_camera_maintenance_returns_early_when_init_incomplete(self) -> None:
        # autotracker_init is seeded False for enabled cameras before setup runs
        tracker = _make_tracker()
        tracker.autotracker_init[CAMERA] = False

        await tracker.camera_maintenance(CAMERA)

        tracker.onvif.get_camera_status.assert_not_called()


class TestAutotrackerEnqueueMove(unittest.TestCase):
    def _enqueue(self, pan: float, tilt: float, zoom: float) -> MagicMock:
        tracker = _make_tracker()
        tracker.move_queues = {CAMERA: MagicMock()}
        tracker.move_queue_locks = {CAMERA: MagicMock()}
        tracker.move_queue_locks[CAMERA].locked.return_value = False

        tracker._enqueue_move(CAMERA, 1000.0, pan, tilt, zoom)

        return tracker.onvif.loop.call_soon_threadsafe

    def test_move_is_clipped_to_the_onvif_range(self) -> None:
        # velocity estimates can push the predicted centroid outside the frame
        call_soon = self._enqueue(1.7, -2.5, 0.4)

        call_soon.assert_called_once()
        self.assertEqual(call_soon.call_args.args[1], (1000.0, 1.0, -1.0, 0.4))

    def test_empty_move_is_not_enqueued(self) -> None:
        self._enqueue(0, 0, 0).assert_not_called()


class TestAutotrackerDisable(unittest.TestCase):
    def test_disable_publishes_to_camera_process(self) -> None:
        tracker = _make_tracker(autotracking_enabled=True)

        tracker._disable(CAMERA, "onvif connection failed")

        autotracking = tracker.config.cameras[CAMERA].onvif.autotracking
        self.assertFalse(autotracking.enabled)

        publish = tracker.dispatcher.config_updater.publish_update
        publish.assert_called_once()
        topic, payload = publish.call_args.args
        self.assertEqual(topic.update_type, CameraConfigUpdateEnum.autotracking)
        self.assertEqual(topic.camera, CAMERA)
        self.assertIs(payload, autotracking)


class TestAutotrackerPrediction(unittest.TestCase):
    def test_movement_time_uses_the_fitted_intercept_unchanged(self) -> None:
        tracker = _make_tracker()
        tracker.intercept = {CAMERA: 0.5}
        tracker.move_coefficients = {CAMERA: [0.3, 0.8]}

        self.assertAlmostEqual(tracker._predict_movement_time(CAMERA, 0.25, 0.25), 0.7)

    def test_shrinking_box_keeps_a_positive_target_box(self) -> None:
        # 60 px shrinking 6 px/frame reaches zero after 2 s at 5 fps
        target_box = self._target_box_for((0, 0, 60, 60), [3, 3, -3, -3], 2.0)

        self.assertGreater(target_box, 0)
        self.assertTrue(np.isfinite(target_box))

    def test_approaching_object_keeps_its_velocity(self) -> None:
        # the box grows, so the corners move in opposite directions
        tracker = _make_tracker()
        obj = MagicMock()
        obj.obj_data = {"estimate_velocity": np.array([[-3.0, -4.0], [3.0, 1.0]])}

        valid, velocity = tracker._get_valid_velocity(CAMERA, obj)

        self.assertTrue(valid)
        self.assertEqual(list(velocity), [-3, -4, 3, 1])

    def test_corners_that_disagree_too_much_are_rejected(self) -> None:
        tracker = _make_tracker()
        obj = MagicMock()
        obj.obj_data = {"estimate_velocity": np.array([[-15.0, 0.0], [15.0, 0.0]])}

        valid, velocity = tracker._get_valid_velocity(CAMERA, obj)

        self.assertFalse(valid)
        self.assertFalse(np.any(velocity))

    def _target_box(self, velocity: list[float], predicted_time: float) -> float:
        return self._target_box_for((900, 400, 1000, 600), velocity, predicted_time)

    def _target_box_for(
        self,
        box: tuple[int, int, int, int],
        velocity: list[float],
        predicted_time: float,
    ) -> float:
        tracker = _make_tracker()
        tracker.tracked_object_history = {CAMERA: [{"box": box}]}
        tracker.tracked_object_metrics = {
            CAMERA: {"target_box": 0.2, "velocity": np.array(velocity)}
        }

        return tracker._predict_target_box(CAMERA, predicted_time)

    def test_target_box_grows_with_an_approaching_object(self) -> None:
        # the 200px height gains 4px per frame at 5 fps for 1 second
        zoom_factor = 0.3

        self.assertAlmostEqual(
            self._target_box([-1, -2, 1, 2], 1.0),
            0.2 * (220 / 200) ** (2 * zoom_factor),
        )

    def test_target_box_is_unchanged_without_growth_or_time(self) -> None:
        self.assertAlmostEqual(self._target_box([5, 0, 5, 0], 1.0), 0.2)
        self.assertEqual(self._target_box([-1, -2, 1, 2], 0), 0.2)


class TestAutotrackerCalibrationFailure(unittest.IsolatedAsyncioTestCase):
    async def test_calibration_failure_disables_autotracking(self) -> None:
        tracker = _make_tracker()
        camera_config = tracker.config.cameras[CAMERA]
        camera_config.onvif.autotracking.calibrate_on_startup = True
        tracker.tracked_object_history = {}
        tracker.tracked_object_metrics = {}
        tracker.move_metrics = {}
        tracker.intercept = {}
        tracker.move_coefficients = {}
        tracker.zoom_time = {}
        tracker.move_queues = {}
        tracker.move_queue_locks = {}
        tracker.onvif.loop = asyncio.get_running_loop()
        tracker.onvif.cams = {CAMERA: {"init": True, "features": ["pt-r-fov"]}}
        tracker.onvif.get_service_capabilities = AsyncMock(return_value=True)
        tracker.onvif.get_camera_status = AsyncMock()
        tracker._process_move_queue = AsyncMock()
        tracker._calibrate_camera = AsyncMock(side_effect=RuntimeError("disconnected"))
        tracker.autotracker_init[CAMERA] = False

        with self.assertLogs("frigate.ptz.autotrack", level="ERROR"):
            await tracker._autotracker_setup(camera_config, CAMERA, startup=True)

        self.assertFalse(camera_config.onvif.autotracking.enabled)
        self.assertFalse(tracker.autotracker_init[CAMERA])
        self.assertFalse(tracker.calibrating[CAMERA])


class TestAutotrackerMoveQueue(unittest.IsolatedAsyncioTestCase):
    async def test_absolute_zoom_does_not_overwrite_the_pan_tilt_sample(self) -> None:
        tracker = _make_tracker()
        autotracking = tracker.config.cameras[CAMERA].onvif.autotracking
        autotracking.zooming = ZoomingModeEnum.absolute
        autotracking.calibrate_on_startup = True
        metrics = tracker.ptz_metrics[CAMERA]

        tracker.stop_event = MagicMock()
        tracker.stop_event.is_set.side_effect = [False, True]
        tracker.move_queues = {CAMERA: asyncio.Queue()}
        tracker.move_queue_locks = {CAMERA: asyncio.Lock()}
        tracker.intercept = {CAMERA: 0.5}
        tracker.move_metrics = {CAMERA: []}
        tracker._wait_until_stopped = AsyncMock()
        tracker._calculate_move_coefficients = MagicMock()

        async def move_relative(*_args) -> None:
            metrics.start_time.value = 100.0
            metrics.stop_time.value = 102.0

        async def zoom_absolute(*_args) -> None:
            metrics.start_time.value = 103.0
            metrics.stop_time.value = 0

        tracker.onvif._move_relative = AsyncMock(side_effect=move_relative)
        tracker.onvif._zoom_absolute = AsyncMock(side_effect=zoom_absolute)

        tracker.move_queues[CAMERA].put_nowait((50.0, 0.5, 0.5, 0.5))
        await tracker._process_move_queue(CAMERA)

        tracker.onvif._zoom_absolute.assert_awaited_once()
        self.assertEqual(
            tracker.move_metrics[CAMERA],
            [
                {
                    "pan": 0.5,
                    "tilt": 0.5,
                    "start_timestamp": 100.0,
                    "end_timestamp": 102.0,
                }
            ],
        )


class TestMaxTargetBox(unittest.TestCase):
    def test_follows_zoom_factor(self) -> None:
        self.assertAlmostEqual(calculate_max_target_box(0.5), 0.6**2)
        self.assertAlmostEqual(calculate_max_target_box(0.25), 0.6**4)


if __name__ == "__main__":
    unittest.main()
