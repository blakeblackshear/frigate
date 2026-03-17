"""Peewee migrations -- 036_add_recording_variants.py."""

import peewee as pw

from frigate.models import Recordings

SQL = pw.SQL


def migrate(migrator, database, fake=False, **kwargs):
    existing_columns = {
        row[1] for row in database.execute_sql('PRAGMA table_info("recordings")').fetchall()
    }

    fields_to_add = {}
    if "variant" not in existing_columns:
        fields_to_add["variant"] = pw.CharField(default="main", max_length=20)
    if "codec_name" not in existing_columns:
        fields_to_add["codec_name"] = pw.CharField(null=True, max_length=32)
    if "width" not in existing_columns:
        fields_to_add["width"] = pw.IntegerField(null=True)
    if "height" not in existing_columns:
        fields_to_add["height"] = pw.IntegerField(null=True)
    if "bitrate" not in existing_columns:
        fields_to_add["bitrate"] = pw.IntegerField(null=True)

    if fields_to_add:
        migrator.add_fields(Recordings, **fields_to_add)

    migrator.sql(
        'CREATE INDEX IF NOT EXISTS "recordings_camera_variant_start_time_end_time" ON "recordings" ("camera", "variant", "start_time" DESC, "end_time" DESC)'
    )


def rollback(migrator, database, fake=False, **kwargs):
    migrator.remove_fields(
        Recordings, ["variant", "codec_name", "width", "height", "bitrate"]
    )
