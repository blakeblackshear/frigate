import datetime
import os
import sys
import tempfile
import unittest
from pathlib import Path
from unittest.mock import AsyncMock, MagicMock, patch

from peewee import SqliteDatabase

# Mock complex imports before importing maintainer, saving originals so we can
# restore them after import and avoid polluting sys.modules for other tests.
_MOCKED_MODULES = [
    "frigate.comms.inter_process",
    "frigate.comms.detections_updater",
    "frigate.comms.recordings_updater",
    "frigate.config.camera.updater",
]
_originals = {name: sys.modules.get(name) for name in _MOCKED_MODULES}
for name in _MOCKED_MODULES:
    sys.modules[name] = MagicMock()

# Now import the class under test
from frigate.config import FrigateConfig, RetainModeEnum  # noqa: E402
from frigate.models import ReviewSegment  # noqa: E402
from frigate.record.maintainer import RecordingMaintainer, SegmentInfo  # noqa: E402

# Restore original modules (or remove mock if there was no original)
for name, orig in _originals.items():
    if orig is None:
        sys.modules.pop(name, None)
    else:
        sys.modules[name] = orig


class TestMaintainer(unittest.IsolatedAsyncioTestCase):
    async def test_move_files_survives_bad_filename(self):
        config = MagicMock(spec=FrigateConfig)
        config.cameras = {}
        stop_event = MagicMock()

        maintainer = RecordingMaintainer(config, stop_event)

        # We need to mock end_time_cache to avoid key errors if logic proceeds
        maintainer.end_time_cache = {}

        # Mock filesystem
        # One bad file, one good file
        files = ["bad_filename.mp4", "camera@20210101000000+0000.mp4"]

        with patch("os.listdir", return_value=files):
            with patch("os.path.isfile", return_value=True):
                with patch(
                    "frigate.record.maintainer.psutil.process_iter", return_value=[]
                ):
                    with patch("frigate.record.maintainer.logger.warning") as warn:
                        # Mock validate_and_move_segment to avoid further logic.
                        # The requestor is real when another test imported the
                        # maintainer first, and it would block on a reply.
                        maintainer.validate_and_move_segment = AsyncMock()
                        maintainer.requestor = MagicMock()

                        try:
                            await maintainer.move_files()
                        except ValueError as e:
                            if "not enough values to unpack" in str(e):
                                self.fail("move_files() crashed on bad filename!")
                            raise e
                        except Exception:
                            # Ignore other errors (like DB connection) as we only care about the unpack crash
                            pass

                        # The bad filename is encountered in multiple loops, but should only warn once.
                        matching = [
                            c
                            for c in warn.call_args_list
                            if c.args
                            and isinstance(c.args[0], str)
                            and "Skipping unexpected files in cache" in c.args[0]
                        ]
                        self.assertEqual(
                            1,
                            len(matching),
                            f"Expected a single warning for unexpected files, got {len(matching)}",
                        )

    async def test_ended_review_stays_eligible_through_post_capture(self):
        config = MagicMock(spec=FrigateConfig)
        camera_config = MagicMock()
        camera_config.record.sub.enabled = False
        camera_config.record.event_post_capture = 60
        config.cameras = {"test_cam": camera_config}

        maintainer = RecordingMaintainer(config, MagicMock())
        maintainer.requestor = MagicMock()
        maintainer.recordings_publisher = MagicMock()
        maintainer.validate_and_move_segment = AsyncMock(return_value=None)

        db = SqliteDatabase(":memory:")
        with db.bind_ctx([ReviewSegment]):
            db.create_tables([ReviewSegment])

            # oldest cached segment starts 40s after the review ended
            segment_start = datetime.datetime(
                2026, 10, 19, 13, 1, 40, tzinfo=datetime.UTC
            )
            ReviewSegment.create(
                id="review",
                camera="test_cam",
                start_time=segment_start.timestamp() - 50,
                end_time=segment_start.timestamp() - 40,
                severity="alert",
                thumb_path="",
                data={},
            )

            with tempfile.TemporaryDirectory() as cache_dir:
                name = segment_start.strftime("%Y%m%d%H%M%S%z")
                Path(cache_dir, f"test_cam@{name}.mp4").touch()

                with (
                    patch("frigate.record.maintainer.CACHE_DIR", cache_dir),
                    patch(
                        "frigate.record.maintainer.psutil.process_iter", return_value=[]
                    ),
                ):
                    await maintainer.move_files()

            reviews = maintainer.validate_and_move_segment.call_args.args[1]
            self.assertEqual(
                [segment_start.timestamp() - 40], [r.end_time for r in reviews]
            )

    async def test_drops_quiet_segment_when_only_motion_retention(self):
        # Regression: when motion retention is enabled but a segment has no
        # motion and no review overlaps it, the segment must still be dropped.
        # Otherwise it sits in cache forever, accumulates, and triggers the
        # "Unable to keep up with recording segments in cache" warning every
        # ~10s as the overflow trim in move_files discards the oldest one.
        config = MagicMock(spec=FrigateConfig)

        camera_config = MagicMock()
        camera_config.record.enabled = True
        camera_config.record.continuous.days = 0
        camera_config.record.motion.days = 1
        camera_config.record.event_pre_capture = 5
        config.cameras = {"test_cam": camera_config}

        stop_event = MagicMock()
        maintainer = RecordingMaintainer(config, stop_event)

        now = datetime.datetime.now(datetime.UTC)
        start_time = now - datetime.timedelta(seconds=20)
        end_time = now - datetime.timedelta(seconds=10)
        cache_path = "/tmp/cache/test_cam@20260417150000+0000.mp4"

        maintainer.end_time_cache = {
            cache_path: (end_time, 10.0, None, None, None, None, None, None)
        }
        # Single processed frame well past end_time with no motion/objects.
        maintainer.object_recordings_info["test_cam"] = [(now.timestamp(), [], [], [])]
        maintainer.audio_recordings_info["test_cam"] = []

        maintainer.drop_segment = MagicMock()
        maintainer.recordings_publisher = MagicMock()

        result = await maintainer.validate_and_move_segment(
            "test_cam",
            reviews=[],
            recording={
                "start_time": start_time,
                "cache_path": cache_path,
                "stream_type": "main",
            },
        )

        self.assertIsNone(result)
        maintainer.drop_segment.assert_called_once_with(cache_path)

    async def test_quiet_segment_kept_by_later_overlapping_alert(self):
        config = MagicMock(spec=FrigateConfig)

        camera_config = MagicMock()
        camera_config.record.enabled = True
        camera_config.record.continuous.days = 0
        camera_config.record.motion.days = 0
        camera_config.record.alerts.retain.mode = RetainModeEnum.all
        camera_config.record.detections.retain.mode = RetainModeEnum.motion
        camera_config.record.event_pre_capture = 60
        camera_config.record.get_review_pre_capture.return_value = 60
        camera_config.record.get_review_post_capture.return_value = 60
        config.cameras = {"test_cam": camera_config}

        maintainer = RecordingMaintainer(config, MagicMock())

        now = datetime.datetime.now(datetime.UTC)
        start_time = now - datetime.timedelta(seconds=20)
        end_time = now - datetime.timedelta(seconds=10)
        cache_path = "/tmp/cache/test_cam@20260417150000+0000.mp4"

        maintainer.end_time_cache = {
            cache_path: (end_time, 10.0, False, None, None, None, [], None)
        }
        maintainer.object_recordings_info["test_cam"] = [(now.timestamp(), [], [], [])]
        maintainer.audio_recordings_info["test_cam"] = []

        maintainer.drop_segment = MagicMock()
        maintainer.move_segment = AsyncMock(return_value=None)
        maintainer.recordings_publisher = MagicMock()

        # the detection's post capture and the alert's window both cover the segment
        detection = MagicMock()
        detection.severity = "detection"
        detection.start_time = start_time.timestamp() - 50
        detection.end_time = start_time.timestamp() - 40
        alert = MagicMock()
        alert.severity = "alert"
        alert.start_time = start_time.timestamp() - 10
        alert.end_time = start_time.timestamp()

        await maintainer.validate_and_move_segment(
            "test_cam",
            reviews=[detection, alert],
            recording={
                "start_time": start_time,
                "cache_path": cache_path,
                "stream_type": "main",
            },
        )

        maintainer.move_segment.assert_awaited_once()
        maintainer.drop_segment.assert_not_called()

    async def test_quiet_segment_kept_by_later_alert_with_longer_pre_capture(self):
        config = MagicMock(spec=FrigateConfig)

        camera_config = MagicMock()
        camera_config.record.enabled = True
        camera_config.record.continuous.days = 0
        camera_config.record.motion.days = 0
        camera_config.record.alerts.retain.mode = RetainModeEnum.all
        camera_config.record.detections.retain.mode = RetainModeEnum.all
        camera_config.record.event_pre_capture = 30
        camera_config.record.get_review_pre_capture.side_effect = lambda s: (
            30 if s == "alert" else 5
        )
        camera_config.record.get_review_post_capture.return_value = 5
        config.cameras = {"test_cam": camera_config}

        maintainer = RecordingMaintainer(config, MagicMock())

        now = datetime.datetime.now(datetime.UTC)
        start_time = now - datetime.timedelta(seconds=20)
        end_time = now - datetime.timedelta(seconds=10)
        cache_path = "/tmp/cache/test_cam@20260417150000+0000.mp4"

        maintainer.end_time_cache = {
            cache_path: (end_time, 10.0, False, None, None, None, [], None)
        }
        maintainer.object_recordings_info["test_cam"] = [(now.timestamp(), [], [], [])]
        maintainer.audio_recordings_info["test_cam"] = []

        maintainer.drop_segment = MagicMock()
        maintainer.move_segment = AsyncMock(return_value=None)
        maintainer.recordings_publisher = MagicMock()

        # the detection's pre capture starts after the segment, the alert's reaches it
        detection = MagicMock()
        detection.severity = "detection"
        detection.start_time = end_time.timestamp() + 10
        detection.end_time = end_time.timestamp() + 12
        alert = MagicMock()
        alert.severity = "alert"
        alert.start_time = end_time.timestamp() + 20
        alert.end_time = end_time.timestamp() + 25

        await maintainer.validate_and_move_segment(
            "test_cam",
            reviews=[detection, alert],
            recording={
                "start_time": start_time,
                "cache_path": cache_path,
                "stream_type": "main",
            },
        )

        maintainer.move_segment.assert_awaited_once()
        maintainer.drop_segment.assert_not_called()

    async def test_defers_review_overlap_segment_until_metadata_catches_up(self):
        # Regression: a segment overlapping an active_objects review must not
        # be dropped while detection metadata lags behind the segment end,
        # the missing frames may hold the active objects (or continuous
        # retention would keep it anyway).
        config = MagicMock(spec=FrigateConfig)

        camera_config = MagicMock()
        camera_config.record.enabled = True
        camera_config.record.continuous.days = 7
        camera_config.record.motion.days = 0
        camera_config.record.alerts.retain.mode = RetainModeEnum.active_objects
        camera_config.record.event_pre_capture = 5
        camera_config.record.get_review_pre_capture.return_value = 5
        camera_config.record.get_review_post_capture.return_value = 5
        config.cameras = {"test_cam": camera_config}

        stop_event = MagicMock()
        maintainer = RecordingMaintainer(config, stop_event)

        now = datetime.datetime.now(datetime.UTC)
        start_time = now - datetime.timedelta(seconds=20)
        end_time = now - datetime.timedelta(seconds=10)
        cache_path = "/tmp/cache/test_cam@20260417150000+0000.mp4"

        maintainer.end_time_cache = {
            cache_path: (end_time, 10.0, False, None, None, None, [], None)
        }
        # Metadata has only reached partway into the segment.
        maintainer.object_recordings_info["test_cam"] = [
            (end_time.timestamp() - 8, [], [], [])
        ]
        maintainer.audio_recordings_info["test_cam"] = []

        maintainer.drop_segment = MagicMock()
        maintainer.move_segment = AsyncMock(return_value=None)
        maintainer.recordings_publisher = MagicMock()

        review = MagicMock()
        review.severity = "alert"
        review.start_time = start_time.timestamp() - 30
        review.end_time = None

        result = await maintainer.validate_and_move_segment(
            "test_cam",
            reviews=[review],
            recording={
                "start_time": start_time,
                "cache_path": cache_path,
                "stream_type": "main",
            },
        )

        self.assertIsNone(result)
        maintainer.drop_segment.assert_not_called()
        maintainer.move_segment.assert_not_awaited()

        # Once metadata passes the segment end, continuous retention keeps it.
        maintainer.object_recordings_info["test_cam"].append(
            (now.timestamp(), [], [], [])
        )

        await maintainer.validate_and_move_segment(
            "test_cam",
            reviews=[review],
            recording={
                "start_time": start_time,
                "cache_path": cache_path,
                "stream_type": "main",
            },
        )

        maintainer.drop_segment.assert_not_called()
        maintainer.move_segment.assert_awaited_once()

    async def test_expire_stale_recordings_info_drops_only_absent_cameras(self):
        config = MagicMock(spec=FrigateConfig)
        config.cameras = {}
        stop_event = MagicMock()
        maintainer = RecordingMaintainer(config, stop_event)

        now = datetime.datetime.now().timestamp()
        ancient = now - 86400
        recent = now - 1

        maintainer.object_recordings_info["present_cam"] = [(ancient, [], [], [])]
        maintainer.audio_recordings_info["present_cam"] = [(ancient, 0, [])]

        maintainer.object_recordings_info["absent_cam"] = [
            (ancient, [], [], []),
            (recent, [], [], []),
        ]
        maintainer.audio_recordings_info["absent_cam"] = [
            (ancient, 0, []),
            (recent, 0, []),
        ]

        # keyed by (camera, stream_type), matching what move_files passes
        grouped_recordings = {("present_cam", "main"): [{"start_time": ancient}]}

        maintainer._expire_stale_recordings_info(grouped_recordings)

        self.assertEqual(
            maintainer.object_recordings_info["present_cam"], [(ancient, [], [], [])]
        )
        self.assertEqual(
            maintainer.audio_recordings_info["present_cam"], [(ancient, 0, [])]
        )

        self.assertEqual(
            maintainer.object_recordings_info["absent_cam"], [(recent, [], [], [])]
        )
        self.assertEqual(
            maintainer.audio_recordings_info["absent_cam"], [(recent, 0, [])]
        )


