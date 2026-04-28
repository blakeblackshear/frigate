import logging
import unittest
from unittest.mock import MagicMock

from frigate.comms.recordings_updater import RecordingsDataTypeEnum
from frigate.video.ffmpeg import CameraWatchdog


def _make_watchdog(camera_name: str = "front_door") -> CameraWatchdog:
    """Create a CameraWatchdog with only the attributes needed by _process_segment_updates."""
    watchdog = object.__new__(CameraWatchdog)
    watchdog.config = MagicMock()
    watchdog.config.name = camera_name
    watchdog.logger = logging.getLogger("test.watchdog")
    watchdog.latest_valid_segment_time = 0.0
    watchdog.latest_invalid_segment_time = 0.0
    watchdog.latest_cache_segment_time = 0.0
    watchdog.segment_subscriber = MagicMock()
    return watchdog


def _topic(type_enum: RecordingsDataTypeEnum) -> str:
    return f"recordings/{type_enum.value}"


def _msg(topic: RecordingsDataTypeEnum, camera: str, t: float):
    return (_topic(topic), (camera, t, None))


class TestProcessSegmentUpdates(unittest.TestCase):
    def test_in_order_valid_segments(self):
        """Segments arriving in order advance latest_valid_segment_time to the last value."""
        watchdog = _make_watchdog()
        watchdog.segment_subscriber.check_for_update.side_effect = [
            _msg(RecordingsDataTypeEnum.valid, "front_door", 10.0),
            _msg(RecordingsDataTypeEnum.valid, "front_door", 20.0),
            _msg(RecordingsDataTypeEnum.valid, "front_door", 30.0),
            (None, None),
        ]
        watchdog._drain_segment_updates()
        self.assertEqual(watchdog.latest_valid_segment_time, 30.0)

    def test_out_of_order_valid_segments(self):
        """Out-of-order valid segments still result in the maximum timestamp."""
        watchdog = _make_watchdog()
        watchdog.segment_subscriber.check_for_update.side_effect = [
            _msg(RecordingsDataTypeEnum.valid, "front_door", 20.0),
            _msg(RecordingsDataTypeEnum.valid, "front_door", 10.0),
            _msg(RecordingsDataTypeEnum.valid, "front_door", 30.0),
            (None, None),
        ]
        watchdog._drain_segment_updates()
        self.assertEqual(watchdog.latest_valid_segment_time, 30.0)

    def test_out_of_order_cache_segments(self):
        """Out-of-order cache (latest) segments still result in the maximum timestamp."""
        watchdog = _make_watchdog()
        watchdog.segment_subscriber.check_for_update.side_effect = [
            _msg(RecordingsDataTypeEnum.latest, "front_door", 100.0),
            _msg(RecordingsDataTypeEnum.latest, "front_door", 50.0),
            _msg(RecordingsDataTypeEnum.latest, "front_door", 200.0),
            (None, None),
        ]
        watchdog._drain_segment_updates()
        self.assertEqual(watchdog.latest_cache_segment_time, 200.0)

    def test_cache_none_resets_to_zero(self):
        """A None cache segment time resets latest_cache_segment_time to 0."""
        watchdog = _make_watchdog()
        watchdog.segment_subscriber.check_for_update.side_effect = [
            _msg(RecordingsDataTypeEnum.latest, "front_door", 100.0),
            (_topic(RecordingsDataTypeEnum.latest), ("front_door", None, None)),
            (None, None),
        ]
        watchdog._drain_segment_updates()
        self.assertEqual(watchdog.latest_cache_segment_time, 0.0)

    def test_messages_for_other_camera_ignored(self):
        """Segment messages for a different camera do not update timestamps."""
        watchdog = _make_watchdog(camera_name="front_door")
        watchdog.segment_subscriber.check_for_update.side_effect = [
            _msg(RecordingsDataTypeEnum.valid, "back_yard", 999.0),
            _msg(RecordingsDataTypeEnum.invalid, "back_yard", 999.0),
            _msg(RecordingsDataTypeEnum.latest, "back_yard", 999.0),
            (None, None),
        ]
        watchdog._drain_segment_updates()
        self.assertEqual(watchdog.latest_valid_segment_time, 0.0)
        self.assertEqual(watchdog.latest_invalid_segment_time, 0.0)
        self.assertEqual(watchdog.latest_cache_segment_time, 0.0)

    def test_out_of_order_invalid_segments(self):
        """Out-of-order invalid segments still result in the maximum timestamp."""
        watchdog = _make_watchdog()
        watchdog.segment_subscriber.check_for_update.side_effect = [
            _msg(RecordingsDataTypeEnum.invalid, "front_door", 5.0),
            _msg(RecordingsDataTypeEnum.invalid, "front_door", 15.0),
            _msg(RecordingsDataTypeEnum.invalid, "front_door", 8.0),
            (None, None),
        ]
        watchdog._drain_segment_updates()
        self.assertEqual(watchdog.latest_invalid_segment_time, 15.0)

    def test_mixed_types_tracked_independently(self):
        """Valid, invalid, and cache segment times are each tracked independently."""
        watchdog = _make_watchdog()
        watchdog.segment_subscriber.check_for_update.side_effect = [
            _msg(RecordingsDataTypeEnum.valid, "front_door", 10.0),
            _msg(RecordingsDataTypeEnum.invalid, "front_door", 20.0),
            _msg(RecordingsDataTypeEnum.latest, "front_door", 30.0),
            (None, None),
        ]
        watchdog._drain_segment_updates()
        self.assertEqual(watchdog.latest_valid_segment_time, 10.0)
        self.assertEqual(watchdog.latest_invalid_segment_time, 20.0)
        self.assertEqual(watchdog.latest_cache_segment_time, 30.0)


if __name__ == "__main__":
    unittest.main()
