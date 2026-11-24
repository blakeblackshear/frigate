"""Peewee migrations -- 041_remove_retain_indefinitely.py."""

import peewee as pw

SQL = pw.SQL


def migrate(migrator, database, fake=False, **kwargs):
    migrator.sql('ALTER TABLE "event" DROP COLUMN "retain_indefinitely"')


def rollback(migrator, database, fake=False, **kwargs):
    migrator.sql(
        'ALTER TABLE "event" ADD COLUMN "retain_indefinitely" INTEGER NOT NULL DEFAULT 0'
    )
