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

import unittest
from unittest.mock import MagicMock

from frigate.camera import PTZMetrics
from frigate.config import FrigateConfig
from frigate.config.camera.updater import CameraConfigUpdateEnum
from frigate.ptz.autotrack import PtzAutoTracker

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


if __name__ == "__main__":
    unittest.main()
