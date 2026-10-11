"""Tracker selection when autotracking config changes at runtime."""

import unittest
from unittest.mock import MagicMock

import numpy as np

from frigate.camera import PTZMetrics
from frigate.config import FrigateConfig
from frigate.track.norfair_tracker import NorfairTracker

CAMERA = "ptz_cam"
BOX = (400, 200, 500, 500)


def _config(enabled: bool, track: list[str] | None = None) -> FrigateConfig:
    autotracking: dict = {"enabled": enabled, "required_zones": ["zone"]}

    if track is not None:
        autotracking["track"] = track

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
                    "detect": {"width": 1280, "height": 720},
                    "zones": {"zone": {"coordinates": "0,0,1,0,1,1,0,1"}},
                    "onvif": {"host": "10.0.0.1", "autotracking": autotracking},
                }
            },
        }
    )


class TestTrackerSelection(unittest.TestCase):
    def setUp(self) -> None:
        self.frame_time = 1000.0

    def make_tracker(self, enabled: bool) -> NorfairTracker:
        camera_config = _config(enabled).cameras[CAMERA]
        tracker = NorfairTracker(camera_config, PTZMetrics())
        tracker.frame_manager = MagicMock()
        tracker.frame_manager.get.return_value = np.zeros(
            camera_config.frame_shape_yuv, dtype=np.uint8
        )
        tracker.ptz_motion_estimator = MagicMock()
        tracker.ptz_motion_estimator.motion_estimator.return_value = None
        return tracker

    def apply_onvif_update(self, tracker: NorfairTracker, config: FrigateConfig):
        """Apply an onvif config update the way the camera process does."""
        tracker.camera_config.onvif = config.cameras[CAMERA].onvif
        tracker.sync_trackers()

    def run_frames(self, tracker: NorfairTracker, count: int, label="person"):
        for _ in range(count):
            self.frame_time += 0.2
            tracker.match_and_update(
                "frame",
                self.frame_time,
                [(label, 0.9, BOX, 30000, 0.33, (0, 0, 640, 640))],
            )

    def test_disabling_autotracking_falls_back_to_static_tracker(self):
        tracker = self.make_tracker(enabled=True)
        self.run_frames(tracker, 10)
        self.assertIs(tracker.get_tracker("person"), tracker.trackers["person"]["ptz"])

        self.apply_onvif_update(tracker, _config(enabled=False))
        self.run_frames(tracker, 10)

        self.assertIs(tracker.get_tracker("person"), tracker.default_tracker["static"])
        self.assertEqual(len(tracker.tracked_objects), 1)

    def test_enabling_autotracking_uses_ptz_tracker(self):
        tracker = self.make_tracker(enabled=False)
        self.run_frames(tracker, 10)
        self.assertIs(tracker.get_tracker("person"), tracker.default_tracker["static"])

        self.apply_onvif_update(tracker, _config(enabled=True))
        self.run_frames(tracker, 10)

        self.assertIs(tracker.get_tracker("person"), tracker.trackers["person"]["ptz"])
        self.assertEqual(len(tracker.tracked_objects), 1)

    def test_removing_label_from_autotracking_keeps_tracking(self):
        tracker = self.make_tracker(enabled=True)
        self.run_frames(tracker, 10)

        self.apply_onvif_update(tracker, _config(enabled=True, track=["car"]))
        self.run_frames(tracker, 10)

        self.assertNotIn("person", tracker.trackers)
        self.assertIs(tracker.get_tracker("person"), tracker.default_tracker["ptz"])
        self.assertEqual(len(tracker.tracked_objects), 1)

    def test_unrelated_onvif_update_keeps_objects(self):
        tracker = self.make_tracker(enabled=True)
        self.run_frames(tracker, 10)
        ids = set(tracker.tracked_objects)

        config = _config(enabled=True)
        config.cameras[CAMERA].onvif.password = "changed"
        self.apply_onvif_update(tracker, config)
        self.run_frames(tracker, 5)

        self.assertEqual(set(tracker.tracked_objects), ids)

    def test_runtime_toggle_keeps_objects(self):
        # MQTT and the autotracker only flip enabled, never enabled_in_config
        tracker = self.make_tracker(enabled=True)
        self.run_frames(tracker, 10)
        ids = set(tracker.tracked_objects)

        tracker.camera_config.onvif.autotracking.enabled = False
        tracker.sync_trackers()
        self.run_frames(tracker, 5)

        self.assertEqual(set(tracker.tracked_objects), ids)

    def test_unlisted_label_uses_the_default_tracker_that_holds_it(self):
        tracker = self.make_tracker(enabled=True)
        self.run_frames(tracker, 10, label="dog")

        default = tracker.get_tracker("dog")
        self.assertIs(default, tracker.default_tracker["ptz"])
        self.assertEqual(
            {str(o.global_id) for o in default.tracked_objects},
            set(tracker.track_id_map),
        )
