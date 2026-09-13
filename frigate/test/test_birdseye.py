"""Tests for Birdseye canvas sizing and layout behavior."""

import multiprocessing as mp
import unittest
from unittest.mock import Mock

from frigate.config import (
    BirdseyeModeEnum,
    FrigateConfig,
    birdseye_modes_from_mqtt_payload,
    birdseye_modes_to_mqtt_payload,
)
from frigate.output.birdseye import (
    Birdseye,
    BirdseyeActivity,
    BirdsEyeFrameManager,
    get_canvas_shape,
)


class TestBirdseye(unittest.TestCase):
    def _build_manager(
        self, camera_dimensions: dict[str, tuple[int, int]]
    ) -> BirdsEyeFrameManager:
        config = {
            "mqtt": {"host": "mqtt"},
            "birdseye": {"width": 1280, "height": 720},
            "cameras": {},
        }

        for order, (camera, dimensions) in enumerate(
            camera_dimensions.items(), start=1
        ):
            config["cameras"][camera] = {
                "ffmpeg": {
                    "inputs": [
                        {
                            "path": f"rtsp://10.0.0.1:554/{camera}",
                            "roles": ["detect"],
                        }
                    ]
                },
                "detect": {
                    "width": dimensions[0],
                    "height": dimensions[1],
                    "fps": 5,
                },
                "birdseye": {"order": order},
            }

        return BirdsEyeFrameManager(FrigateConfig(**config), mp.Event())

    def _assert_no_overlaps(
        self, layout: list[list[tuple[str, tuple[int, int, int, int]]]]
    ):
        rectangles = [position for row in layout for _, position in row]

        for index, rect in enumerate(rectangles):
            x1, y1, width1, height1 = rect
            for other in rectangles[index + 1 :]:
                x2, y2, width2, height2 = other
                overlap = (
                    x1 < x2 + width2
                    and x2 < x1 + width1
                    and y1 < y2 + height2
                    and y2 < y1 + height1
                )
                self.assertFalse(
                    overlap,
                    msg=f"Overlapping rectangles found: {rect} and {other}",
                )

    def test_16x9(self):
        """Test 16x9 aspect ratio works as expected for birdseye."""
        width = 1280
        height = 720
        canvas_width, canvas_height = get_canvas_shape(width, height)
        assert canvas_width == width
        assert canvas_height == height

    def test_4x3(self):
        """Test 4x3 aspect ratio works as expected for birdseye."""
        width = 1280
        height = 960
        canvas_width, canvas_height = get_canvas_shape(width, height)
        assert canvas_width == width
        assert canvas_height == height

    def test_32x9(self):
        """Test 32x9 aspect ratio works as expected for birdseye."""
        width = 2560
        height = 720
        canvas_width, canvas_height = get_canvas_shape(width, height)
        assert canvas_width == width
        assert canvas_height == height

    def test_9x16(self):
        """Test 9x16 aspect ratio works as expected for birdseye."""
        width = 720
        height = 1280
        canvas_width, canvas_height = get_canvas_shape(width, height)
        assert canvas_width == width
        assert canvas_height == height

    def test_non_16x9(self):
        """Test non 16x9 aspect ratio fails for birdseye."""
        width = 1280
        height = 840
        canvas_width, canvas_height = get_canvas_shape(width, height)
        assert canvas_width == width  # width will be the same
        assert canvas_height != height

    def test_portrait_camera_does_not_overlap_next_row(self):
        """Portrait cameras should reserve their real horizontal position on the next row."""
        manager = self._build_manager(
            {
                "cam_a": (1280, 720),
                "cam_p": (360, 640),
                "cam_b": (1280, 720),
                "cam_c": (640, 480),
            }
        )

        layout = manager.calculate_layout(["cam_a", "cam_p", "cam_b", "cam_c"], 3)

        self.assertIsNotNone(layout)
        assert layout is not None
        self._assert_no_overlaps(layout)

        cam_c = [
            position for row in layout for camera, position in row if camera == "cam_c"
        ][0]
        self.assertEqual(cam_c[0], 0)

    def test_portrait_reservation_only_applies_to_next_row(self):
        """Portrait reservations should not push later rows after the span ends."""
        manager = self._build_manager(
            {
                "cam_a": (1280, 720),
                "cam_p": (360, 640),
                "cam_b": (1280, 720),
                "cam_c": (1280, 720),
                "cam_d": (1280, 720),
                "cam_e": (1280, 720),
            }
        )

        layout = manager.calculate_layout(
            ["cam_a", "cam_p", "cam_b", "cam_c", "cam_d", "cam_e"],
            3,
        )

        self.assertIsNotNone(layout)
        assert layout is not None
        self._assert_no_overlaps(layout)

        cam_e = [
            position for row in layout for camera, position in row if camera == "cam_e"
        ][0]
        self.assertEqual(cam_e[0], 0)

    def test_multiple_portraits_reserve_distinct_ranges(self):
        """Multiple portrait cameras in one row should reserve separate spans below them."""
        manager = self._build_manager(
            {
                "cam_a": (640, 480),
                "cam_p1": (360, 640),
                "cam_p2": (360, 640),
                "cam_b": (640, 480),
                "cam_c": (1280, 720),
                "cam_d": (640, 480),
            }
        )

        layout = manager.calculate_layout(
            ["cam_a", "cam_p1", "cam_p2", "cam_b", "cam_c", "cam_d"],
            4,
        )

        self.assertIsNotNone(layout)
        assert layout is not None
        self._assert_no_overlaps(layout)

    def test_two_landscapes_then_portrait_then_two_landscapes(self):
        """A portrait after two landscapes should reserve only its own tail span."""
        manager = self._build_manager(
            {
                "cam_a": (1280, 720),
                "cam_b": (1280, 720),
                "cam_p": (360, 640),
                "cam_c": (1280, 720),
                "cam_d": (1280, 720),
            }
        )

        layout = manager.calculate_layout(
            ["cam_a", "cam_b", "cam_p", "cam_c", "cam_d"],
            3,
        )

        self.assertIsNotNone(layout)
        assert layout is not None
        self._assert_no_overlaps(layout)

        cam_c = [
            position for row in layout for camera, position in row if camera == "cam_c"
        ][0]
        cam_d = [
            position for row in layout for camera, position in row if camera == "cam_d"
        ][0]
        self.assertEqual(cam_c[0], 0)
        self.assertEqual(cam_d[0], cam_c[0] + cam_c[2])


