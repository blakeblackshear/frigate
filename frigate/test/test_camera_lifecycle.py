"""Regression tests for runtime camera add and delete handling."""

import unittest
from types import SimpleNamespace
from unittest.mock import MagicMock

# LicensePlatePostProcessor is imported via the maintainer rather than from
# data_processing.post.license_plate, which circularly imports back through
# frigate.embeddings before that package finishes initializing
from frigate.embeddings.maintainer import (
    EmbeddingMaintainer,
    LicensePlatePostProcessor,
)
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


class TestEmbeddingsUnknownCamera(unittest.TestCase):
    def _make_maintainer(self) -> EmbeddingMaintainer:
        maintainer = EmbeddingMaintainer.__new__(EmbeddingMaintainer)
        maintainer.config = SimpleNamespace(cameras={})
        maintainer.event_end_subscriber = MagicMock()
        maintainer.realtime_processors = [MagicMock()]
        # spec is required: the dispatch loop is a chain of isinstance checks,
        # and a bare MagicMock matches none of them, so the crashing branch
        # would never run and the test would pass against unfixed code
        maintainer.post_processors = [MagicMock(spec=LicensePlatePostProcessor)]
        maintainer.detected_license_plates = {"1234.5-abcdef": {"obj_data": {}}}
        maintainer.recordings_available_through = {"deleted_cam": 1234.5}
        maintainer.event_metadata_publisher = MagicMock()
        return maintainer

    def test_process_finalized_skips_unknown_camera(self):
        maintainer = self._make_maintainer()
        # updated_db=False bypasses the Event.get branch, which would hit the
        # database and mask the KeyError this test is about
        maintainer.event_end_subscriber.check_for_update.side_effect = [
            ("1234.5-abcdef", "deleted_cam", False),
            None,
        ]

        maintainer._process_finalized()

        maintainer.post_processors[0].process_data.assert_not_called()

    def test_process_finalized_still_expires_realtime_state(self):
        """The guard must not skip per-event cleanup, only post processing."""
        maintainer = self._make_maintainer()
        maintainer.event_end_subscriber.check_for_update.side_effect = [
            ("1234.5-abcdef", "deleted_cam", False),
            None,
        ]

        maintainer._process_finalized()

        maintainer.realtime_processors[0].expire_object.assert_called_once_with(
            "1234.5-abcdef", "deleted_cam"
        )

    def test_expire_dedicated_lpr_drops_entry_for_unknown_camera(self):
        maintainer = self._make_maintainer()
        maintainer.detected_license_plates = {
            "1234.5-abcdef": {"camera": "deleted_cam", "last_seen": 1.0}
        }

        maintainer._expire_dedicated_lpr()

        self.assertEqual(maintainer.detected_license_plates, {})
