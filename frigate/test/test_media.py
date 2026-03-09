import os
import tempfile
import unittest

from peewee_migrate import Router
from playhouse.sqlite_ext import SqliteExtDatabase
from playhouse.sqliteq import SqliteQueueDatabase

from frigate.models import Previews, Recordings, RecordingsToDelete
from frigate.test.const import TEST_DB, TEST_DB_CLEANUPS
from frigate.util.media import sync_previews, sync_recordings


class TestMediaSync(unittest.TestCase):
    def setUp(self):
        migrate_db = SqliteExtDatabase(TEST_DB)
        router = Router(migrate_db)
        router.run()
        migrate_db.close()

        self.db = SqliteQueueDatabase(TEST_DB)
        models = [Previews, Recordings, RecordingsToDelete]
        self.db.bind(models)

        self.root_a = tempfile.mkdtemp()
        self.root_b = tempfile.mkdtemp()

    def tearDown(self):
        if not self.db.is_closed():
            self.db.close()

        try:
            for file in TEST_DB_CLEANUPS:
                os.remove(file)
        except OSError:
            pass

    def test_sync_recordings_scans_all_configured_roots(self):
        recording_path = os.path.join(self.root_a, "recording_a.mp4")
        orphan_path = os.path.join(self.root_b, "orphan_b.mp4")

        with open(recording_path, "w"):
            pass
        with open(orphan_path, "w"):
            pass

        Recordings.insert(
            id="rec_a",
            camera="front_door",
            path=recording_path,
            start_time=1,
            end_time=2,
            duration=1,
            motion=True,
            objects=True,
            segment_size=1,
        ).execute()

        result = sync_recordings(
            dry_run=True,
            force=True,
            recordings_roots=[self.root_a, self.root_b],
        )

        assert result.files_checked == 2
        assert result.orphans_found == 1
        assert orphan_path in result.orphan_paths

    def test_sync_recordings_does_not_scan_unconfigured_roots(self):
        orphan_path = os.path.join(self.root_b, "orphan_b.mp4")

        with open(orphan_path, "w"):
            pass

        result = sync_recordings(
            dry_run=True,
            force=True,
            recordings_roots=[self.root_a],
        )

        assert result.files_checked == 0
        assert result.orphans_found == 0

    def test_sync_previews_scans_configured_recording_roots(self):
        preview_dir = os.path.join(self.root_b, "preview", "front_door")
        os.makedirs(preview_dir, exist_ok=True)
        orphan_path = os.path.join(preview_dir, "100-200.mp4")

        with open(orphan_path, "w"):
            pass

        result = sync_previews(
            dry_run=True,
            force=True,
            recordings_roots=[self.root_a, self.root_b],
        )

        assert result.files_checked == 1
        assert result.orphans_found == 1
        assert orphan_path in result.orphan_paths


if __name__ == "__main__":
    unittest.main()
