"""Tests for embedding storage and cleanup on the main Frigate database.

Embeddings are deleted whether or not semantic search is currently enabled, so
the delete path has to tolerate databases where the vec0 tables were never
created and installs where the sqlite-vec extension is unavailable.

The write paths need the real extension, since the behavior under test belongs
to vec0 itself, so those tests are skipped when it is not installed.
"""

import os
import struct
import tempfile
import unittest

from peewee import OperationalError

from frigate.db.sqlitevecq import SqliteVecQueueDatabase

VEC_EXTENSION_PATH = "/usr/local/lib/vec0.so"


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

    def test_delete_failure_is_logged_not_raised(self) -> None:
        self._create_thumbnails_table()
        self.db.execute_sql(
            """
            CREATE TRIGGER vec_thumbnails_no_delete BEFORE DELETE ON vec_thumbnails
            BEGIN SELECT RAISE(ABORT, 'delete blocked'); END
            """
        ).fetchall()

        with self.assertLogs("frigate.db.sqlitevecq", level="ERROR") as logs:
            self.db.delete_embeddings_thumbnail(event_ids=["a"])

        self.assertIn("Failed to delete embeddings", logs.output[0])
        self.assertEqual(self._thumbnail_ids(), ["a", "b"])

    def test_delete_skipped_without_extension(self) -> None:
        self._create_thumbnails_table()
        self.db.load_vec_extension = False

        self.db.delete_embeddings_thumbnail(event_ids=["a"])
        self._flush_writes()

        # the vec0 tables cannot be written without the extension
        self.assertEqual(self._thumbnail_ids(), ["a", "b"])


def _vector(value: float) -> bytes:
    return struct.pack("768f", *([value] * 768))


@unittest.skipUnless(
    os.path.exists(VEC_EXTENSION_PATH), "sqlite-vec extension is not installed"
)
class TestEmbeddingsTableWrites(unittest.TestCase):
    """Covers the vec0 writes behind semantic search reindexing."""

    def setUp(self) -> None:
        self.tmp_dir = tempfile.TemporaryDirectory()
        self.db = SqliteVecQueueDatabase(
            os.path.join(self.tmp_dir.name, "test.db"), load_vec_extension=True
        )
        self.db.start()
        self.db.create_embeddings_tables()

    def tearDown(self) -> None:
        self.db.stop()
        self.db.close()
        self.tmp_dir.cleanup()

    def _vec_tables(self) -> list[str]:
        return [
            row[0]
            for row in self.db.execute_sql(
                "SELECT name FROM sqlite_master WHERE name LIKE 'vec_%' ORDER BY name"
            )
        ]

    def _make_legacy(self, table: str) -> None:
        # sqlite-vec added the _info shadow table in 0.1.6, so tables written by
        # Frigate 0.17 and earlier do not have one
        self.db.execute_sql(f"DROP TABLE {table}_info").fetchall()

    def _stored(self, table: str, column: str, event_id: str) -> str | None:
        row = self.db.execute_sql(
            f"SELECT vec_to_json({column}) FROM {table} WHERE id = ?", (event_id,)
        ).fetchone()
        return row[0] if row else None

    def test_write_error_is_raised(self) -> None:
        # queued writes hide their exception in the returned cursor
        with self.assertRaises(OperationalError):
            self.db.execute_write("INSERT INTO vec_missing(id) VALUES ('a')")

    def test_drop_tables_removes_legacy_tables(self) -> None:
        self._make_legacy("vec_thumbnails")
        self._make_legacy("vec_descriptions")

        self.db.drop_embeddings_tables()

        self.assertEqual(self._vec_tables(), [])

    def test_drop_tables_without_any_tables_does_not_raise(self) -> None:
        self.db.drop_embeddings_tables()

        self.db.drop_embeddings_tables()

    def test_upsert_replaces_existing_embedding(self) -> None:
        self.db.upsert_embeddings(
            "vec_thumbnails", "thumbnail_embedding", {"evt1": _vector(0.01)}
        )

        self.db.upsert_embeddings(
            "vec_thumbnails", "thumbnail_embedding", {"evt1": _vector(0.99)}
        )

        stored = self._stored("vec_thumbnails", "thumbnail_embedding", "evt1")
        self.assertTrue(stored.startswith("[0.990000"), stored)

    def test_upsert_keeps_one_row_per_event(self) -> None:
        for _ in range(3):
            self.db.upsert_embeddings(
                "vec_descriptions", "description_embedding", {"evt1": _vector(0.5)}
            )

        count = self.db.execute_sql(
            "SELECT count(*) FROM vec_descriptions WHERE id = 'evt1'"
        ).fetchone()[0]
        self.assertEqual(count, 1)

    def test_reindex_cycle_rewrites_legacy_tables(self) -> None:
        """The 0.18 upgrade path: old vectors in, new vectors out."""
        self.db.upsert_embeddings(
            "vec_thumbnails", "thumbnail_embedding", {"evt1": _vector(0.01)}
        )
        self._make_legacy("vec_thumbnails")
        self._make_legacy("vec_descriptions")

        self.db.drop_embeddings_tables()
        self.db.create_embeddings_tables()
        self.db.upsert_embeddings(
            "vec_thumbnails", "thumbnail_embedding", {"evt1": _vector(0.99)}
        )

        stored = self._stored("vec_thumbnails", "thumbnail_embedding", "evt1")
        self.assertTrue(stored.startswith("[0.990000"), stored)
