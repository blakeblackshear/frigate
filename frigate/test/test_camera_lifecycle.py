"""Regression tests for runtime camera add and delete handling."""

import unittest
from types import SimpleNamespace
from unittest.mock import MagicMock

from frigate.track.object_processing import TrackedObjectProcessor


def _make_processor() -> TrackedObjectProcessor:
    """Build a processor with no cameras, bypassing __init__."""
    processor = TrackedObjectProcessor.__new__(TrackedObjectProcessor)
    processor.camera_states = {}
    processor.config = SimpleNamespace(cameras={})
    processor.event_sender = MagicMock()
    processor.detection_publisher = MagicMock()
    processor.ongoing_manual_events = {}
    return processor


class TestObjectProcessorUnknownCamera(unittest.TestCase):
    def test_save_lpr_snapshot_ignores_unknown_camera(self):
        processor = _make_processor()

        # 1x1 png, base64; decoding must not be what fails
        payload = (
            "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
            "1234.5-abcdef",
            "deleted_cam",
        )

        processor.save_lpr_snapshot(payload)

        processor.event_sender.publish.assert_not_called()

    def test_create_manual_event_ignores_unknown_camera(self):
        processor = _make_processor()

        payload = (
            1234.5,
            "deleted_cam",
            "person",
            "1234.5-abcdef",
            True,
            0.9,
            None,
            None,
            "api",
            False,
            None,
        )

        processor.create_manual_event(payload)

        processor.event_sender.publish.assert_not_called()
        self.assertEqual(processor.ongoing_manual_events, {})

    def test_create_lpr_event_ignores_unknown_camera(self):
        processor = _make_processor()

        payload = (
            1234.5,
            "deleted_cam",
            "license_plate",
            "1234.5-abcdef",
            True,
            0.9,
            None,
            "ABC123",
        )

        processor.create_lpr_event(payload)

        processor.event_sender.publish.assert_not_called()
        self.assertEqual(processor.ongoing_manual_events, {})

    def test_create_manual_event_ignores_camera_added_but_not_yet_drained(self):
        """The add window: present in config.cameras, absent from camera_states.

        debug_replay writes the camera into the shared config before publishing
        add, so a guard on config.cameras passes here and falls through to
        camera_states. This test fails against such a guard.
        """
        processor = _make_processor()
        processor.config = SimpleNamespace(
            cameras={
                "new_cam": SimpleNamespace(
                    record=SimpleNamespace(event_pre_capture=5, enabled=True)
                )
            }
        )

        payload = (
            1234.5,
            "new_cam",
            "person",
            "1234.5-abcdef",
            True,
            0.9,
            None,
            None,
            "api",
            False,
            None,
        )

        processor.create_manual_event(payload)

        processor.event_sender.publish.assert_not_called()
