"""Tests for SharedMemoryFrameManager cache invalidation.

Covers the case where a SHM segment is unlinked and recreated at a
different size across a camera add/remove cycle while a long-lived
in-process cache (e.g. TrackedObjectProcessor) still holds a ref to
the old, smaller segment.
"""

import queue
import threading
import unittest
from multiprocessing import Event, Value
from types import SimpleNamespace
from unittest.mock import MagicMock, patch

import numpy as np

from frigate.embeddings.maintainer import EmbeddingMaintainer
from frigate.events.types import EventStateEnum, EventTypeEnum
from frigate.track.object_processing import TrackedObjectProcessor
from frigate.util.image import SharedMemoryFrameManager
from frigate.video.ffmpeg import capture_frames


def _fake_shm(size: int) -> SimpleNamespace:
    """A minimal stand-in for UntrackedSharedMemory with .size and .buf."""
    return SimpleNamespace(size=size, buf=bytearray(size), close=lambda: None)


class TestSharedMemoryFrameManagerGet(unittest.TestCase):
    def test_get_reopens_when_cached_segment_is_smaller_than_shape(self) -> None:
        """A cached ref to an older smaller segment must be dropped and the
        current (correctly sized) segment reopened. Without this, np.ndarray
        would raise "buffer is too small for requested array" when the
        in-memory cache pointed at an old SHM after a same-name resize."""
        manager = SharedMemoryFrameManager()

        small = _fake_shm(size=100)
        current = _fake_shm(size=2_500)
        manager.shm_store["cam_frame0"] = small

        with patch("frigate.util.image.UntrackedSharedMemory", return_value=current):
            arr = manager.get("cam_frame0", (50, 50))

        self.assertIsNotNone(arr)
        self.assertEqual(arr.shape, (50, 50))
        self.assertIs(manager.shm_store["cam_frame0"], current)

    def test_get_reopens_when_cached_segment_is_larger_than_shape(self) -> None:
        """Symmetric to the smaller-cache case: when detect resolution drops,
        the SHM is unlinked and recreated at a smaller size. A cached ref to
        the old, larger segment still satisfies any size check but points at
        an orphaned inode whose stale bytes get reinterpreted at the new
        shape — producing miscolored, distorted YUV frames downstream. Drop
        the cache so we reopen by name and bind to the current segment."""
        manager = SharedMemoryFrameManager()

        old_large = _fake_shm(size=10_000)
        current = _fake_shm(size=2_500)
        manager.shm_store["cam_frame0"] = old_large

        with patch("frigate.util.image.UntrackedSharedMemory", return_value=current):
            arr = manager.get("cam_frame0", (50, 50))

        self.assertIsNotNone(arr)
        self.assertEqual(arr.shape, (50, 50))
        self.assertIs(manager.shm_store["cam_frame0"], current)

    def test_get_keeps_cached_segment_when_size_matches(self) -> None:
        """Don't pay the reopen cost when the cached ref is the right size."""
        manager = SharedMemoryFrameManager()

        cached = _fake_shm(size=2_500)
        manager.shm_store["cam_frame0"] = cached

        with patch("frigate.util.image.UntrackedSharedMemory") as untracked_shm_cls:
            arr = manager.get("cam_frame0", (50, 50))
            untracked_shm_cls.assert_not_called()

        self.assertIsNotNone(arr)
        self.assertIs(manager.shm_store["cam_frame0"], cached)

    def test_get_opens_fresh_when_no_cache_entry(self) -> None:
        manager = SharedMemoryFrameManager()
        fresh = _fake_shm(size=2_500)

        with patch("frigate.util.image.UntrackedSharedMemory", return_value=fresh):
            arr = manager.get("cam_frame0", (50, 50))

        self.assertIsNotNone(arr)
        self.assertIs(manager.shm_store["cam_frame0"], fresh)

    def test_get_returns_none_when_segment_missing(self) -> None:
        manager = SharedMemoryFrameManager()

        with patch(
            "frigate.util.image.UntrackedSharedMemory",
            side_effect=FileNotFoundError,
        ):
            arr = manager.get("cam_frame0", (50, 50))

        self.assertIsNone(arr)

    def test_get_returns_none_when_reopened_segment_is_still_too_small(self) -> None:
        """Race during a same-name SHM recreate: cache is stale, we reopen
        by name, but the maintainer hasn't allocated the new segment yet —
        the reopened ref is also too small. Skip the frame (return None)
        rather than crash on np.ndarray."""
        manager = SharedMemoryFrameManager()

        small_cached = _fake_shm(size=100)
        still_small_after_reopen = _fake_shm(size=100)
        manager.shm_store["cam_frame0"] = small_cached

        with patch(
            "frigate.util.image.UntrackedSharedMemory",
            return_value=still_small_after_reopen,
        ):
            arr = manager.get("cam_frame0", (50, 50))

        self.assertIsNone(arr)
        # Don't cache the too-small reopened ref — next call will re-open
        # once the maintainer has finished recreating the segment.
        self.assertNotIn("cam_frame0", manager.shm_store)

    def test_get_handles_n_dimensional_shape(self) -> None:
        """np.prod must be used (not raw multiplication) for tuple shapes."""
        manager = SharedMemoryFrameManager()
        # YUV-shaped frame: (height * 3/2, width) for 1920x1080 = 3,110,400
        big_enough = _fake_shm(size=3_110_400)
        manager.shm_store["cam_frame0"] = big_enough

        with patch("frigate.util.image.UntrackedSharedMemory") as untracked_shm_cls:
            arr = manager.get("cam_frame0", (1620, 1920))
            untracked_shm_cls.assert_not_called()

        self.assertIsNotNone(arr)
        self.assertEqual(arr.shape, (1620, 1920))