class TestMoveSegment(unittest.IsolatedAsyncioTestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.record_dir = os.path.join(self.tmp.name, "recordings")
        self.cache_path = os.path.join(
            self.tmp.name, "test_cam@20260417150000+0000.mp4"
        )
        self.dest_path = os.path.join(
            self.record_dir, "2026-04-17", "15", "test_cam", "00.00.mp4"
        )
        Path(self.cache_path).write_bytes(b"segment")

        config = MagicMock(spec=FrigateConfig)
        config.cameras = {}
        config.ffmpeg = MagicMock(ffmpeg_path="ffmpeg")
        self.maintainer = RecordingMaintainer(config, MagicMock())
        self.maintainer.end_time_cache = {self.cache_path: MagicMock()}

    def tearDown(self):
        self.tmp.cleanup()

    async def _move(self, returncode: int = 0) -> tuple[dict | None, AsyncMock]:
        def fake_exec(*args, **kwargs):
            # ffmpeg leaves its output behind even when it fails partway
            Path(args[-1]).write_bytes(b"remuxed")
            process = MagicMock()
            process.wait = AsyncMock()
            process.returncode = returncode
            process.stderr = None
            return process

        start = datetime.datetime(2026, 4, 17, 15, 0, 0, tzinfo=datetime.UTC)
        exec_mock = AsyncMock(side_effect=fake_exec)

        with (
            patch("frigate.record.maintainer.RECORD_DIR", self.record_dir),
            patch("frigate.record.maintainer.chown_to_runtime"),
            patch(
                "frigate.record.maintainer.asyncio.create_subprocess_exec", exec_mock
            ),
        ):
            result = await self.maintainer.move_segment(
                "test_cam",
                "main",
                start,
                start + datetime.timedelta(seconds=10),
                10.0,
                self.cache_path,
                SegmentInfo(0, 0, 0, 0),
            )

        return result, exec_mock

    async def test_successful_move_clears_cache_entry(self):
        result, _ = await self._move()

        self.assertIsNotNone(result)
        self.assertTrue(os.path.exists(self.dest_path))
        self.assertFalse(os.path.exists(self.cache_path))
        self.assertNotIn(self.cache_path, self.maintainer.end_time_cache)

    async def test_existing_destination_drops_cache_file(self):
        os.makedirs(os.path.dirname(self.dest_path))
        Path(self.dest_path).write_bytes(b"existing")

        result, exec_mock = await self._move()

        self.assertIsNone(result)
        exec_mock.assert_not_awaited()
        self.assertFalse(os.path.exists(self.cache_path))
        self.assertNotIn(self.cache_path, self.maintainer.end_time_cache)

    async def test_failed_move_removes_partial_output_for_retry(self):
        result, _ = await self._move(returncode=1)

        self.assertIsNone(result)
        self.assertFalse(os.path.exists(self.dest_path))
        self.assertTrue(os.path.exists(self.cache_path))
        self.assertIn(self.cache_path, self.maintainer.end_time_cache)


if __name__ == "__main__":
    unittest.main()
