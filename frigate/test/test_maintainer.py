import datetime
import sys
import unittest
from unittest.mock import MagicMock, patch

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
from frigate.config import FrigateConfig  # noqa: E402
from frigate.record.maintainer import RecordingMaintainer  # noqa: E402

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
                        # Mock validate_and_move_segment to avoid further logic
                        maintainer.validate_and_move_segment = MagicMock()

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

        now = datetime.datetime.now(datetime.timezone.utc)
        start_time = now - datetime.timedelta(seconds=20)
        end_time = now - datetime.timedelta(seconds=10)
        cache_path = "/tmp/cache/test_cam@20260417150000+0000.mp4"

        maintainer.end_time_cache = {cache_path: (end_time, 10.0)}
        # Single processed frame well past end_time with no motion/objects.
        maintainer.object_recordings_info["test_cam"] = [(now.timestamp(), [], [], [])]
        maintainer.audio_recordings_info["test_cam"] = []

        maintainer.drop_segment = MagicMock()
        maintainer.recordings_publisher = MagicMock()

        result = await maintainer.validate_and_move_segment(
            "test_cam",
            reviews=[],
            recording={"start_time": start_time, "cache_path": cache_path},
        )

        self.assertIsNone(result)
        maintainer.drop_segment.assert_called_once_with(cache_path)


if __name__ == "__main__":
    unittest.main()
