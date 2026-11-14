"""Peewee migrations -- 039_add_perf_indexes.py.

Adds a composite (camera, start_time) index to speed up single-camera queries
issued by the web UI.

"""

import peewee as pw

SQL = pw.SQL


def migrate(migrator, database, fake=False, **kwargs):
    migrator.sql(
        'CREATE INDEX IF NOT EXISTS "event_camera_start_time" '
        'ON "event" ("camera", "start_time")'
    )


def rollback(migrator, database, fake=False, **kwargs):
    migrator.sql('DROP INDEX IF EXISTS "event_camera_start_time"')