class TestBirdseyeActivity(unittest.TestCase):
    """Test which camera activity is included in each Birdseye mode."""

    def setUp(self):
        config = {
            "mqtt": {"enabled": False},
            "birdseye": {
                "enabled": True,
                "modes": ["motion", "all_objects"],
            },
            "cameras": {
                "front": {
                    "ffmpeg": {
                        "inputs": [
                            {"path": "rtsp://10.0.0.1:554/video", "roles": ["detect"]}
                        ]
                    },
                    "detect": {"height": 1080, "width": 1920, "fps": 5},
                }
            },
        }
        self.manager = BirdsEyeFrameManager(FrigateConfig(**config), mp.Event())

    def test_each_mode_matches_only_its_own_activity(self):
        motion_activity = BirdseyeActivity(
            has_object=False, has_motion=True, severity=None
        )
        object_activity = BirdseyeActivity(
            has_object=True, has_motion=False, severity=None
        )
        no_activity = BirdseyeActivity(
            has_object=False, has_motion=False, severity=None
        )

        assert self.manager.camera_threshold_active(
            [BirdseyeModeEnum.motion], motion_activity
        )
        assert not self.manager.camera_threshold_active(
            [BirdseyeModeEnum.motion], object_activity
        )
        assert self.manager.camera_threshold_active(
            [BirdseyeModeEnum.all_objects], object_activity
        )
        assert not self.manager.camera_threshold_active(
            [BirdseyeModeEnum.all_objects], motion_activity
        )
        assert self.manager.camera_live_active(
            [BirdseyeModeEnum.continuous], no_activity
        )

    def test_continuous_is_not_threshold_activity(self):
        no_activity = BirdseyeActivity(
            has_object=False, has_motion=False, severity=None
        )

        assert not self.manager.camera_threshold_active(
            [BirdseyeModeEnum.continuous], no_activity
        )

    def test_modes_can_be_combined(self):
        modes = [BirdseyeModeEnum.motion, BirdseyeModeEnum.all_objects]

        assert self.manager.camera_threshold_active(
            modes, BirdseyeActivity(has_object=False, has_motion=True, severity=None)
        )
        assert self.manager.camera_threshold_active(
            modes, BirdseyeActivity(has_object=True, has_motion=False, severity=None)
        )
        assert not self.manager.camera_threshold_active(
            modes, BirdseyeActivity(has_object=False, has_motion=False, severity=None)
        )

    def test_empty_modes_never_activate(self):
        activity = BirdseyeActivity(has_object=True, has_motion=True, severity=None)

        assert not self.manager.camera_threshold_active([], activity)
        assert not self.manager.camera_live_active([], activity)

    def test_alerts_and_detections_match_review_severity(self):
        alert = BirdseyeActivity(has_object=False, has_motion=False, severity="alert")
        detection = BirdseyeActivity(
            has_object=False, has_motion=False, severity="detection"
        )
        idle = BirdseyeActivity(has_object=False, has_motion=False, severity=None)

        assert self.manager.camera_live_active([BirdseyeModeEnum.alerts], alert)
        assert not self.manager.camera_live_active([BirdseyeModeEnum.alerts], detection)
        assert not self.manager.camera_live_active([BirdseyeModeEnum.alerts], idle)
        assert self.manager.camera_live_active([BirdseyeModeEnum.detections], detection)
        assert not self.manager.camera_live_active([BirdseyeModeEnum.detections], alert)

    def test_review_severity_is_not_threshold_activity(self):
        alert = BirdseyeActivity(has_object=False, has_motion=False, severity="alert")

        assert not self.manager.camera_threshold_active(
            [BirdseyeModeEnum.alerts, BirdseyeModeEnum.motion], alert
        )

    def test_all_objects_covers_active_and_stationary_objects(self):
        birdseye = Birdseye.__new__(Birdseye)
        birdseye.birdseye_manager = Mock()
        birdseye.birdseye_manager.update.return_value = (False, False)
        birdseye._idle_interval = None
        birdseye.review_severity = {}
        frame = Mock()

        birdseye.write_data(
            "front",
            [
                {"stationary": True, "false_positive": True},
                {"stationary": True, "false_positive": False},
            ],
            [[0, 0, 10, 10]],
            1.0,
            frame,
        )

        birdseye.birdseye_manager.update.assert_called_once_with(
            "front",
            BirdseyeActivity(has_object=True, has_motion=True, severity=None),
            1.0,
            frame,
        )

    def test_false_positives_do_not_count_as_objects(self):
        birdseye = Birdseye.__new__(Birdseye)
        birdseye.birdseye_manager = Mock()
        birdseye.birdseye_manager.update.return_value = (False, False)
        birdseye._idle_interval = None
        birdseye.review_severity = {}
        frame = Mock()

        birdseye.write_data(
            "front",
            [
                {"stationary": True, "false_positive": True},
                {"stationary": False, "false_positive": True},
            ],
            [],
            1.0,
            frame,
        )

        birdseye.birdseye_manager.update.assert_called_once_with(
            "front",
            BirdseyeActivity(has_object=False, has_motion=False, severity=None),
            1.0,
            frame,
        )


