import os
import tempfile
import time
from types import SimpleNamespace
from unittest import TestCase
from unittest.mock import patch

import cv2
import numpy as np

from frigate.util import file as file_util


class TestFileUtils(TestCase):
    def _write_clean_snapshot(
        self, clips_dir: str, event_id: str, image: np.ndarray
    ) -> None:
        assert cv2.imwrite(
            os.path.join(clips_dir, f"front_door-{event_id}-clean.webp"),
            image,
        )

    def test_get_event_snapshot_bytes_reads_clean_webp(self):
        event_id = "clean-webp"
        image = np.zeros((100, 200, 3), np.uint8)
        event = SimpleNamespace(
            id=event_id,
            camera="front_door",
            label="Mock",
            top_score=100,
            score=0,
            start_time=0,
            data={
                "box": [0.25, 0.25, 0.25, 0.5],
                "score": 0.85,
                "attributes": [],
            },
        )

        with (
            tempfile.TemporaryDirectory() as clips_dir,
            patch.object(file_util, "CLIPS_DIR", clips_dir),
        ):
            self._write_clean_snapshot(clips_dir, event_id, image)

            snapshot_image, is_clean = file_util.load_event_snapshot_image(
                event, clean_only=True
            )

            assert is_clean
            assert snapshot_image is not None
            assert snapshot_image.shape[:2] == image.shape[:2]

            rendered_bytes, _ = file_util.get_event_snapshot_bytes(
                event,
                ext="jpg",
                timestamp=False,
                bounding_box=True,
                crop=False,
                height=40,
                quality=None,
                timestamp_style=None,
                colormap={},
            )
            assert rendered_bytes is not None

            rendered_image = cv2.imdecode(
                np.frombuffer(rendered_bytes, dtype=np.uint8),
                cv2.IMREAD_COLOR,
            )
            assert rendered_image is not None
            assert rendered_image.shape[0] == 40
            assert rendered_image.max() > 0

    def test_get_event_thumbnail_bytes_ignores_empty_file(self):
        """Verify empty thumbnail files are treated as missing."""
        event = SimpleNamespace(id="empty-thumb", camera="front_door", thumbnail=None)

        with (
            tempfile.TemporaryDirectory() as thumb_dir,
            patch.object(file_util, "THUMB_DIR", thumb_dir),
        ):
            camera_dir = os.path.join(thumb_dir, event.camera)
            os.makedirs(camera_dir)

            with open(os.path.join(camera_dir, f"{event.id}.webp"), "wb"):
                pass

            assert file_util.get_event_thumbnail_bytes(event) is None


class TestTrimOldestFiles(TestCase):
    def _fill(self, folder: str, names: list[str]) -> None:
        # a short gap keeps the ctime order deterministic
        for name in names:
            with open(os.path.join(folder, name), "wb"):
                pass

            time.sleep(0.01)

    def test_trims_folder_already_over_limit(self):
        """Verify one call trims a folder that is far over the limit."""
        with tempfile.TemporaryDirectory() as folder:
            self._fill(folder, [f"{i:03d}.webp" for i in range(10)])

            file_util.trim_oldest_files(folder, 4)

            assert sorted(os.listdir(folder)) == [
                "006.webp",
                "007.webp",
                "008.webp",
                "009.webp",
            ]

    def test_counts_every_listed_image_extension(self):
        """Verify the trim counts the same images the train listing shows."""
        with tempfile.TemporaryDirectory() as folder:
            self._fill(
                folder, ["notes.txt", "a.jpg", "b.jpeg", "c.png", "d.webp", "e.webp"]
            )

            file_util.trim_oldest_files(folder, 2)

            assert sorted(os.listdir(folder)) == ["d.webp", "e.webp", "notes.txt"]

    def test_file_removed_during_scan_does_not_skip_trim(self):
        """Verify a file deleted between listing and stat still trims the rest."""
        real_listdir = os.listdir

        with tempfile.TemporaryDirectory() as folder:
            self._fill(folder, [f"{i:03d}.webp" for i in range(10)])

            with patch(
                "os.listdir", side_effect=lambda p: real_listdir(p) + ["gone.webp"]
            ):
                file_util.trim_oldest_files(folder, 4)

            assert len(os.listdir(folder)) == 4
