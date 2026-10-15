"""Zone entry for tracked objects the detector has lost."""

import unittest

from frigate.config import FrigateConfig
from frigate.track.tracked_object import TrackedObject

CAMERA = "cam"
FPS = 5
INERTIA = 3
OUTSIDE_X = 200
INSIDE_X = 480


def _config() -> FrigateConfig:
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
                    "detect": {"width": 640, "height": 480, "fps": FPS},
                    "objects": {"track": ["car"]},
                    "zones": {
                        "zone": {
                            "coordinates": "0.5,0,1,0,1,1,0.5,1",
                            "inertia": INERTIA,
                        }
                    },
                }
            },
        }
    )


def _obj_data(x: int, frame_time: float) -> dict:
    return {
        "id": "1000.0-abcdef",
        "label": "car",
        "frame_time": frame_time,
        "start_time": 1000.0,
        "score": 0.9,
        "box": (x - 40, 200, x + 40, 260),
        "area": 4800,
        "ratio": 1.33,
        "region": (0, 0, 640, 480),
        "centroid": (x, 230),
        "position_changes": 1,
        "motionless_count": 0,
        "attributes": [],
    }


class TestTrackedObjectZones(unittest.TestCase):
    def setUp(self):
        config = _config()
        camera_config = config.cameras[CAMERA]
        self.obj = TrackedObject(
            config.model_for_camera(CAMERA),
            camera_config,
            config.ui,
            {},
            {**_obj_data(OUTSIDE_X, 1000.0), "score_history": [0.9]},
        )
        self.frame = 0

    def _step(self, x: int, detected: bool = True) -> None:
        """Advance one frame. A lost object keeps the box from its last detection."""
        self.frame += 1
        current_frame_time = 1000.0 + self.frame / FPS

        if detected:
            self.last_detection = _obj_data(x, current_frame_time)

        self.obj.update(current_frame_time, dict(self.last_detection), False)

    def test_lost_object_does_not_enter_zone(self):
        self._step(INSIDE_X)

        for _ in range(INERTIA * 3):
            self._step(INSIDE_X, detected=False)

        self.assertEqual(self.obj.current_zones, [])
        self.assertEqual(self.obj.entered_zones, [])

    def test_lost_object_enters_zone_when_detected_again(self):
        self._step(INSIDE_X)

        for _ in range(INERTIA):
            self._step(INSIDE_X, detected=False)

        self._step(INSIDE_X)
        self.assertEqual(self.obj.entered_zones, ["zone"])

    def test_detected_object_enters_zone(self):
        for _ in range(INERTIA - 1):
            self._step(INSIDE_X)

        self.assertEqual(self.obj.entered_zones, [])

        self._step(INSIDE_X)
        self.assertEqual(self.obj.current_zones, ["zone"])
        self.assertEqual(self.obj.entered_zones, ["zone"])

    def test_object_in_zone_stays_while_lost(self):
        for _ in range(INERTIA):
            self._step(INSIDE_X)

        for _ in range(INERTIA):
            self._step(INSIDE_X, detected=False)

        self.assertEqual(self.obj.current_zones, ["zone"])


if __name__ == "__main__":
    unittest.main()