class TestBirdseyeCameraOrder(unittest.TestCase):
    """Test that birdseye reacts to camera order changes without a restart."""

    def setUp(self):
        config = {
            "mqtt": {"enabled": False},
            "birdseye": {"enabled": True, "modes": ["continuous"]},
            "cameras": {
                camera: {
                    "ffmpeg": {
                        "inputs": [
                            {"path": "rtsp://10.0.0.1:554/video", "roles": ["detect"]}
                        ]
                    },
                    "detect": {"height": 1080, "width": 1920, "fps": 5},
                }
                for camera in ("back", "front", "side")
            },
        }
        self.config = FrigateConfig(**config)
        self.manager = BirdsEyeFrameManager(self.config, mp.Event())

        # mark every camera as continuously active with no frame to draw, which
        # exercises the layout without needing real yuv frames
        for camera_data in self.manager.cameras.values():
            camera_data["current_frame"] = None
            camera_data["current_frame_time"] = 1.0
            camera_data["last_active_frame"] = 1.0
            camera_data["live_active"] = True

    def layout_order(self) -> list[str]:
        """Return the cameras in the order the current layout renders them."""
        return [position[0] for row in self.manager.camera_layout for position in row]

    def test_layout_uses_configured_order(self):
        """Test the layout is sorted by order, then by name when tied."""
        self.config.cameras["side"].birdseye.order = 0
        self.config.cameras["back"].birdseye.order = 10
        self.config.cameras["front"].birdseye.order = 20

        self.manager.update_frame()

        assert self.layout_order() == ["side", "back", "front"]

    def test_order_change_rebuilds_layout(self):
        """Test a reorder relayouts even though the active cameras are unchanged."""
        self.manager.update_frame()
        assert self.layout_order() == ["back", "front", "side"]

        # a stable active set means only an order change can reset the layout,
        # which is what a settings reorder publishes to this process
        self.config.cameras["side"].birdseye.order = -10

        _, layout_changed = self.manager.update_frame()

        assert layout_changed
        assert self.layout_order() == ["side", "back", "front"]

    def test_unchanged_order_keeps_layout(self):
        """Test a repeat update with no order change doesn't reset the layout."""
        self.manager.update_frame()

        _, layout_changed = self.manager.update_frame()

        assert not layout_changed
        assert self.layout_order() == ["back", "front", "side"]


