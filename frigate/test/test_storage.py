import datetime
import logging
import os
import tempfile
import unittest
from unittest.mock import MagicMock, patch

from peewee import DoesNotExist
from peewee_migrate import Router
from playhouse.sqlite_ext import SqliteExtDatabase
from playhouse.sqliteq import SqliteQueueDatabase

from frigate.config import FrigateConfig
from frigate.const import STREAM_TYPE_MAIN, STREAM_TYPE_SUB
from frigate.models import Event, Recordings
from frigate.storage import MAX_CALCULATED_BANDWIDTH, StorageMaintainer
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
        models = [Event, Recordings]
        self.db.bind(models)
        self.test_dir = tempfile.mkdtemp()

        self.minimal_config = {
            "mqtt": {"host": "mqtt"},
            "cameras": {
                "front_door": {
                    "ffmpeg": {
                        "inputs": [
                            {
                                "path": "rtsp://10.0.0.1:554/video",
                                "roles": ["detect", "record"],
                            }
                        ]
                    },
                    "detect": {
                        "height": 1080,
                        "width": 1920,
                        "fps": 5,
                    },
                    "record": {"enabled": True},
                }
            },
        }
        self.double_cam_config = {
            "mqtt": {"host": "mqtt"},
            "cameras": {
                "front_door": {
                    "ffmpeg": {
                        "inputs": [
                            {
                                "path": "rtsp://10.0.0.1:554/video",
                                "roles": ["detect", "record"],
                            }
                        ]
                    },
                    "detect": {
                        "height": 1080,
                        "width": 1920,
                        "fps": 5,
                    },
                    "record": {"enabled": True},
                },
                "back_door": {
                    "ffmpeg": {
                        "inputs": [
                            {
                                "path": "rtsp://10.0.0.2:554/video",
                                "roles": ["detect", "record"],
                            }
                        ]
                    },
                    "detect": {
                        "height": 1080,
                        "width": 1920,
                        "fps": 5,
                    },
                    "record": {"enabled": True},
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
            "front_door": {
                "bandwidth": 1440,
                "bandwidth_by_stream": {STREAM_TYPE_MAIN: 1440},
                "needs_refresh": True,
            },
            "back_door": {
                "bandwidth": 2880,
                "bandwidth_by_stream": {STREAM_TYPE_MAIN: 2880},
                "needs_refresh": True,
            },
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
            "front_door": {
                "bandwidth": 0,
                "bandwidth_by_stream": {},
                "needs_refresh": True,
            },
        }

    def test_segment_calculations_with_recent_zero_segments(self):
        """A run of recent zero-size segments must not zero out the bandwidth.

        Older nonzero segments still describe the camera's real write rate.
        """
        config = FrigateConfig(**self.minimal_config)
        storage = StorageMaintainer(config, MagicMock())

        time_keep = datetime.datetime.now().timestamp()
        for i in range(10):
            _insert_mock_recording(
                f"nonzero_{i}.frontdoor",
                os.path.join(self.test_dir, f"nonzero_{i}.tmp"),
                time_keep + i * 10,
                time_keep + i * 10 + 10,
                camera="front_door",
                seg_size=4,
                seg_dur=10,
            )
        for i in range(100):
            _insert_mock_recording(
                f"zero_{i}.frontdoor",
                os.path.join(self.test_dir, f"zero_{i}.tmp"),
                time_keep + 1000 + i * 10,
                time_keep + 1000 + i * 10 + 10,
                camera="front_door",
                seg_size=0,
                seg_dur=10,
            )

        storage.calculate_camera_bandwidth()
        assert storage.camera_storage_stats == {
            "front_door": {
                "bandwidth": 1440,
                "bandwidth_by_stream": {STREAM_TYPE_MAIN: 1440},
                "needs_refresh": True,
            },
        }

    def test_camera_usages_split_by_stream_type(self):
        """Usage and bandwidth are reported per stream type."""
        config = FrigateConfig(**self.minimal_config)
        storage = StorageMaintainer(config, MagicMock())

        time_keep = datetime.datetime.now().timestamp()
        _insert_mock_recording(
            "1234567.frontdoor",
            os.path.join(self.test_dir, "main.tmp"),
            time_keep,
            time_keep + 10,
            seg_size=20,
            seg_dur=10,
            stream_type=STREAM_TYPE_MAIN,
        )
        _insert_mock_recording(
            "1234568.frontdoor",
            os.path.join(self.test_dir, "sub.tmp"),
            time_keep,
            time_keep + 10,
            seg_size=2,
            seg_dur=10,
            stream_type=STREAM_TYPE_SUB,
        )

        storage.calculate_camera_bandwidth()
        usages = storage.calculate_camera_usages()

        assert usages["front_door"]["usage"] == 22
        assert usages["front_door"]["bandwidth"] == 7920
        assert usages["front_door"]["streams"] == {
            STREAM_TYPE_MAIN: {"usage": 20, "bandwidth": 7200},
            STREAM_TYPE_SUB: {"usage": 2, "bandwidth": 720},
        }

    def test_camera_usages_omits_streams_without_segments(self):
        """A camera with no sub segments reports no sub entry."""
        config = FrigateConfig(**self.minimal_config)
        storage = StorageMaintainer(config, MagicMock())

        time_keep = datetime.datetime.now().timestamp()
        _insert_mock_recording(
            "1234567.frontdoor",
            os.path.join(self.test_dir, "main.tmp"),
            time_keep,
            time_keep + 10,
            seg_size=20,
            seg_dur=10,
        )

        storage.calculate_camera_bandwidth()
        usages = storage.calculate_camera_usages()

        assert usages["front_door"]["usage"] == 20
        assert usages["front_door"]["streams"] == {
            STREAM_TYPE_MAIN: {"usage": 20, "bandwidth": 7200},
        }

    def test_camera_bandwidth_clamp_scales_stream_values(self):
        """Clamping the total keeps the per stream values summing to it."""
        config = FrigateConfig(**self.minimal_config)
        storage = StorageMaintainer(config, MagicMock())

        time_keep = datetime.datetime.now().timestamp()
        _insert_mock_recording(
            "1234567.frontdoor",
            os.path.join(self.test_dir, "main.tmp"),
            time_keep,
            time_keep + 10,
            seg_size=40,
            seg_dur=10,
            stream_type=STREAM_TYPE_MAIN,
        )
        _insert_mock_recording(
            "1234568.frontdoor",
            os.path.join(self.test_dir, "sub.tmp"),
            time_keep,
            time_keep + 10,
            seg_size=4,
            seg_dur=10,
            stream_type=STREAM_TYPE_SUB,
        )

        storage.calculate_camera_bandwidth()
        stats = storage.camera_storage_stats["front_door"]

        assert stats["bandwidth"] == MAX_CALCULATED_BANDWIDTH
        assert (
            round(sum(stats["bandwidth_by_stream"].values()), 2)
            == MAX_CALCULATED_BANDWIDTH
        )

    def test_stream_bandwidth_is_none_without_a_cached_sample(self):
        """A stream that appears after the bandwidth cache freezes has no estimate.

        Sub stream recording can be toggled on at runtime, so the cache can hold
        a main-only sample while sub segments are already landing on disk.
        Reporting 0 there would claim the sub stream costs nothing.
        """
        config = FrigateConfig(**self.minimal_config)
        storage = StorageMaintainer(config, MagicMock())

        time_keep = datetime.datetime.now().timestamp()
        for i in range(60):
            _insert_mock_recording(
                f"main_{i}.frontdoor",
                os.path.join(self.test_dir, f"main_{i}.tmp"),
                time_keep + i * 10,
                time_keep + i * 10 + 10,
                seg_size=20,
                seg_dur=10,
            )

        # 50 or more segments flips needs_refresh off, freezing the cache
        storage.calculate_camera_bandwidth()
        assert storage.camera_storage_stats["front_door"]["needs_refresh"] is False

        for i in range(60):
            _insert_mock_recording(
                f"sub_{i}.frontdoor",
                os.path.join(self.test_dir, f"sub_{i}.tmp"),
                time_keep + 5000 + i * 10,
                time_keep + 5000 + i * 10 + 10,
                seg_size=2,
                seg_dur=10,
                stream_type=STREAM_TYPE_SUB,
            )

        storage.calculate_camera_bandwidth()
        streams = storage.calculate_camera_usages()["front_door"]["streams"]

        assert streams[STREAM_TYPE_SUB]["usage"] == 120
        assert streams[STREAM_TYPE_SUB]["bandwidth"] is None
        assert streams[STREAM_TYPE_MAIN]["bandwidth"] == 7200

    def test_expected_bandwidth_follows_recording_config(self):
        """Only the streams a camera currently records count toward cleanup."""
        config = FrigateConfig(**self.minimal_config)
        storage = StorageMaintainer(config, MagicMock())
        record = config.cameras["front_door"].record

        time_keep = datetime.datetime.now().timestamp()
        _insert_mock_recording(
            "1234567.frontdoor",
            os.path.join(self.test_dir, "main.tmp"),
            time_keep,
            time_keep + 10,
            seg_size=20,
            seg_dur=10,
        )
        _insert_mock_recording(
            "1234568.frontdoor",
            os.path.join(self.test_dir, "sub.tmp"),
            time_keep,
            time_keep + 10,
            seg_size=2,
            seg_dur=10,
            stream_type=STREAM_TYPE_SUB,
        )

        storage.calculate_camera_bandwidth()

        # sub segments are still on disk but the camera no longer records them
        assert storage.expected_hourly_bandwidth() == 7200

        record.sub.enabled = True
        assert storage.expected_hourly_bandwidth() == 7920

        record.enabled = False
        assert storage.expected_hourly_bandwidth() == 0

    def test_stream_stays_dirty_until_it_has_its_own_samples(self):
        """A stream enabled before its first segment keeps the camera dirty.

        The record config update can be handled on a tick before ffmpeg has
        written anything, so a camera-wide segment count would settle the camera
        on the strength of the other stream's history and never measure the new
        stream at all.
        """
        config = FrigateConfig(**self.minimal_config)
        storage = StorageMaintainer(config, MagicMock())
        record = config.cameras["front_door"].record
        stats = storage.camera_storage_stats

        time_keep = datetime.datetime.now().timestamp()
        for i in range(60):
            _insert_mock_recording(
                f"main_{i}.frontdoor",
                os.path.join(self.test_dir, f"main_{i}.tmp"),
                time_keep + i * 10,
                time_keep + i * 10 + 10,
                seg_size=20,
                seg_dur=10,
            )

        storage.calculate_camera_bandwidth()
        assert stats["front_door"]["needs_refresh"] is False

        record.sub.enabled = True
        stats["front_door"]["needs_refresh"] = True
        storage.calculate_camera_bandwidth()

        assert stats["front_door"]["needs_refresh"] is True
        assert storage.expected_hourly_bandwidth() == 7200

        for i in range(60):
            _insert_mock_recording(
                f"sub_{i}.frontdoor",
                os.path.join(self.test_dir, f"sub_{i}.tmp"),
                time_keep + 5000 + i * 10,
                time_keep + 5000 + i * 10 + 10,
                seg_size=2,
                seg_dur=10,
                stream_type=STREAM_TYPE_SUB,
            )

        storage.calculate_camera_bandwidth()

        assert stats["front_door"]["needs_refresh"] is False
        assert storage.expected_hourly_bandwidth() == 7920

    def test_camera_usages_with_no_recordings(self):
        """A camera with no segments reports zero usage and no streams."""
        config = FrigateConfig(**self.minimal_config)
        storage = StorageMaintainer(config, MagicMock())

        storage.calculate_camera_bandwidth()
        usages = storage.calculate_camera_usages()

        assert usages["front_door"]["usage"] == 0
        assert usages["front_door"]["streams"] == {}

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

    def test_unmet_retention_raises_notice(self):
        registry = MagicMock()
        config = FrigateConfig(**self.minimal_config)
        storage = StorageMaintainer(config, MagicMock(), registry)
        storage.camera_storage_stats = {
            "front_door": {"needs_refresh": False, "usage": 10, "bandwidth": 10}
        }

        with patch.object(storage, "expected_hourly_bandwidth", return_value=100.0):
            storage.reduce_storage_consumption()

        registry.raise_notice.assert_called_once()
        kind = registry.raise_notice.call_args.args[0]
        params = registry.raise_notice.call_args.kwargs["params"]
        self.assertEqual(kind, "retention_unmet")
        self.assertEqual(params["needed_mb"], 100.0)
        self.assertEqual(params["cleared_mb"], 0.0)

    def test_clean_run_resolves_notice(self):
        registry = MagicMock()
        config = FrigateConfig(**self.minimal_config)
        storage = StorageMaintainer(config, MagicMock(), registry)

        with patch.object(storage, "check_storage_needs_cleanup", return_value=False):
            storage._maintain_once()

        registry.resolve.assert_called_once_with("retention_unmet")


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
    stream_type=STREAM_TYPE_MAIN,
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
        stream_type=stream_type,
    ).execute()
