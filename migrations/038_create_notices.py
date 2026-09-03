"""Peewee migrations -- 038_create_notices.py.

Creates the two notice tables: active notices, and per-kind lifetime counts.
"""

import peewee as pw

SQL = pw.SQL


def migrate(migrator, database, fake=False, **kwargs):
    migrator.sql(
        'CREATE TABLE IF NOT EXISTS "notice" ('
        '"id" VARCHAR(150) NOT NULL PRIMARY KEY, '
        '"kind" VARCHAR(50) NOT NULL, '
        '"scope" VARCHAR(100), '
        '"params" TEXT NOT NULL, '
        '"first_seen" DATETIME NOT NULL, '
        '"last_seen" DATETIME NOT NULL, '
        '"count" INTEGER NOT NULL, '
        '"dismissed_at" DATETIME)'
    )
    migrator.sql('CREATE INDEX IF NOT EXISTS "notice_kind" ON "notice" ("kind")')
    migrator.sql(
        'CREATE TABLE IF NOT EXISTS "noticestats" ('
        '"kind" VARCHAR(50) NOT NULL PRIMARY KEY, '
        '"occurrences" INTEGER NOT NULL, '
        '"dismissals" INTEGER NOT NULL, '
        '"first_seen" DATETIME NOT NULL, '
        '"last_seen" DATETIME NOT NULL, '
        '"reported_occurrences" INTEGER NOT NULL DEFAULT 0, '
        '"reported_dismissals" INTEGER NOT NULL DEFAULT 0)'
    )


def rollback(migrator, database, fake=False, **kwargs):
    migrator.sql('DROP TABLE IF EXISTS "notice"')
    migrator.sql('DROP TABLE IF EXISTS "noticestats"')
