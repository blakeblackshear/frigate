"""Tests for media sync orphan cleanup."""

import os
import tempfile
import unittest
from unittest.mock import patch

from peewee import SqliteDatabase

from frigate.models import Export, ExportCase
from frigate.util.media import sync_exports


class TestSyncExports(unittest.TestCase):
    def setUp(self):
        self.db = SqliteDatabase(":memory:")
        self.enterContext(self.db.bind_ctx([Export, ExportCase]))
        self.db.create_tables([Export, ExportCase])

        self.tmp = tempfile.TemporaryDirectory()
        self.clips_dir = os.path.join(self.tmp.name, "clips")
        self.export_dir = os.path.join(self.tmp.name, "exports")
        self.thumb_dir = os.path.join(self.clips_dir, "export")
        os.makedirs(self.thumb_dir)
        os.makedirs(self.export_dir)

        patcher_clips = patch("frigate.util.media.CLIPS_DIR", self.clips_dir)
        patcher_exports = patch("frigate.util.media.EXPORT_DIR", self.export_dir)
        patcher_clips.start()
        patcher_exports.start()
        self.addCleanup(patcher_clips.stop)
        self.addCleanup(patcher_exports.stop)

    def tearDown(self):
        self.db.close()
        self.tmp.cleanup()

    def _touch(self, path: str) -> str:
        open(path, "wb").close()
        return path

    def test_orphaned_webp_and_jpg_thumbnails_are_removed(self):
        for i, ext in enumerate(("webp", "jpg")):
            Export.insert(
                id=f"front_{i}",
                camera="front",
                name=f"export {i}",
                date=0,
                video_path=self._touch(os.path.join(self.export_dir, f"{i}.mp4")),
                thumb_path=self._touch(os.path.join(self.thumb_dir, f"{i}.{ext}")),
                in_progress=False,
            ).execute()

        orphan_webp = self._touch(os.path.join(self.thumb_dir, "gone.webp"))
        orphan_jpg = self._touch(os.path.join(self.thumb_dir, "gone.jpg"))

        result = sync_exports()

        self.assertEqual(sorted(result.orphan_paths), sorted([orphan_jpg, orphan_webp]))
        self.assertEqual(result.orphans_deleted, 2)
        self.assertEqual(sorted(os.listdir(self.thumb_dir)), ["0.webp", "1.jpg"])


if __name__ == "__main__":
    unittest.main()