class TestSharedMemoryFrameManagerGetRecreatesLargerSegment(unittest.TestCase):
    """End-to-end-style: simulates the full unlink-and-recreate cycle."""

    def test_segment_grows_then_get_succeeds(self) -> None:
        manager = SharedMemoryFrameManager()

        # Phase 1: existing camera at 320x240 YUV — 320 * 240 * 1.5 = 115_200
        small = _fake_shm(size=115_200)
        manager.shm_store["cam_frame0"] = small
        arr_small = np.ndarray((360, 320), dtype=np.uint8, buffer=small.buf)
        self.assertEqual(arr_small.shape, (360, 320))

        # Phase 2: restart at 1920x1080 — new SHM segment, larger size.
        large = _fake_shm(size=3_110_400)
        with patch("frigate.util.image.UntrackedSharedMemory", return_value=large):
            arr_large = manager.get("cam_frame0", (1620, 1920))

        self.assertIsNotNone(arr_large)
        self.assertEqual(arr_large.shape, (1620, 1920))


def _segments(**sizes: int) -> dict[str, SimpleNamespace]:
    return {name: _fake_shm(size) for name, size in sizes.items()}


def _open_from(segments: dict[str, SimpleNamespace]):
    def open_segment(name: str, **_kwargs):
        if name not in segments:
            raise FileNotFoundError(name)
        return segments[name]

    return open_segment