class TestBirdseyeLiveActivity(unittest.TestCase):
    """Test that live activity bypasses the inactivity threshold."""

    def setUp(self):
        config = {
            "mqtt": {"enabled": False},
            "birdseye": {
                "enabled": True,
                "modes": ["continuous"],
                "inactivity_threshold": 30,
            },
            "cameras": {
                camera: {
                    "ffmpeg": {
                        "inputs": [
                            {"path": "rtsp://10.0.0.1:554/video", "roles": ["detect"]}
                        ]
                    },
                    "detect": {"height": 1080, "width": 1920, "fps": 5},
                }
                for camera in ("back", "front")
            },
        }
        self.config = FrigateConfig(**config)
        self.manager = BirdsEyeFrameManager(self.config, mp.Event())

        for camera_data in self.manager.cameras.values():
            camera_data["current_frame"] = None
            camera_data["current_frame_time"] = 1000.0
            camera_data["last_active_frame"] = 0.0
            camera_data["live_active"] = False

    def test_live_active_camera_is_shown_without_a_recent_active_frame(self):
        self.manager.cameras["front"]["live_active"] = True

        self.manager.update_frame()

        assert self.manager.active_cameras == {"front"}

    def test_live_active_camera_drops_out_immediately(self):
        self.manager.cameras["front"]["live_active"] = True
        self.manager.update_frame()
        assert self.manager.active_cameras == {"front"}

        self.manager.cameras["front"]["live_active"] = False
        self.manager.update_frame()

        assert self.manager.active_cameras == set()

    def test_threshold_activity_lingers_then_expires(self):
        self.manager.cameras["front"]["last_active_frame"] = 980.0
        self.manager.update_frame()
        assert self.manager.active_cameras == {"front"}

        self.manager.cameras["front"]["last_active_frame"] = 960.0
        self.manager.update_frame()

        assert self.manager.active_cameras == set()

    def test_max_cameras_ranks_live_active_cameras_first(self):
        self.config.birdseye.layout.max_cameras = 1
        self.manager.cameras["front"]["live_active"] = True
        self.manager.cameras["back"]["last_active_frame"] = 995.0

        self.manager.update_frame()

        assert self.manager.active_cameras == {"front"}


class TestBirdseyeModePayload(unittest.TestCase):
    """Test the MQTT payload contract for Birdseye activity modes."""

    def test_single_mode_round_trips(self):
        modes = birdseye_modes_from_mqtt_payload("ALERTS")

        assert modes == [BirdseyeModeEnum.alerts]
        assert birdseye_modes_to_mqtt_payload(modes) == "ALERTS"

    def test_combined_modes_are_published_in_enum_order(self):
        modes = birdseye_modes_from_mqtt_payload("ALERTS,MOTION")

        assert modes == [BirdseyeModeEnum.alerts, BirdseyeModeEnum.motion]
        assert birdseye_modes_to_mqtt_payload(modes) == "MOTION,ALERTS"

    def test_none_round_trips_to_an_empty_list(self):
        assert birdseye_modes_from_mqtt_payload("NONE") == []
        assert birdseye_modes_to_mqtt_payload([]) == "NONE"

    def test_invalid_payloads_are_rejected(self):
        for payload in (
            "UNKNOWN",
            "motion",
            "MOTION_OBJECTS",
            "NONE,MOTION",
            "MOTION,MOTION",
            "MOTION,",
            "",
        ):
            with self.subTest(payload=payload):
                assert birdseye_modes_from_mqtt_payload(payload) is None


class TestBirdseyeReviewSeverity(unittest.TestCase):
    """Test that review updates drive the per-camera severity map."""

    def setUp(self):
        self.birdseye = Birdseye.__new__(Birdseye)
        self.birdseye.review_subscriber = Mock()
        self.birdseye.review_severity = {}
        self.birdseye.birdseye_manager = Mock()
        self.birdseye.birdseye_manager.update.return_value = (False, False)
        self.birdseye._idle_interval = None

    def _drain(self, *updates):
        self.birdseye.review_subscriber.check_for_update.side_effect = [*updates, None]
        self.birdseye.check_review_updates()

    def test_new_segment_sets_severity(self):
        self._drain({"type": "new", "after": {"camera": "front", "severity": "alert"}})

        assert self.birdseye.review_severity == {"front": "alert"}

    def test_update_upgrades_severity(self):
        self._drain(
            {"type": "new", "after": {"camera": "front", "severity": "detection"}},
            {"type": "update", "after": {"camera": "front", "severity": "alert"}},
        )

        assert self.birdseye.review_severity == {"front": "alert"}

    def test_end_clears_severity(self):
        self._drain(
            {"type": "new", "after": {"camera": "front", "severity": "alert"}},
            {"type": "end", "after": {"camera": "front", "severity": "alert"}},
        )

        assert self.birdseye.review_severity == {}

    def test_write_data_passes_the_tracked_severity(self):
        self.birdseye.review_severity = {"front": "alert"}
        frame = Mock()

        self.birdseye.write_data("front", [], [], 1.0, frame)

        self.birdseye.birdseye_manager.update.assert_called_once_with(
            "front",
            BirdseyeActivity(has_object=False, has_motion=False, severity="alert"),
            1.0,
            frame,
        )
