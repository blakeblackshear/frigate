"""Tests for embedding cleanup on the main Frigate database.

Embeddings are deleted whether or not semantic search is currently enabled, so
the delete path has to tolerate databases where the vec0 tables were never
created and installs where the sqlite-vec extension is unavailable.
"""

import os
import tempfile
import unittest

from frigate.db.sqlitevecq import SqliteVecQueueDatabase


class TestDeleteEmbeddings(unittest.TestCase):
    def setUp(self) -> None:
        self.tmp_dir = tempfile.TemporaryDirectory()
        self.db = SqliteVecQueueDatabase(os.path.join(self.tmp_dir.name, "test.db"))
        self.db.start()
        # the extension is not available to tests, so stand in for a database
        # that has it loaded and use a plain table for the deletes
        self.db.load_vec_extension = True

    def tearDown(self) -> None:
        self.db.stop()
        self.db.close()
        self.tmp_dir.cleanup()

    def _flush_writes(self) -> None:
        # writes are queued and applied by a worker thread, and the queue is
        # FIFO, so awaiting a later write means the earlier ones are done
        self.db.execute_sql("PRAGMA user_version = 0").fetchall()

    def _create_thumbnails_table(self) -> None:
        self.db.execute_sql("CREATE TABLE vec_thumbnails (id TEXT PRIMARY KEY)")
        self.db.execute_sql("INSERT INTO vec_thumbnails (id) VALUES ('a'), ('b')")
        self._flush_writes()

    def _thumbnail_ids(self) -> list[str]:
        return [row[0] for row in self.db.execute_sql("SELECT id FROM vec_thumbnails")]

    def test_delete_without_tables_does_not_raise(self) -> None:
        # semantic search was never enabled, so event cleanup has nothing to do
        self.db.delete_embeddings_thumbnail(event_ids=["1700000000.0-abc"])
        self.db.delete_embeddings_description(event_ids=["1700000000.0-abc"])

    def test_delete_removes_embeddings(self) -> None:
        self._create_thumbnails_table()

        self.db.delete_embeddings_thumbnail(event_ids=["a"])
        self._flush_writes()

        self.assertEqual(self._thumbnail_ids(), ["b"])

    def test_delete_skipped_without_extension(self) -> None:
        self._create_thumbnails_table()
        self.db.load_vec_extension = False

        self.db.delete_embeddings_thumbnail(event_ids=["a"])
        self._flush_writes()

        # the vec0 tables cannot be written without the extension
        self.assertEqual(self._thumbnail_ids(), ["a", "b"])