class TestSharedMemoryFrameManagerFrameTimes(unittest.TestCase):
    def test_frame_times_is_float64_view_over_ledger_segment(self) -> None:
        manager = SharedMemoryFrameManager()
        segments = _segments(cam_frame_times=8 * 3)

        with patch(
            "frigate.util.image.UntrackedSharedMemory",
            side_effect=_open_from(segments),
        ):
            times = manager.frame_times("cam")

        self.assertEqual(times.dtype, np.float64)
        self.assertEqual(times.shape, (3,))
        times[1] = 12.5
        self.assertEqual(
            np.frombuffer(segments["cam_frame_times"].buf, dtype=np.float64)[1], 12.5
        )

    def test_frame_times_returns_none_when_ledger_missing(self) -> None:
        manager = SharedMemoryFrameManager()

        with patch(
            "frigate.util.image.UntrackedSharedMemory", side_effect=FileNotFoundError
        ):
            self.assertIsNone(manager.frame_times("cam"))

    def test_get_returns_frame_when_ledger_matches(self) -> None:
        manager = SharedMemoryFrameManager()
        segments = _segments(cam_frame0=2_500, cam_frame_times=8 * 2)
        np.frombuffer(segments["cam_frame_times"].buf, dtype=np.float64)[0] = 100.25

        with patch(
            "frigate.util.image.UntrackedSharedMemory",
            side_effect=_open_from(segments),
        ):
            arr = manager.get("cam_frame0", (50, 50), frame_time=100.25)

        self.assertIsNotNone(arr)
        self.assertEqual(arr.shape, (50, 50))

    def test_get_returns_none_when_slot_was_overwritten(self) -> None:
        manager = SharedMemoryFrameManager()
        segments = _segments(cam_frame0=2_500, cam_frame_times=8 * 2)
        np.frombuffer(segments["cam_frame_times"].buf, dtype=np.float64)[0] = 200.0

        with (
            patch(
                "frigate.util.image.UntrackedSharedMemory",
                side_effect=_open_from(segments),
            ),
            self.assertLogs("frigate.util.image", "DEBUG") as logs,
        ):
            arr = manager.get("cam_frame0", (50, 50), frame_time=100.25)

        self.assertIsNone(arr)
        self.assertIn(
            "cam_frame0 no longer holds the frame from 100.25", logs.output[0]
        )

    def test_get_returns_none_when_slot_index_is_beyond_ledger(self) -> None:
        manager = SharedMemoryFrameManager()
        segments = _segments(cam_frame5=2_500, cam_frame_times=8 * 2)

        with patch(
            "frigate.util.image.UntrackedSharedMemory",
            side_effect=_open_from(segments),
        ):
            arr = manager.get("cam_frame5", (50, 50), frame_time=100.25)

        self.assertIsNone(arr)

    def test_get_reopens_every_cached_slot_when_ledger_is_stale(self) -> None:
        """A camera recreated at the same resolution gets new segments under
        the old names. A long-lived reader still mapped to the unlinked ledger
        sees a mismatch, which must drop every cached slot of that camera, not
        only the one being read, or later reads return the old pixels."""
        manager = SharedMemoryFrameManager()
        stale = _segments(cam_frame0=2_500, cam_frame1=2_500, cam_frame_times=8 * 2)
        manager.shm_store.update(stale)
        current = _segments(cam_frame0=2_500, cam_frame1=2_500, cam_frame_times=8 * 2)
        current["cam_frame1"].buf[0] = 7
        np.frombuffer(current["cam_frame_times"].buf, dtype=np.float64)[:] = (
            100.25,
            100.5,
        )

        with patch(
            "frigate.util.image.UntrackedSharedMemory",
            side_effect=_open_from(current),
        ):
            first = manager.get("cam_frame0", (50, 50), frame_time=100.25)
            second = manager.get("cam_frame1", (50, 50), frame_time=100.5)

        self.assertIsNotNone(first)
        self.assertEqual(second[0, 0], 7)
        self.assertIs(manager.shm_store["cam_frame1"], current["cam_frame1"])

    def test_get_keeps_cached_slots_when_only_lapped(self) -> None:
        manager = SharedMemoryFrameManager()
        segments = _segments(cam_frame0=2_500, cam_frame1=2_500, cam_frame_times=8 * 2)
        manager.shm_store.update(segments)
        np.frombuffer(segments["cam_frame_times"].buf, dtype=np.float64)[0] = 200.0

        with patch(
            "frigate.util.image.UntrackedSharedMemory",
            side_effect=_open_from(segments),
        ):
            arr = manager.get("cam_frame0", (50, 50), frame_time=100.25)

        self.assertIsNone(arr)
        self.assertIs(manager.shm_store["cam_frame1"], segments["cam_frame1"])

    def test_close_camera_drops_only_that_camera(self) -> None:
        manager = SharedMemoryFrameManager()
        manager.shm_store.update(
            _segments(cam_frame0=1, cam_frame1=1, cam_frame_times=8, other_frame0=1)
        )
        # a camera named cam_frame shares the cam_frame prefix
        manager.shm_store.update(
            {"cam_frame_frame0": _fake_shm(1), "cam_frame_frame_times": _fake_shm(8)}
        )

        manager.close_camera("cam")

        self.assertEqual(
            set(manager.shm_store),
            {"other_frame0", "cam_frame_frame0", "cam_frame_frame_times"},
        )

    def test_get_without_frame_time_skips_ledger(self) -> None:
        manager = SharedMemoryFrameManager()
        segments = _segments(cam_frame0=2_500)

        with patch(
            "frigate.util.image.UntrackedSharedMemory",
            side_effect=_open_from(segments),
        ):
            arr = manager.get("cam_frame0", (50, 50))

        self.assertIsNotNone(arr)
        self.assertNotIn("cam_frame_times", manager.shm_store)


