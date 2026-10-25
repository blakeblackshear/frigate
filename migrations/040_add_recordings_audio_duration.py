"""Peewee migrations -- 040_add_recordings_audio_duration.py."""

import peewee as pw

SQL = pw.SQL


def migrate(migrator, database, fake=False, **kwargs):
    # nullable so legacy rows stay NULL, meaning unknown
    migrator.sql('ALTER TABLE "recordings" ADD COLUMN "audio_duration" REAL')


def rollback(migrator, database, fake=False, **kwargs):
    pass
