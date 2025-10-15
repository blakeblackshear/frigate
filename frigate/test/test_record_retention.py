import unittest

from frigate.config import RetainModeEnum
from frigate.record.maintainer import SegmentInfo


class TestRecordRetention(unittest.TestCase):
    def test_motion_should_keep_motion_not_object(self):
        segment_info = SegmentInfo(
            motion_count=1, active_object_count=0, region_count=0, average_dBFS=0
        )
        assert not segment_info.should_discard_segment(RetainModeEnum.motion)
        assert segment_info.should_discard_segment(RetainModeEnum.active_objects)

    def test_object_should_keep_object_when_motion(self):
        segment_info = SegmentInfo(
            motion_count=0, active_object_count=1, region_count=0, average_dBFS=0
        )
        assert not segment_info.should_discard_segment(RetainModeEnum.motion)
        assert not segment_info.should_discard_segment(RetainModeEnum.active_objects)

    def test_all_should_keep_all(self):
        segment_info = SegmentInfo(
            motion_count=0, active_object_count=0, region_count=0, average_dBFS=0
        )
        assert not segment_info.should_discard_segment(RetainModeEnum.all)

    def test_should_keep_audio_in_motion_mode(self):
        segment_info = SegmentInfo(
            motion_count=0, active_object_count=0, region_count=0, average_dBFS=1
        )
        assert not segment_info.should_discard_segment(RetainModeEnum.motion)
        assert segment_info.should_discard_segment(RetainModeEnum.active_objects)
