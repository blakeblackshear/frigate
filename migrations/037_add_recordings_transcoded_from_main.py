"""Peewee migrations -- 037_add_recordings_transcoded_from_main.py."""

from peewee import OperationalError


def migrate(migrator, database, fake=False, **kwargs):
    try:
        database.execute_sql(
            """
            ALTER TABLE "recordings"
            ADD COLUMN "transcoded_from_main" INTEGER NOT NULL DEFAULT 0
            """
        )
    except OperationalError as exc:
        if "duplicate column name" not in str(exc).lower():
            raise

    database.execute_sql(
        """
        UPDATE recordings
        SET transcoded_from_main = 1
        WHERE variant = 'sub_h264'
           OR (variant = 'sub' AND id LIKE '%-sub')
        """
    )


def rollback(migrator, database, fake=False, **kwargs):
    pass
