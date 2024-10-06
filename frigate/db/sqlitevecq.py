import sqlite3

import sqlite_vec
from playhouse.sqliteq import SqliteQueueDatabase


class SqliteVecQueueDatabase(SqliteQueueDatabase):
    def __init__(self, *args, load_vec_extension: bool = False, **kwargs) -> None:
        super().__init__(*args, **kwargs)
        self.load_vec_extension: bool = load_vec_extension

    def _connect(self, *args, **kwargs) -> sqlite3.Connection:
        conn: sqlite3.Connection = super()._connect(*args, **kwargs)
        if self.load_vec_extension:
            self._load_vec_extension(conn)
        return conn

    def _load_vec_extension(self, conn: sqlite3.Connection) -> None:
        conn.enable_load_extension(True)
        sqlite_vec.load(conn)
        conn.enable_load_extension(False)
