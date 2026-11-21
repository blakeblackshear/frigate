"""Tests for OSError resilience and batched DB deletes in recording cleanup."""

import datetime
import errno
import tempfile
import unittest
from pathlib import Path
from unittest.mock import MagicMock, patch

from peewee import SqliteDatabase

from frigate.config import FrigateConfig
from frigate.models import Previews, Recordings, ReviewSegment, UserReviewStatus
from frigate.record.cleanup import RecordingCleanup
from frigate.util.media import remove_empty_directories


class TestRecordingCleanupResilience(unittest.TestCase):
    def setUp(self):
        self.db = SqliteDatabase(":memory:")
        models = [Previews, Recordings, ReviewSegment, UserReviewStatus]
        self.db.bind(models)
        self.db.create_tables(models)

    def tearDown(self):
        self.db.close()

    def _build_cleanup(self, continuous_days: int = 7) -> RecordingCleanup:
        config = FrigateConfig(
            **{
                "mqtt": {"enabled": False},
                "record": {"continuous": {"days": continuous_days}},
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
                        "record": {
                            "enabled": True,
                            "continuous": {"days": continuous_days},
                        },
                    }
                },
            }
        )
        return RecordingCleanup(config, MagicMock())

    def _insert_recording(
        self,
        rec_id: str,
        path: Path,
        age_days: float,
        camera: str = "front_door",
        offset_s: float = 0,
    ) -> None:
        end_time = (
            datetime.datetime.now() - datetime.timedelta(days=age_days)
        ).timestamp() + offset_s
        path.parent.mkdir(parents=True, exist_ok=True)
        path.touch()
        Recordings.create(
            id=rec_id,
            camera=camera,
            path=str(path),
            start_time=end_time - 10,
            end_time=end_time,
            duration=10,
            motion=0,
            objects=0,
            dBFS=0,
            segment_size=0,
            stream_type="main",
        )

    def _insert_review(
        self, rev_id: str, thumb_path: str, age_days: float = 10
    ) -> None:
        end_time = (
            datetime.datetime.now() - datetime.timedelta(days=age_days)
        ).timestamp()
        ReviewSegment.create(
            id=rev_id,
            camera="front_door",
            start_time=end_time - 10,
            end_time=end_time,
            severity="alert",
            thumb_path=thumb_path,
            data={},
        )
        UserReviewStatus.create(
            user_id="admin",
            review_segment=rev_id,
            has_been_reviewed=True,
        )

    def test_expire_recordings_continues_after_unlink_oserror(self):
        cleanup = self._build_cleanup()
        with tempfile.TemporaryDirectory() as tmpdir:
            root = Path(tmpdir)
            p1 = root / "d1" / "r1.mp4"
            p2 = root / "d2" / "r2.mp4"
            p3 = root / "d3" / "r3.mp4"
            self._insert_recording("r1", p1, age_days=10, offset_s=10)
            self._insert_recording("r2", p2, age_days=10, offset_s=20)
            self._insert_recording("r3", p3, age_days=10, offset_s=30)

            orig_unlink = Path.unlink

            def flaky_unlink(path_self: Path, missing_ok: bool = False) -> None:
                if path_self == p2:
                    raise TimeoutError(
                        errno.ETIMEDOUT, "Connection timed out", str(path_self)
                    )
                orig_unlink(path_self, missing_ok=missing_ok)

            with (
                patch.object(Path, "unlink", autospec=True, side_effect=flaky_unlink),
                self.assertLogs("frigate.record.cleanup", level="WARNING") as cm,
            ):
                maybe_empty_dirs = cleanup.expire_recordings()

            self.assertIsNone(Recordings.get_or_none(Recordings.id == "r1"))
            self.assertIsNotNone(Recordings.get_or_none(Recordings.id == "r2"))
            self.assertIsNone(Recordings.get_or_none(Recordings.id == "r3"))
            self.assertFalse(p1.exists())
            self.assertTrue(p2.exists())
            self.assertFalse(p3.exists())
            self.assertIn(p1.parent, maybe_empty_dirs)
            self.assertNotIn(p2.parent, maybe_empty_dirs)
            self.assertIn(p3.parent, maybe_empty_dirs)
            self.assertTrue(any("r2.mp4" in line for line in cm.output))

    def test_expire_recordings_flushes_db_deletes_in_batches(self):
        cleanup = self._build_cleanup()
        with tempfile.TemporaryDirectory() as tmpdir:
            root = Path(tmpdir)
            paths = [root / f"r{i}.mp4" for i in range(1, 6)]
            for idx, p in enumerate(paths, start=1):
                self._insert_recording(f"r{idx}", p, age_days=10, offset_s=idx * 10)

            counts_at_unlink: dict[str, int] = {}
            orig_unlink = Path.unlink

            def batch_observing_unlink(
                path_self: Path, missing_ok: bool = False
            ) -> None:
                counts_at_unlink[path_self.name] = Recordings.select().count()
                if path_self == paths[-1]:
                    raise TimeoutError(
                        errno.ETIMEDOUT, "Connection timed out", str(path_self)
                    )
                orig_unlink(path_self, missing_ok=missing_ok)

            with (
                patch("frigate.record.cleanup.DB_DELETE_BATCH_SIZE", 2),
                patch.object(
                    Path, "unlink", autospec=True, side_effect=batch_observing_unlink
                ),
                self.assertLogs("frigate.record.cleanup", level="WARNING"),
            ):
                cleanup.expire_recordings()

            # r1..r4 should already be committed in batches of 2 before r5 fails
            self.assertEqual(counts_at_unlink["r5.mp4"], 1)
            for idx in range(1, 5):
                self.assertIsNone(Recordings.get_or_none(Recordings.id == f"r{idx}"))
            self.assertIsNotNone(Recordings.get_or_none(Recordings.id == "r5"))

    def test_expire_review_segments_skips_db_delete_on_thumb_oserror(self):
        cleanup = self._build_cleanup()
        with tempfile.TemporaryDirectory() as tmpdir:
            root = Path(tmpdir)
            t_ok = root / "rev_ok" / "thumb_ok.webp"
            t_fail = root / "rev_fail" / "thumb_fail.webp"
            t_ok.parent.mkdir(parents=True, exist_ok=True)
            t_fail.parent.mkdir(parents=True, exist_ok=True)
            t_ok.touch()
            t_fail.touch()

            self._insert_review("rev_ok", str(t_ok))
            self._insert_review("rev_fail", str(t_fail))
            self._insert_review("rev_empty", "")

            orig_unlink = Path.unlink

            def flaky_unlink(path_self: Path, missing_ok: bool = False) -> None:
                if path_self == t_fail:
                    raise PermissionError(
                        errno.EACCES, "Permission denied", str(path_self)
                    )
                orig_unlink(path_self, missing_ok=missing_ok)

            with (
                patch.object(Path, "unlink", autospec=True, side_effect=flaky_unlink),
                self.assertLogs("frigate.record.cleanup", level="WARNING"),
            ):
                maybe_empty_dirs = cleanup.expire_review_segments(
                    cleanup.config.cameras["front_door"], datetime.datetime.now()
                )

            self.assertIsNone(ReviewSegment.get_or_none(ReviewSegment.id == "rev_ok"))
            self.assertIsNone(
                UserReviewStatus.get_or_none(
                    UserReviewStatus.review_segment == "rev_ok"
                )
            )
            self.assertIsNone(
                ReviewSegment.get_or_none(ReviewSegment.id == "rev_empty")
            )
            self.assertIsNone(
                UserReviewStatus.get_or_none(
                    UserReviewStatus.review_segment == "rev_empty"
                )
            )
            self.assertIsNotNone(
                ReviewSegment.get_or_none(ReviewSegment.id == "rev_fail")
            )
            self.assertIsNotNone(
                UserReviewStatus.get_or_none(
                    UserReviewStatus.review_segment == "rev_fail"
                )
            )
            self.assertIn(t_ok.parent, maybe_empty_dirs)
            self.assertNotIn(t_fail.parent, maybe_empty_dirs)

    def test_expire_camera_previews_skips_db_delete_on_oserror(self):
        cleanup = self._build_cleanup()
        with tempfile.TemporaryDirectory() as tmpdir:
            root = Path(tmpdir)
            p_fail = root / "p_fail.mp4"
            p_ok = root / "p_ok.mp4"
            p_fail.touch()
            p_ok.touch()
            end_time = (
                datetime.datetime.now() - datetime.timedelta(days=10)
            ).timestamp()
            Previews.create(
                id="p_fail",
                camera="front_door",
                path=str(p_fail),
                start_time=end_time - 10,
                end_time=end_time,
                duration=10,
            )
            Previews.create(
                id="p_ok",
                camera="front_door",
                path=str(p_ok),
                start_time=end_time - 20,
                end_time=end_time - 10,
                duration=10,
            )

            orig_unlink = Path.unlink

            def flaky_unlink(path_self: Path, missing_ok: bool = False) -> None:
                if path_self == p_fail:
                    raise OSError(errno.EIO, "I/O error", str(path_self))
                orig_unlink(path_self, missing_ok=missing_ok)

            with (
                patch.object(Path, "unlink", autospec=True, side_effect=flaky_unlink),
                self.assertLogs("frigate.record.cleanup", level="WARNING"),
            ):
                cleanup.expire_recordings()

            self.assertIsNotNone(Previews.get_or_none(Previews.id == "p_fail"))
            self.assertIsNone(Previews.get_or_none(Previews.id == "p_ok"))
            self.assertTrue(p_fail.exists())
            self.assertFalse(p_ok.exists())

    def test_deleted_camera_recordings_skip_failed_unlink(self):
        cleanup = self._build_cleanup()
        with tempfile.TemporaryDirectory() as tmpdir:
            root = Path(tmpdir)
            gone_fail = root / "gone_fail.mp4"
            gone_ok = root / "gone_ok.mp4"
            self._insert_recording(
                "gone_fail", gone_fail, age_days=10, camera="removed_cam", offset_s=10
            )
            self._insert_recording(
                "gone_ok", gone_ok, age_days=10, camera="removed_cam", offset_s=20
            )

            orig_unlink = Path.unlink

            def flaky_unlink(path_self: Path, missing_ok: bool = False) -> None:
                if path_self == gone_fail:
                    raise PermissionError(
                        errno.EACCES, "Permission denied", str(path_self)
                    )
                orig_unlink(path_self, missing_ok=missing_ok)

            with (
                patch.object(Path, "unlink", autospec=True, side_effect=flaky_unlink),
                self.assertLogs("frigate.record.cleanup", level="WARNING"),
            ):
                cleanup.expire_recordings()

            self.assertIsNotNone(Recordings.get_or_none(Recordings.id == "gone_fail"))
            self.assertIsNone(Recordings.get_or_none(Recordings.id == "gone_ok"))
            self.assertTrue(gone_fail.exists())
            self.assertFalse(gone_ok.exists())

    def test_remove_empty_directories_logs_and_continues_on_non_enotempty_oserror(
        self,
    ):
        with tempfile.TemporaryDirectory() as tmpdir:
            root = Path(tmpdir) / "recordings"
            dir_err = root / "cam1"
            dir_nonempty = root / "cam2"
            dir_ok = root / "cam3"
            dir_err.mkdir(parents=True)
            dir_nonempty.mkdir(parents=True)
            dir_ok.mkdir(parents=True)
            (dir_nonempty / "keep.mp4").touch()

            orig_rmdir = Path.rmdir

            def flaky_rmdir(path_self: Path) -> None:
                if path_self == dir_err:
                    raise TimeoutError(
                        errno.ETIMEDOUT, "Connection timed out", str(path_self)
                    )
                orig_rmdir(path_self)

            with (
                patch.object(Path, "rmdir", autospec=True, side_effect=flaky_rmdir),
                self.assertLogs("frigate.util.media", level="WARNING") as cm,
            ):
                remove_empty_directories(root, [dir_err, dir_nonempty, dir_ok])

            self.assertFalse(dir_ok.exists())
            self.assertTrue(dir_err.exists())
            self.assertTrue(dir_nonempty.exists())
            self.assertEqual(len(cm.output), 1)
            self.assertIn("cam1", cm.output[0])


if __name__ == "__main__":
    unittest.main()