class TestCaptureFrames(unittest.TestCase):
    """capture_frames stamps the ledger and only advances the slot index
    once a frame has been handed to the queue."""

    def _run(self, frames: list[bytes], put_results: list[Exception | None]):
        frame_size = 4
        slots = {f"cam_frame{i}": bytearray(frame_size) for i in range(3)}
        times = np.zeros(3, dtype=np.float64)
        frame_manager = MagicMock()
        frame_manager.write.side_effect = lambda name: memoryview(slots[name])
        frame_manager.frame_times.return_value = times

        stop_event = Event()
        reads = iter(frames)
        self.times_during_read: list[np.ndarray] = []

        def readinto(buffer):
            self.times_during_read.append(times.copy())

            try:
                frame = next(reads)
            except StopIteration:
                stop_event.set()
                return 0

            buffer[:] = frame
            return len(frame)

        ffmpeg_process = MagicMock()
        ffmpeg_process.stdout.readinto.side_effect = readinto
        ffmpeg_process.poll.return_value = None

        frame_queue = MagicMock()
        frame_queue.put.side_effect = put_results
        config = SimpleNamespace(name="cam", enabled=True)

        capture_frames(
            ffmpeg_process,
            config,
            3,
            0,
            (2, 2),
            frame_manager,
            frame_queue,
            Value("d", 0.0),
            Value("d", 0.0),
            Value("d", 0.0),
            stop_event,
        )

        return slots, times, [c.args[0] for c in frame_queue.put.call_args_list]

    def test_advances_slot_and_stamps_ledger_on_success(self) -> None:
        slots, times, puts = self._run([b"aaaa", b"bbbb"], [None, None])

        self.assertEqual([name for name, _ in puts], ["cam_frame0", "cam_frame1"])
        self.assertEqual(bytes(slots["cam_frame0"]), b"aaaa")
        self.assertEqual(bytes(slots["cam_frame1"]), b"bbbb")
        self.assertEqual(times[0], puts[0][1])
        self.assertEqual(times[1], puts[1][1])
        self.assertGreater(times[0], 0)

    def test_reuses_slot_when_queue_is_full(self) -> None:
        slots, times, puts = self._run(
            [b"aaaa", b"bbbb", b"cccc"], [None, queue.Full(), None]
        )

        self.assertEqual(
            [name for name, _ in puts], ["cam_frame0", "cam_frame1", "cam_frame1"]
        )
        self.assertEqual(bytes(slots["cam_frame1"]), b"cccc")
        self.assertEqual(bytes(slots["cam_frame2"]), bytes(4))
        self.assertEqual(times[1], puts[2][1])
        self.assertEqual(times[2], 0)

    def test_slot_never_matches_while_it_is_being_filled(self) -> None:
        _, _, puts = self._run([b"aaaa", b"bbbb"], [queue.Full(), None])

        # the second read refills slot 0, which the first frame had stamped
        self.assertEqual([name for name, _ in puts], ["cam_frame0", "cam_frame0"])
        self.assertEqual(self.times_during_read[1][0], 0)


class TestTrackedObjectEventsCarryFrameTime(unittest.TestCase):
    """Tracked object events carry the time of the frame they name, which can
    differ from the object's own frame_time when it wasn't detected in that
    frame."""

    def _callbacks(self) -> tuple[dict, MagicMock]:
        processor = TrackedObjectProcessor.__new__(TrackedObjectProcessor)
        processor.config = SimpleNamespace(cameras={"cam": SimpleNamespace(name="cam")})
        processor.event_sender = MagicMock()
        processor.dispatcher = MagicMock()
        processor.ptz_autotracker_thread = MagicMock()
        processor.camera_states = {}
        processor.camera_states_lock = threading.Lock()
        processor.frame_manager = MagicMock()
        processor.should_save_snapshot = MagicMock(return_value=False)
        processor.should_retain_recording = MagicMock(return_value=False)
        callbacks: dict = {}

        with patch("frigate.track.object_processing.CameraState") as state_cls:
            state_cls.return_value.on.side_effect = lambda name, fn: callbacks.update(
                {name: fn}
            )
            processor.create_camera_state("cam")

        return callbacks, processor.event_sender

    def test_start_update_end_publish_frame_time(self) -> None:
        callbacks, sender = self._callbacks()
        obj = MagicMock()
        obj.to_dict.return_value = {"id": "1", "frame_time": 10.0}
        obj.obj_data = {"frame_time": 10.0}
        obj.previous = {"false_positive": True}
        obj.false_positive = True

        callbacks["start"]("cam", obj, "cam_frame3", 12.5)
        callbacks["update"]("cam", obj, "cam_frame4", 13.0)
        callbacks["end"]("cam", obj, "cam_frame5", 13.5)

        payloads = [c.args[0] for c in sender.publish.call_args_list]
        self.assertEqual(
            [(p[1], p[3], p[5]) for p in payloads],
            [
                (EventStateEnum.start, "cam_frame3", 12.5),
                (EventStateEnum.update, "cam_frame4", 13.0),
                (EventStateEnum.end, "cam_frame5", 13.5),
            ],
        )


class TestEmbeddingsObjectUpdateVerifiesFrame(unittest.TestCase):
    def test_object_update_reads_frame_at_event_frame_time(self) -> None:
        maintainer = EmbeddingMaintainer.__new__(EmbeddingMaintainer)
        maintainer.config = SimpleNamespace(
            cameras={"cam": SimpleNamespace(frame_shape_yuv=(6, 4))},
            semantic_search=SimpleNamespace(enabled=False),
        )
        maintainer.event_subscriber = MagicMock()
        maintainer.event_subscriber.check_for_update.return_value = (
            EventTypeEnum.tracked_object,
            EventStateEnum.update,
            "cam",
            "cam_frame4",
            {"id": "1", "label": "person", "frame_time": 10.0},
            13.0,
        )
        maintainer.realtime_processors = [MagicMock()]
        maintainer.post_processors = []
        maintainer.frame_manager = MagicMock()

        maintainer._process_updates()

        maintainer.frame_manager.get.assert_called_once_with("cam_frame4", (6, 4), 13.0)
        maintainer.frame_manager.close.assert_not_called()


if __name__ == "__main__":
    unittest.main()
