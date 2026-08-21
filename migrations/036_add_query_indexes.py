"""Add indexes for time-ordered API queries."""

INDEXES = {
    "event_camera_start_time": '"event" ("camera", "start_time" DESC)',
    "review_segment_camera_start_time_end_time": (
        '"reviewsegment" ("camera", "start_time" DESC, "end_time" DESC, '
        '"severity", "id")'
    ),
    "review_segment_severity_start_time_camera": (
        '"reviewsegment" ("severity", "start_time" DESC, "camera")'
    ),
    "review_segment_camera_severity_start_time": (
        '"reviewsegment" ("camera", "severity", "start_time" DESC)'
    ),
    "timeline_timestamp": '"timeline" ("timestamp" DESC)',
    "timeline_camera_timestamp": '"timeline" ("camera", "timestamp" DESC)',
    "previews_camera_start_time_end_time": (
        '"previews" ("camera", "start_time" DESC, "end_time" DESC)'
    ),
    "previews_start_time_end_time_camera": (
        '"previews" ("start_time" DESC, "end_time" DESC, "camera")'
    ),
}

ANALYZE_TABLES = (
    "event",
    "reviewsegment",
    "timeline",
    "previews",
    "recordings",
    "userreviewstatus",
)


def migrate(migrator, database, fake=False, **kwargs):
    for name, definition in INDEXES.items():
        migrator.sql(f'CREATE INDEX IF NOT EXISTS "{name}" ON {definition}')

    # Help SQLite choose a global time index when the camera filter includes
    # nearly every camera instead of scanning each camera index and sorting.
    for table in ANALYZE_TABLES:
        migrator.sql(f'ANALYZE "{table}"')


def rollback(migrator, database, fake=False, **kwargs):
    for name in reversed(INDEXES):
        migrator.sql(f'DROP INDEX IF EXISTS "{name}"')

    for table in ANALYZE_TABLES:
        migrator.sql(f'ANALYZE "{table}"')
