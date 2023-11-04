"""Recordings Utilities."""

import datetime
import logging
import os

from peewee import DatabaseError, chunked

from frigate.const import RECORD_DIR
from frigate.models import Recordings, RecordingsToDelete

logger = logging.getLogger(__name__)


def remove_empty_directories(directory: str) -> None:
    # list all directories recursively and sort them by path,
    # longest first
    paths = sorted(
        [x[0] for x in os.walk(directory)],
        key=lambda p: len(str(p)),
        reverse=True,
    )
    for path in paths:
        # don't delete the parent
        if path == directory:
            continue
        if len(os.listdir(path)) == 0:
            os.rmdir(path)


def sync_recordings(limited: bool) -> None:
    """Check the db for stale recordings entries that don't exist in the filesystem."""

    def delete_db_entries_without_file(files_on_disk: list[str]) -> bool:
        """Delete db entries where file was deleted outside of frigate."""

        if limited:
            recordings = Recordings.select(Recordings.id, Recordings.path).where(
                Recordings.start_time
                >= (datetime.datetime.now() - datetime.timedelta(hours=36)).timestamp()
            )
        else:
            # get all recordings in the db
            recordings = Recordings.select(Recordings.id, Recordings.path)

        # Use pagination to process records in chunks
        page_size = 1000
        num_pages = (recordings.count() + page_size - 1) // page_size
        recordings_to_delete = set()

        for page in range(num_pages):
            for recording in recordings.paginate(page, page_size):
                if recording.path not in files_on_disk:
                    recordings_to_delete.add(recording.id)

        # convert back to list of dictionaries for insertion
        recordings_to_delete = [
            {"id": recording_id} for recording_id in recordings_to_delete
        ]

        if float(len(recordings_to_delete)) / max(1, recordings.count()) > 0.5:
            logger.debug(
                f"Deleting {(float(len(recordings_to_delete)) / recordings.count()):2f}% of recordings DB entries, could be due to configuration error. Aborting..."
            )
            return False

        logger.debug(
            f"Deleting {len(recordings_to_delete)} recording DB entries with missing files"
        )

        # create a temporary table for deletion
        RecordingsToDelete.create_table(temporary=True)

        # insert ids to the temporary table
        max_inserts = 1000
        for batch in chunked(recordings_to_delete, max_inserts):
            RecordingsToDelete.insert_many(batch).execute()

        try:
            # delete records in the main table that exist in the temporary table
            query = Recordings.delete().where(
                Recordings.id.in_(RecordingsToDelete.select(RecordingsToDelete.id))
            )
            query.execute()
        except DatabaseError as e:
            logger.error(f"Database error during recordings db cleanup: {e}")

        return True

    def delete_files_without_db_entry(files_on_disk: list[str]):
        """Delete files where file is not inside frigate db."""
        files_to_delete = []

        for file in files_on_disk:
            if not Recordings.select().where(Recordings.path == file).exists():
                files_to_delete.append(file)

        if float(len(files_to_delete)) / max(1, len(files_on_disk)) > 0.5:
            logger.debug(
                f"Deleting {(float(len(files_to_delete)) / len(files_on_disk)):2f}% of recordings DB entries, could be due to configuration error. Aborting..."
            )
            return

        for file in files_to_delete:
            os.unlink(file)

    logger.debug("Start sync recordings.")

    if limited:
        # get recording files from last 36 hours
        hour_check = (
            datetime.datetime.now().astimezone(datetime.timezone.utc)
            - datetime.timedelta(hours=36)
        ).strftime("%Y-%m-%d/%H")
        files_on_disk = {
            os.path.join(root, file)
            for root, _, files in os.walk(RECORD_DIR)
            for file in files
            if file > hour_check
        }
    else:
        # get all recordings files on disk and put them in a set
        files_on_disk = {
            os.path.join(root, file)
            for root, _, files in os.walk(RECORD_DIR)
            for file in files
        }

    db_success = delete_db_entries_without_file(files_on_disk)

    # only try to cleanup files if db cleanup was successful
    if db_success:
        delete_files_without_db_entry(files_on_disk)

    logger.debug("End sync recordings.")
