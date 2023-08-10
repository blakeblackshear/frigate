# migrations/019_recordings_to_events.py
from peewee import CharField, CompositeKey, Model

from frigate.models import Recordings, Event


def migrate(migrator, database, fake=False, **kwargs):
    """Write your migrations here."""

    @migrator.create_model
    class RecordingsToEvents(Model):  # type: ignore[misc]
        event_id = CharField(null=False, index=True, max_length=30)
        recording_id = CharField(null=False, index=True, max_length=30)

        class Meta:
            db_table = "recordingstoevents"
            primary_key = CompositeKey("event_id", "recording_id")

    sql = """
    INSERT INTO recordingstoevents (recording_id, event_id)
    SELECT 
        r.id AS recording,
        e.id AS event
    FROM 
        event e
    JOIN 
        recordings r ON e.camera = r.camera
    WHERE 
        r.start_time <= e.end_time 
        AND r.end_time >= e.start_time;
    """
    migrator.sql(sql)


def rollback(migrator, database, fake=False, **kwargs):
    """This function is used to undo the migration, i.e., to drop the RecordingToEvent table."""
    migrator.drop_table("recordingstoevents")
