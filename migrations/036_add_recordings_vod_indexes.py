"""Peewee migrations -- 036_add_recordings_vod_indexes.py.

Add indexes to the recordings table optimized for the VOD overlap query:
  WHERE camera = ? AND end_time > ? AND start_time < ?
  ORDER BY start_time ASC

The composite index (camera, start_time, end_time) covers the full predicate
and ordering in a single B-tree walk. The (camera, end_time) index gives the
planner an alternative access path for the end_time > ? filter.
"""

import peewee as pw

SQL = pw.SQL


def migrate(migrator, database, fake=False, **kwargs):
    migrator.sql(
        'CREATE INDEX IF NOT EXISTS "idx_recordings_camera_start_end" '
        'ON "recordings" ("camera", "start_time", "end_time")'
    )
    migrator.sql(
        'CREATE INDEX IF NOT EXISTS "idx_recordings_camera_end" '
        'ON "recordings" ("camera", "end_time")'
    )


def rollback(migrator, database, fake=False, **kwargs):
    migrator.sql('DROP INDEX IF EXISTS "idx_recordings_camera_start_end"')
    migrator.sql('DROP INDEX IF EXISTS "idx_recordings_camera_end"')
