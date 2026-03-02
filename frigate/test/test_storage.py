import datetime
import logging
import os
import tempfile
import unittest
from unittest.mock import MagicMock

from peewee import DoesNotExist
from peewee_migrate import Router
from playhouse.sqlite_ext import SqliteExtDatabase
from playhouse.sqliteq import SqliteQueueDatabase

from frigate.config import FrigateConfig
from frigate.models import Event, Recordings, ReviewSegment
from frigate.storage import StorageMaintainer
from frigate.test.const import TEST_DB, TEST_DB_CLEANUPS


class TestHttp(unittest.TestCase):
    def setUp(self):
        # setup clean database for each test run
        migrate_db = SqliteExtDatabase("test.db")
        del logging.getLogger("peewee_migrate").handlers[:]
        router = Router(migrate_db)
        router.run()
        migrate_db.close()
        self.db = SqliteQueueDatabase(TEST_DB)
        models = [Event, Recordings, ReviewSegment]
        self.db.bind(models)
        self.test_dir = tempfile.mkdtemp()

        self.minimal_config = {
            "mqtt": {"host": "mqtt"},
            "cameras": {
                "front_door": {
                    "ffmpeg": {
                        "inputs": [
                            {"path": "rtsp://10.0.0.1:554/video", "roles": ["detect"]}
                        ]
                    },
                    "detect": {
                        "height": 1080,
                        "width": 1920,
                        "fps": 5,
                    },
                }
            },
        }
        self.double_cam_config = {
            "mqtt": {"host": "mqtt"},
            "cameras": {
                "front_door": {
                    "ffmpeg": {
                        "inputs": [
                            {"path": "rtsp://10.0.0.1:554/video", "roles": ["detect"]}
                        ]
                    },
                    "detect": {
                        "height": 1080,
                        "width": 1920,
                        "fps": 5,
                    },
                },
                "back_door": {
                    "ffmpeg": {
                        "inputs": [
                            {"path": "rtsp://10.0.0.2:554/video", "roles": ["detect"]}
                        ]
                    },
                    "detect": {
                        "height": 1080,
                        "width": 1920,
                        "fps": 5,
                    },
                },
            },
        }

    def tearDown(self):
        if not self.db.is_closed():
            self.db.close()

        try:
            for file in TEST_DB_CLEANUPS:
                os.remove(file)
        except OSError:
            pass

    def test_segment_calculations(self):
        """Test that the segment calculations are correct."""
        config = FrigateConfig(**self.double_cam_config)
        storage = StorageMaintainer(config, MagicMock())

        time_keep = datetime.datetime.now().timestamp()
        rec_fd_id = "1234567.frontdoor"
        rec_bd_id = "1234568.backdoor"
        _insert_mock_recording(
            rec_fd_id,
            os.path.join(self.test_dir, f"{rec_fd_id}.tmp"),
            time_keep,
            time_keep + 10,
            camera="front_door",
            seg_size=4,
            seg_dur=10,
        )
        _insert_mock_recording(
            rec_bd_id,
            os.path.join(self.test_dir, f"{rec_bd_id}.tmp"),
            time_keep + 10,
            time_keep + 20,
            camera="back_door",
            seg_size=8,
            seg_dur=20,
        )
        storage.calculate_camera_bandwidth()
        assert storage.camera_storage_stats == {
            "front_door": {"bandwidth": 1440, "needs_refresh": True},
            "back_door": {"bandwidth": 2880, "needs_refresh": True},
        }

    def test_segment_calculations_with_zero_segments(self):
        """Ensure segment calculation does not fail when migrating from previous version."""
        config = FrigateConfig(**self.minimal_config)
        storage = StorageMaintainer(config, MagicMock())

        time_keep = datetime.datetime.now().timestamp()
        rec_fd_id = "1234567.frontdoor"
        _insert_mock_recording(
            rec_fd_id,
            os.path.join(self.test_dir, f"{rec_fd_id}.tmp"),
            time_keep,
            time_keep + 10,
            camera="front_door",
            seg_size=0,
            seg_dur=10,
        )
        storage.calculate_camera_bandwidth()
        assert storage.camera_storage_stats == {
            "front_door": {"bandwidth": 0, "needs_refresh": True},
        }

    def test_storage_cleanup(self):
        """Ensure that all recordings are cleaned up when necessary."""
        config = FrigateConfig(**self.minimal_config)
        storage = StorageMaintainer(config, MagicMock())

        id = "123456.keep"
        time_keep = datetime.datetime.now().timestamp()
        _insert_mock_event(
            id,
            time_keep,
            time_keep + 30,
            True,
        )
        rec_k_id = "1234567.keep"
        rec_k2_id = "1234568.keep"
        rec_k3_id = "1234569.keep"
        _insert_mock_recording(
            rec_k_id,
            os.path.join(self.test_dir, f"{rec_k_id}.tmp"),
            time_keep,
            time_keep + 10,
        )
        _insert_mock_recording(
            rec_k2_id,
            os.path.join(self.test_dir, f"{rec_k2_id}.tmp"),
            time_keep + 10,
            time_keep + 20,
        )
        _insert_mock_recording(
            rec_k3_id,
            os.path.join(self.test_dir, f"{rec_k3_id}.tmp"),
            time_keep + 20,
            time_keep + 30,
        )

        id2 = "7890.delete"
        time_delete = datetime.datetime.now().timestamp() - 360
        _insert_mock_event(id2, time_delete, time_delete + 30, False)
        rec_d_id = "78901.delete"
        rec_d2_id = "78902.delete"
        rec_d3_id = "78903.delete"
        _insert_mock_recording(
            rec_d_id,
            os.path.join(self.test_dir, f"{rec_d_id}.tmp"),
            time_delete,
            time_delete + 10,
        )
        _insert_mock_recording(
            rec_d2_id,
            os.path.join(self.test_dir, f"{rec_d2_id}.tmp"),
            time_delete + 10,
            time_delete + 20,
        )
        _insert_mock_recording(
            rec_d3_id,
            os.path.join(self.test_dir, f"{rec_d3_id}.tmp"),
            time_delete + 20,
            time_delete + 30,
        )

        storage.calculate_camera_bandwidth()
        storage.reduce_storage_consumption()
        with self.assertRaises(DoesNotExist):
            assert Recordings.get(Recordings.id == rec_k_id)
            assert Recordings.get(Recordings.id == rec_k2_id)
            assert Recordings.get(Recordings.id == rec_k3_id)
            Recordings.get(Recordings.id == rec_d_id)
            Recordings.get(Recordings.id == rec_d2_id)
            Recordings.get(Recordings.id == rec_d3_id)

    def test_storage_cleanup_keeps_retained(self):
        """Ensure that all recordings are cleaned up when necessary."""
        config = FrigateConfig(**self.minimal_config)
        storage = StorageMaintainer(config, MagicMock())

        id = "123456.keep"
        time_keep = datetime.datetime.now().timestamp()
        _insert_mock_event(
            id,
            time_keep,
            time_keep + 30,
            True,
        )
        rec_k_id = "1234567.keep"
        rec_k2_id = "1234568.keep"
        rec_k3_id = "1234569.keep"
        _insert_mock_recording(
            rec_k_id,
            os.path.join(self.test_dir, f"{rec_k_id}.tmp"),
            time_keep,
            time_keep + 10,
        )
        _insert_mock_recording(
            rec_k2_id,
            os.path.join(self.test_dir, f"{rec_k2_id}.tmp"),
            time_keep + 10,
            time_keep + 20,
        )
        _insert_mock_recording(
            rec_k3_id,
            os.path.join(self.test_dir, f"{rec_k3_id}.tmp"),
            time_keep + 20,
            time_keep + 30,
        )

        time_delete = datetime.datetime.now().timestamp() - 7200
        for i in range(0, 59):
            id = f"{123456 + i}.delete"
            _insert_mock_recording(
                id,
                os.path.join(self.test_dir, f"{id}.tmp"),
                time_delete,
                time_delete + 600,
            )

        storage.calculate_camera_bandwidth()
        storage.reduce_storage_consumption()
        assert Recordings.get(Recordings.id == rec_k_id)
        assert Recordings.get(Recordings.id == rec_k2_id)
        assert Recordings.get(Recordings.id == rec_k3_id)

    def test_storage_cleanup_runs_in_rollover_mode(self):
        """Ensure StorageMaintainer works correctly in rollover mode."""
        self.minimal_config["record"] = {
            "enabled": True,
            "retain_policy": "continuous_rollover",
        }
        config = FrigateConfig(**self.minimal_config)
        storage = StorageMaintainer(config, MagicMock())

        # Insert old recordings that should be deleted when space is needed
        time_old = datetime.datetime.now().timestamp() - 7200
        for i in range(10):
            rec_id = f"{100000 + i}.rollover"
            _insert_mock_recording(
                rec_id,
                os.path.join(self.test_dir, f"{rec_id}.tmp"),
                time_old + (i * 600),
                time_old + ((i + 1) * 600),
            )

        storage.calculate_camera_bandwidth()
        # StorageMaintainer should be able to run reduce_storage_consumption
        # without errors in rollover mode
        storage.reduce_storage_consumption()

    def _get_rollover_config(self):
        """Return a config dict with rollover mode and event retention settings."""
        config = dict(self.minimal_config)
        config["record"] = {
            "enabled": True,
            "retain_policy": "continuous_rollover",
            "alerts": {"retain": {"days": 10}},
            "detections": {"retain": {"days": 5}},
        }
        return config

    def test_rollover_deletes_overwritable_before_event_retention(self):
        """Overwritable recordings are deleted first; event-retention survive."""
        config = FrigateConfig(**self._get_rollover_config())
        storage = StorageMaintainer(config, MagicMock())

        now = datetime.datetime.now().timestamp()
        time_old = now - 7200

        # Insert overwritable recordings (no review overlap) — old, should be deleted
        for i in range(60):
            rec_id = f"{200000 + i}.overwritable"
            _insert_mock_recording(
                rec_id,
                os.path.join(self.test_dir, f"{rec_id}.tmp"),
                time_old + (i * 10),
                time_old + ((i + 1) * 10),
            )

        # Insert event-retention recordings (overlap with active review segment)
        time_event = now - 3600
        _insert_mock_review_segment(
            "review_001",
            time_event,
            time_event + 30,
            severity="alert",
        )
        rec_event_id = "300000.event_retention"
        _insert_mock_recording(
            rec_event_id,
            os.path.join(self.test_dir, f"{rec_event_id}.tmp"),
            time_event,
            time_event + 10,
        )

        storage.calculate_camera_bandwidth()
        storage.reduce_storage_consumption()

        # Event-retention recording should survive
        assert Recordings.get(Recordings.id == rec_event_id)

    def test_rollover_falls_through_to_event_retention(self):
        """When overwritable is insufficient, event-retention recordings are deleted."""
        config = FrigateConfig(**self._get_rollover_config())
        storage = StorageMaintainer(config, MagicMock())

        now = datetime.datetime.now().timestamp()
        time_old = now - 7200

        # Insert only 1 small overwritable recording (not enough to meet bandwidth)
        rec_ow_id = "400000.overwritable"
        _insert_mock_recording(
            rec_ow_id,
            os.path.join(self.test_dir, f"{rec_ow_id}.tmp"),
            time_old,
            time_old + 10,
            seg_size=1,
        )

        # Insert many event-retention recordings
        time_event = now - 3600
        _insert_mock_review_segment(
            "review_002",
            time_event,
            time_event + 600,
            severity="detection",
        )
        for i in range(60):
            rec_id = f"{400100 + i}.event_ret"
            _insert_mock_recording(
                rec_id,
                os.path.join(self.test_dir, f"{rec_id}.tmp"),
                time_event + (i * 10),
                time_event + ((i + 1) * 10),
            )

        storage.calculate_camera_bandwidth()
        storage.reduce_storage_consumption()

        # Overwritable should be deleted
        with self.assertRaises(DoesNotExist):
            Recordings.get(Recordings.id == rec_ow_id)

        # Some event-retention recordings should also be deleted
        remaining = Recordings.select().count()
        assert remaining < 61  # started with 61 total

    def test_rollover_protects_retained_events_last(self):
        """Protected recordings are only deleted as emergency last resort."""
        config = FrigateConfig(**self._get_rollover_config())
        storage = StorageMaintainer(config, MagicMock())

        now = datetime.datetime.now().timestamp()
        time_old = now - 7200

        # Insert protected recording (overlaps with retain_indefinitely event)
        _insert_mock_event(
            "evt_protected",
            time_old,
            time_old + 30,
            retain=True,
        )
        rec_protected_id = "500000.protected"
        _insert_mock_recording(
            rec_protected_id,
            os.path.join(self.test_dir, f"{rec_protected_id}.tmp"),
            time_old,
            time_old + 10,
        )

        # Insert enough overwritable recordings to satisfy bandwidth
        for i in range(60):
            rec_id = f"{500100 + i}.overwritable"
            _insert_mock_recording(
                rec_id,
                os.path.join(self.test_dir, f"{rec_id}.tmp"),
                time_old + 100 + (i * 10),
                time_old + 100 + ((i + 1) * 10),
            )

        storage.calculate_camera_bandwidth()
        storage.reduce_storage_consumption()

        # Protected recording should survive when overwritable is sufficient
        assert Recordings.get(Recordings.id == rec_protected_id)

    def test_rollover_keeps_protected_when_overwritable_suffices(self):
        """Both protected and event-retention survive when overwritable frees enough."""
        config = FrigateConfig(**self._get_rollover_config())
        storage = StorageMaintainer(config, MagicMock())

        now = datetime.datetime.now().timestamp()
        time_old = now - 7200

        # Protected recording
        _insert_mock_event(
            "evt_keep",
            time_old,
            time_old + 30,
            retain=True,
        )
        rec_prot_id = "600000.protected"
        _insert_mock_recording(
            rec_prot_id,
            os.path.join(self.test_dir, f"{rec_prot_id}.tmp"),
            time_old,
            time_old + 10,
        )

        # Event-retention recording
        time_event = now - 3600
        _insert_mock_review_segment(
            "review_003",
            time_event,
            time_event + 30,
            severity="alert",
        )
        rec_evt_id = "600100.event_ret"
        _insert_mock_recording(
            rec_evt_id,
            os.path.join(self.test_dir, f"{rec_evt_id}.tmp"),
            time_event,
            time_event + 10,
        )

        # Plenty of overwritable recordings
        for i in range(60):
            rec_id = f"{600200 + i}.overwritable"
            _insert_mock_recording(
                rec_id,
                os.path.join(self.test_dir, f"{rec_id}.tmp"),
                time_old + 100 + (i * 10),
                time_old + 100 + ((i + 1) * 10),
            )

        storage.calculate_camera_bandwidth()
        storage.reduce_storage_consumption()

        # Both protected and event-retention should survive
        assert Recordings.get(Recordings.id == rec_prot_id)
        assert Recordings.get(Recordings.id == rec_evt_id)


