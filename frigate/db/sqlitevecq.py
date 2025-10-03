import re
import sqlite3

from playhouse.sqliteq import SqliteQueueDatabase


class SqliteVecQueueDatabase(SqliteQueueDatabase):
    def __init__(self, *args, load_vec_extension: bool = False, **kwargs) -> None:
        self.load_vec_extension: bool = load_vec_extension
        # no extension necessary, sqlite will load correctly for each platform
        self.sqlite_vec_path = "/usr/local/lib/vec0"
        super().__init__(*args, **kwargs)

    def _connect(self, *args, **kwargs) -> sqlite3.Connection:
        conn: sqlite3.Connection = super()._connect(*args, **kwargs)
        if self.load_vec_extension:
            self._load_vec_extension(conn)

        # register REGEXP support
        self._register_regexp(conn)

        return conn

    def _load_vec_extension(self, conn: sqlite3.Connection) -> None:
        conn.enable_load_extension(True)
        conn.load_extension(self.sqlite_vec_path)
        conn.enable_load_extension(False)

    def _register_regexp(self, conn: sqlite3.Connection) -> None:
        def regexp(expr: str, item: str) -> bool:
            if item is None:
                return False
            try:
                return re.search(expr, item) is not None
            except re.error:
                return False

        conn.create_function("REGEXP", 2, regexp)

    def delete_embeddings_thumbnail(self, event_ids: list[str]) -> None:
        ids = ",".join(["?" for _ in event_ids])
        self.execute_sql(f"DELETE FROM vec_thumbnails WHERE id IN ({ids})", event_ids)

    def delete_embeddings_description(self, event_ids: list[str]) -> None:
        ids = ",".join(["?" for _ in event_ids])
        self.execute_sql(f"DELETE FROM vec_descriptions WHERE id IN ({ids})", event_ids)

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
