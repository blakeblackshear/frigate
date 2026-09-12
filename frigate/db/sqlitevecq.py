import logging
import sqlite3
from typing import Any

import regex
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

    def _delete_embeddings(self, table: str, event_ids: list[str]) -> None:
        """Delete embeddings for the given events, if the table exists.

        Embeddings outlive the events they belong to when semantic search is
        disabled, so deletes are attempted regardless of the current config.
        """
        if not event_ids or not self.load_vec_extension:
            return

        # the embeddings tables are only created once semantic search has run
        cursor = self.execute_sql(
            "SELECT name FROM sqlite_master WHERE type = 'table' AND name = ?",
            (table,),
        )

        if cursor.fetchone() is None:
            logger.debug("Skipping %s cleanup, table does not exist", table)
            return

        ids = ",".join(["?" for _ in event_ids])
        self.execute_sql(f"DELETE FROM {table} WHERE id IN ({ids})", event_ids)

    def delete_embeddings_thumbnail(self, event_ids: list[str]) -> None:
        self._delete_embeddings("vec_thumbnails", event_ids)

    def delete_embeddings_description(self, event_ids: list[str]) -> None:
        self._delete_embeddings("vec_descriptions", event_ids)

    def drop_embeddings_tables(self) -> None:
        self.execute_sql("""
            DROP TABLE vec_descriptions;
        """)
        self.execute_sql("""
            DROP TABLE vec_thumbnails;
        """)

    def create_embeddings_tables(self) -> None:
        """Create vec0 virtual table for embeddings"""
        self.execute_sql("""
            CREATE VIRTUAL TABLE IF NOT EXISTS vec_thumbnails USING vec0(
                id TEXT PRIMARY KEY,
                thumbnail_embedding FLOAT[768] distance_metric=cosine
            );
        """)
        self.execute_sql("""
            CREATE VIRTUAL TABLE IF NOT EXISTS vec_descriptions USING vec0(
                id TEXT PRIMARY KEY,
                description_embedding FLOAT[768] distance_metric=cosine
            );
        """)
