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
        return conn

    def _load_vec_extension(self, conn: sqlite3.Connection) -> None:
        conn.enable_load_extension(True)
        conn.load_extension(self.sqlite_vec_path)
        conn.enable_load_extension(False)
