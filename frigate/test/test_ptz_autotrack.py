"""Tests for autotracker state that must survive runtime config changes.

Regression coverage for a family of bugs where per-camera autotracker state was
built once at startup and never revisited. A camera that is added or enabled
after startup, or has autotracking enabled from the UI, would either raise a
KeyError on the autotracker thread or silently keep the wrong state:

- autotracker_init only got an entry for cameras enabled when PtzAutoTracker was
  constructed, so runtime-enabled cameras raised KeyError on lookup.
- ptz_metrics autotracker_enabled is what the camera processes read, but nothing
  updated it when autotracking was enabled through a config save, so it stayed
  False and the tracker never built a motion estimator.
"""

import unittest
from unittest.mock import MagicMock

from frigate.camera import PTZMetrics
from frigate.config import FrigateConfig
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
    tracker.ptz_metrics = {CAMERA: PTZMetrics(autotracker_enabled=False)}
    tracker.onvif = MagicMock()
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


class TestAutotrackerMetricSync(unittest.TestCase):
    def test_metric_follows_config_when_enabled_by_update(self) -> None:
        # autotracking enabled via a config save: the metric was seeded False when
        # the camera was added and nothing else updates it
        tracker = _make_tracker(autotracking_enabled=True)
        metrics = tracker.ptz_metrics[CAMERA]
        self.assertFalse(metrics.autotracker_enabled.value)

        tracker.config_subscriber.check_for_updates.return_value = {"onvif": [CAMERA]}
        tracker.check_for_updates()

        self.assertTrue(metrics.autotracker_enabled.value)

    def test_metric_follows_config_when_disabled_by_update(self) -> None:
        tracker = _make_tracker(autotracking_enabled=False)
        metrics = tracker.ptz_metrics[CAMERA]
        metrics.autotracker_enabled.value = True

        tracker.config_subscriber.check_for_updates.return_value = {
            "autotracking": [CAMERA]
        }
        tracker.check_for_updates()

        self.assertFalse(metrics.autotracker_enabled.value)

    def test_metric_sync_skips_camera_without_metrics(self) -> None:
        # `add` reaches the maintainer and the autotracker on separate threads with
        # no ordering guarantee, so the metrics may not exist yet
        tracker = _make_tracker()
        tracker.ptz_metrics = {}
        tracker.config_subscriber.check_for_updates.return_value = {"add": [CAMERA]}

        tracker.check_for_updates()

    def test_metric_sync_skips_unknown_camera(self) -> None:
        tracker = _make_tracker()
        tracker.config_subscriber.check_for_updates.return_value = {
            "add": ["not_in_config"]
        }

        tracker.check_for_updates()


if __name__ == "__main__":
    unittest.main()
