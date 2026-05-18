"""Peewee migrations -- 036_add_perf_indexes.py.

Adds composite/single-column indexes to speed up the most common queries
issued by the web UI on initial page load:

- event(camera, start_time DESC): /events list filtered by camera + time range
- reviewsegment(camera, start_time DESC): /api/review filtered by camera + time range
- reviewsegment(end_time): supports the end_time > after half of /api/review's range

The existing event(label, start_time DESC) index from migration 027 already
covers /events/explore, so it is intentionally not duplicated here.
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