def _insert_mock_event(
    id: str,
    start: int,
    end: int,
    retain: bool,
    camera: str = "front_door",
    label: str = "Mock",
) -> Event:
    """Inserts a basic event model with a given id."""
    return Event.insert(
        id=id,
        label=label,
        camera=camera,
        start_time=start,
        end_time=end,
        top_score=100,
        false_positive=False,
        zones=list(),
        thumbnail="",
        region=[],
        box=[],
        area=0,
        has_clip=True,
        has_snapshot=True,
        retain_indefinitely=retain,
    ).execute()


def _insert_mock_recording(
    id: str,
    file: str,
    start: int,
    end: int,
    camera="front_door",
    seg_size=8,
    seg_dur=10,
) -> Event:
    """Inserts a basic recording model with a given id."""
    # we must open the file so storage maintainer will delete it
    with open(file, "w"):
        pass

    return Recordings.insert(
        id=id,
        camera=camera,
        path=file,
        start_time=start,
        end_time=end,
        duration=seg_dur,
        motion=True,
        objects=True,
        segment_size=seg_size,
    ).execute()


def _insert_mock_review_segment(
    id: str,
    start: float,
    end: float,
    severity: str = "alert",
    camera: str = "front_door",
) -> None:
    """Inserts a basic review segment model with a given id."""
    ReviewSegment.insert(
        id=id,
        camera=camera,
        start_time=start,
        end_time=end,
        severity=severity,
        thumb_path=f"/tmp/{id}.jpg",
        data={},
    ).execute()
