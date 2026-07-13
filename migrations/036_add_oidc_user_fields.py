"""Peewee migrations -- 036_add_oidc_user_fields.py.

Add optional external_id and email columns to the user table and drop the
NOT NULL constraint on password_hash so users authenticated via OIDC (which
do not have a local password) can be auto-provisioned.
"""

import peewee as pw

SQL = pw.SQL


def migrate(migrator, database, fake=False, **kwargs):
    # SQLite cannot ALTER an existing column, so drop NOT NULL by rebuilding
    # the table. peewee-migrate's change_fields does the round-trip safely.
    migrator.change_fields(
        "user",
        password_hash=pw.CharField(null=True, max_length=120),
    )
    migrator.sql(
        """
        ALTER TABLE user ADD COLUMN external_id VARCHAR(255) NULL
        """
    )
    migrator.sql(
        """
        ALTER TABLE user ADD COLUMN email VARCHAR(255) NULL
        """
    )
    migrator.sql(
        """
        CREATE UNIQUE INDEX IF NOT EXISTS user_external_id ON user (external_id)
        """
    )


def rollback(migrator, database, fake=False, **kwargs):
    migrator.sql("DROP INDEX IF EXISTS user_external_id")
    migrator.sql("ALTER TABLE user DROP COLUMN email")
    migrator.sql("ALTER TABLE user DROP COLUMN external_id")
    migrator.change_fields(
        "user",
        password_hash=pw.CharField(null=False, max_length=120),
    )
