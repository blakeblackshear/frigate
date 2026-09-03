"""Peewee migrations -- 036_add_perf_indexes.py.

Adds composite/single-column indexes to speed up single-camera queries
issued by the web UI.

"""

import peewee as pw

SQL = pw.SQL


def migrate(migrator, database, fake=False, **kwargs):
    migrator.sql(
        'CREATE INDEX IF NOT EXISTS "event_camera_start_time" '
        'ON "event" ("camera", "start_time" DESC)'
    )


def rollback(migrator, database, fake=False, **kwargs):
    migrator.sql('DROP INDEX IF EXISTS "event_camera_start_time"')
