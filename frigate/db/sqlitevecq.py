import logging
import sqlite3
from typing import Any

import regex
from peewee import DatabaseError
from playhouse.sqliteq import SqliteQueueDatabase

logger = logging.getLogger(__name__)

REGEXP_TIMEOUT_SECONDS = 1.0


class SqliteVecQueueDatabase(SqliteQueueDatabase):
    def __init__(
        self, *args: Any, load_vec_extension: bool = False, **kwargs: Any
    ) -> None:
        self.load_vec_extension: bool = load_vec_extension
        # no extension necessary, sqlite will load correctly for each platform
        self.sqlite_vec_path = "/usr/local/lib/vec0"
        super().__init__(*args, **kwargs)

    def _connect(self, *args: Any, **kwargs: Any) -> sqlite3.Connection:
        conn: sqlite3.Connection = super()._connect(*args, **kwargs)  # type: ignore[misc]
        if self.load_vec_extension:
            self._load_vec_extension(conn)

        # register REGEXP support
        self._register_regexp(conn)

        return conn

    def _load_vec_extension(self, conn: sqlite3.Connection) -> None:
        conn.enable_load_extension(True)

        try:
            conn.load_extension(self.sqlite_vec_path)
        except conn.OperationalError:
            logger.error("Unable to load the sqlite-vec extension")
            self.load_vec_extension = False
        finally:
            conn.enable_load_extension(False)

    def _register_regexp(self, conn: sqlite3.Connection) -> None:
        def regexp(expr: str, item: str | None) -> bool:
            if item is None:
                return False
            try:
                return (
                    regex.search(expr, item, timeout=REGEXP_TIMEOUT_SECONDS) is not None
                )
            except (regex.error, TimeoutError):
                return False

        conn.create_function("REGEXP", 2, regexp)

    def execute_write(self, sql: str, params: Any = None) -> None:
        """Run a write and wait for it, so that failures are raised here.

        SqliteQueueDatabase hands non-SELECT statements to a writer thread and
        stores any exception on the cursor it returns, so callers that ignore
        that cursor never learn the write failed.
        """
        self.execute_sql(sql, params).fetchall()

    def _table_exists(self, table: str) -> bool:
        cursor = self.execute_sql(
            "SELECT name FROM sqlite_master WHERE type = 'table' AND name = ?",
            (table,),
        )
        return cursor.fetchone() is not None

    def _delete_embeddings(self, table: str, event_ids: list[str]) -> None:
        """Delete embeddings for the given events, if the table exists.

        Embeddings outlive the events they belong to when semantic search is
        disabled, so deletes are attempted regardless of the current config.
        """
        if not event_ids or not self.load_vec_extension:
            return

        # the embeddings tables are only created once semantic search has run
        if not self._table_exists(table):
            logger.debug("Skipping %s cleanup, table does not exist", table)
            return

        ids = ",".join(["?" for _ in event_ids])

        # callers treat cleanup as best effort, so log rather than propagate
        try:
            self.execute_write(f"DELETE FROM {table} WHERE id IN ({ids})", event_ids)
        except DatabaseError:
            logger.exception("Failed to delete embeddings from %s", table)

    def delete_embeddings_thumbnail(self, event_ids: list[str]) -> None:
        self._delete_embeddings("vec_thumbnails", event_ids)

    def delete_embeddings_description(self, event_ids: list[str]) -> None:
        self._delete_embeddings("vec_descriptions", event_ids)

    def _restore_vec_info_table(self, table: str) -> None:
        """Recreate the _info shadow table a legacy vec0 table is missing.

        sqlite-vec added _info in 0.1.6 and drops it unconditionally when a
        table is destroyed, so tables written by Frigate 0.17 and earlier fail
        to drop. An empty stub is enough, and leaving it unseeded keeps the
        table reading as pre-0.1.10 if the drop does not follow.
        """
        if not self._table_exists(table) or self._table_exists(f"{table}_info"):
            return

        logger.debug("Restoring the %s_info shadow table before dropping", table)
        self.execute_write(
            f'CREATE TABLE "{table}_info" (key TEXT PRIMARY KEY, value ANY)'
        )

    def drop_embeddings_tables(self) -> None:
        for table in ("vec_descriptions", "vec_thumbnails"):
            self._restore_vec_info_table(table)
            self.execute_write(f"DROP TABLE IF EXISTS {table}")

    def create_embeddings_tables(self) -> None:
        """Create vec0 virtual table for embeddings"""
        self.execute_write("""
            CREATE VIRTUAL TABLE IF NOT EXISTS vec_thumbnails USING vec0(
                id TEXT PRIMARY KEY,
                thumbnail_embedding FLOAT[768] distance_metric=cosine
            );
        """)
        self.execute_write("""
            CREATE VIRTUAL TABLE IF NOT EXISTS vec_descriptions USING vec0(
                id TEXT PRIMARY KEY,
                description_embedding FLOAT[768] distance_metric=cosine
            );
        """)

    def upsert_embeddings(
        self, table: str, column: str, embeddings: dict[str, bytes]
    ) -> None:
        """Write embeddings for the given event ids, replacing any that exist.

        vec0 implements neither REPLACE nor UPSERT, so rows that are already
        there have to be deleted first.
        """
        if not embeddings:
            return

        event_ids = list(embeddings.keys())
        ids = ",".join(["?" for _ in event_ids])
        self.execute_write(f"DELETE FROM {table} WHERE id IN ({ids})", event_ids)

        params: list[Any] = []

        for event_id in event_ids:
            params.extend((event_id, embeddings[event_id]))

        values = ", ".join(["(?, ?)"] * len(event_ids))
        self.execute_write(f"INSERT INTO {table}(id, {column}) VALUES {values}", params)
