"""Tests for SharedMemoryFrameManager cache invalidation.

Covers the case where a SHM segment is unlinked and recreated at a
different size across a camera add/remove cycle while a long-lived
in-process cache (e.g. TrackedObjectProcessor) still holds a ref to
the old, smaller segment.
"""

import unittest
from types import SimpleNamespace
from unittest.mock import patch

import numpy as np

from frigate.util.image import SharedMemoryFrameManager


def _fake_shm(size: int) -> SimpleNamespace:
    """A minimal stand-in for UntrackedSharedMemory with .size and .buf."""
    return SimpleNamespace(size=size, buf=bytearray(size), close=lambda: None)


class TestSharedMemoryFrameManagerGet(unittest.TestCase):
    def test_get_reopens_when_cached_segment_is_smaller_than_shape(self) -> None:
        """A cached ref to an older smaller segment must be dropped and the
        current (larger) segment reopened. Without this, np.ndarray would
        raise "buffer is too small for requested array" when the in-memory
        cache pointed at an old SHM after a same-name resize."""
        manager = SharedMemoryFrameManager()

        small = _fake_shm(size=100)
        large = _fake_shm(size=10_000)
        manager.shm_store["cam_frame0"] = small

        with patch("frigate.util.image.UntrackedSharedMemory", return_value=large):
            arr = manager.get("cam_frame0", (50, 50))

        self.assertIsNotNone(arr)
        # Numpy now reports against the large segment, not the small one.
        self.assertEqual(arr.shape, (50, 50))
        self.assertIs(manager.shm_store["cam_frame0"], large)

    def test_get_keeps_cached_segment_when_size_sufficient(self) -> None:
        """Don't pay the reopen cost when the cached ref is fine."""
        manager = SharedMemoryFrameManager()

        cached = _fake_shm(size=10_000)
        manager.shm_store["cam_frame0"] = cached

        with patch("frigate.util.image.UntrackedSharedMemory") as untracked_shm_cls:
            arr = manager.get("cam_frame0", (50, 50))
            untracked_shm_cls.assert_not_called()

        self.assertIsNotNone(arr)
        self.assertIs(manager.shm_store["cam_frame0"], cached)

    def test_get_opens_fresh_when_no_cache_entry(self) -> None:
        manager = SharedMemoryFrameManager()
        fresh = _fake_shm(size=10_000)

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


if __name__ == "__main__":
    unittest.main()
