"""Cleanup events based on configured retention."""

import datetime
import logging
import os
import threading
from multiprocessing.synchronize import Event as MpEvent
from pathlib import Path
from typing import Any

from frigate.config import FrigateConfig
from frigate.const import CLIPS_DIR
from frigate.db.sqlitevecq import SqliteVecQueueDatabase
from frigate.models import Event, Timeline
from frigate.util.file import delete_event_snapshot, delete_event_thumbnail

logger = logging.getLogger(__name__)


CHUNK_SIZE = 50


class EventCleanup(threading.Thread):
    def __init__(
        self, config: FrigateConfig, stop_event: MpEvent, db: SqliteVecQueueDatabase
    ):
        super().__init__(name="event_cleanup")
        self.config = config
        self.stop_event = stop_event
        self.db = db
        self.camera_keys = list(self.config.cameras.keys())
        self.removed_camera_labels: list[str] = None
        self.camera_labels: dict[str, dict[str, Any]] = {}

    def get_removed_camera_labels(self) -> list[Event]:
        """Get a list of distinct labels for removed cameras."""
        if self.removed_camera_labels is None:
            self.removed_camera_labels = list(
                Event.select(Event.label)
                .where(Event.camera.not_in(self.camera_keys))
                .distinct()
                .execute()
            )

        return self.removed_camera_labels

    def get_camera_labels(self, camera: str) -> list[Event]:
        """Get a list of distinct labels for each camera, updating once a day."""
        if (
            self.camera_labels.get(camera) is None
            or self.camera_labels[camera]["last_update"]
            < (datetime.datetime.now() - datetime.timedelta(days=1)).timestamp()
        ):
            self.camera_labels[camera] = {
                "last_update": datetime.datetime.now().timestamp(),
                "labels": list(
                    Event.select(Event.label)
                    .where(Event.camera == camera)
                    .distinct()
                    .execute()
                ),
            }

        return self.camera_labels[camera]["labels"]

    def expire_snapshots(self) -> list[str]:
        ## Expire events from unlisted cameras based on the global config
        retain_config = self.config.snapshots.retain
        update_params = {"has_snapshot": False}

        distinct_labels = self.get_removed_camera_labels()

        ## Expire events from cameras no longer in the config
        # loop over object types in db
        for event in distinct_labels:
            # get expiration time for this label
            expire_days = retain_config.objects.get(event.label, retain_config.default)

            expire_after = (
                datetime.datetime.now() - datetime.timedelta(days=expire_days)
            ).timestamp()
            # grab all events after specific time
            expired_events: list[Event] = (
                Event.select(
                    Event.id,
                    Event.camera,
                    Event.thumbnail,
                )
                .where(
                    Event.camera.not_in(self.camera_keys),
                    Event.start_time < expire_after,
                    Event.label == event.label,
                    Event.retain_indefinitely == False,
                )
                .namedtuples()
                .iterator()
            )
            logger.debug(f"{len(list(expired_events))} events can be expired")

            # delete the media from disk
            for expired in expired_events:
                deleted = delete_event_snapshot(expired)

                if not deleted:
                    logger.warning(
                        f"Unable to delete event images for {expired.camera}: {expired.id}"
                    )

            # update the clips attribute for the db entry
            query = Event.select(Event.id).where(
                Event.camera.not_in(self.camera_keys),
                Event.start_time < expire_after,
                Event.label == event.label,
                Event.retain_indefinitely == False,
            )

            events_to_update = []

            for event in query.iterator():
                events_to_update.append(event.id)
                if len(events_to_update) >= CHUNK_SIZE:
                    logger.debug(
                        f"Updating {update_params} for {len(events_to_update)} events"
                    )
                    Event.update(update_params).where(
                        Event.id << events_to_update
                    ).execute()
                    events_to_update = []

            # Update any remaining events
            if events_to_update:
                logger.debug(
                    f"Updating clips/snapshots attribute for {len(events_to_update)} events"
                )
                Event.update(update_params).where(
                    Event.id << events_to_update
                ).execute()

        events_to_update = []

        ## Expire events from cameras based on the camera config
        for name, camera in self.config.cameras.items():
            retain_config = camera.snapshots.retain

            # get distinct objects in database for this camera
            distinct_labels = self.get_camera_labels(name)

            # loop over object types in db
            for event in distinct_labels:
                # get expiration time for this label
                expire_days = retain_config.objects.get(
                    event.label, retain_config.default
                )

                expire_after = (
                    datetime.datetime.now() - datetime.timedelta(days=expire_days)
                ).timestamp()
                # grab all events after specific time
                expired_events = (
                    Event.select(
                        Event.id,
                        Event.camera,
                        Event.thumbnail,
                    )
                    .where(
                        Event.camera == name,
                        Event.start_time < expire_after,
                        Event.label == event.label,
                        Event.retain_indefinitely == False,
                    )
                    .namedtuples()
                    .iterator()
                )

                # delete the grabbed clips from disk
                # only snapshots are stored in /clips
                # so no need to delete mp4 files
                for event in expired_events:
                    events_to_update.append(event.id)
                    deleted = delete_event_snapshot(event)

                    if not deleted:
                        logger.warning(
                            f"Unable to delete event images for {event.camera}: {event.id}"
                        )

        # update the clips attribute for the db entry
        for i in range(0, len(events_to_update), CHUNK_SIZE):
            batch = events_to_update[i : i + CHUNK_SIZE]
            logger.debug(f"Updating {update_params} for {len(batch)} events")
            Event.update(update_params).where(Event.id << batch).execute()

        return events_to_update

    def expire_clips(self) -> list[str]:
        ## Expire events from unlisted cameras based on the global config
        expire_days = max(
            self.config.record.alerts.retain.days,
            self.config.record.detections.retain.days,
        )
        file_extension = None  # mp4 clips are no longer stored in /clips
        update_params = {"has_clip": False}

        # get expiration time for this label

        expire_after = (
            datetime.datetime.now() - datetime.timedelta(days=expire_days)
        ).timestamp()
        # grab all events after specific time
        expired_events: list[Event] = (
            Event.select(
                Event.id,
                Event.camera,
            )
            .where(
                Event.camera.not_in(self.camera_keys),
                Event.start_time < expire_after,
                Event.retain_indefinitely == False,
            )
            .namedtuples()
            .iterator()
        )
        logger.debug(f"{len(list(expired_events))} events can be expired")
        # delete the media from disk
        for expired in expired_events:
            media_name = f"{expired.camera}-{expired.id}"
            media_path = Path(f"{os.path.join(CLIPS_DIR, media_name)}.{file_extension}")

            try:
                media_path.unlink(missing_ok=True)
                if file_extension == "jpg":
                    media_path = Path(
                        f"{os.path.join(CLIPS_DIR, media_name)}-clean.webp"
                    )
                    media_path.unlink(missing_ok=True)
                    # Also delete clean.png (legacy) for backward compatibility
                    media_path = Path(
                        f"{os.path.join(CLIPS_DIR, media_name)}-clean.png"
                    )
                    media_path.unlink(missing_ok=True)
            except OSError as e:
                logger.warning(f"Unable to delete event images: {e}")

        # update the clips attribute for the db entry
        query = Event.select(Event.id).where(
            Event.camera.not_in(self.camera_keys),
            Event.start_time < expire_after,
            Event.retain_indefinitely == False,
        )

        events_to_update = []

        for event in query.iterator():
            events_to_update.append(event.id)

            if len(events_to_update) >= CHUNK_SIZE:
                logger.debug(
                    f"Updating {update_params} for {len(events_to_update)} events"
                )
                Event.update(update_params).where(
                    Event.id << events_to_update
                ).execute()
                events_to_update = []

        # Update any remaining events
        if events_to_update:
            logger.debug(
                f"Updating clips/snapshots attribute for {len(events_to_update)} events"
            )
            Event.update(update_params).where(Event.id << events_to_update).execute()

        events_to_update = []
        now = datetime.datetime.now()

        ## Expire events from cameras based on the camera config
        for name, camera in self.config.cameras.items():
            expire_days = max(
                camera.record.alerts.retain.days,
                camera.record.detections.retain.days,
            )
            alert_expire_date = (
                now - datetime.timedelta(days=camera.record.alerts.retain.days)
            ).timestamp()
            detection_expire_date = (
                now - datetime.timedelta(days=camera.record.detections.retain.days)
            ).timestamp()
            # grab all events after specific time
            expired_events = (
                Event.select(
                    Event.id,
                    Event.camera,
                )
                .where(
                    Event.camera == name,
                    Event.retain_indefinitely == False,
                    (
                        (
                            (Event.data["max_severity"] != "detection")
                            | (Event.data["max_severity"].is_null())
                        )
                        & (Event.end_time < alert_expire_date)
                    )
                    | (
                        (Event.data["max_severity"] == "detection")
                        & (Event.end_time < detection_expire_date)
                    ),
                )
                .namedtuples()
                .iterator()
            )

            # delete the grabbed clips from disk
            # only snapshots are stored in /clips
            # so no need to delete mp4 files
            for event in expired_events:
                events_to_update.append(event.id)

        # update the clips attribute for the db entry
        for i in range(0, len(events_to_update), CHUNK_SIZE):
            batch = events_to_update[i : i + CHUNK_SIZE]
            logger.debug(f"Updating {update_params} for {len(batch)} events")
            Event.update(update_params).where(Event.id << batch).execute()

        return events_to_update

    def run(self) -> None:
        # only expire events every 5 minutes
        while not self.stop_event.wait(300):
            events_with_expired_clips = self.expire_clips()

            # delete timeline entries for events that have expired recordings
            # delete up to 100,000 at a time
            max_deletes = 100000
            deleted_events_list = list(events_with_expired_clips)
            for i in range(0, len(deleted_events_list), max_deletes):
                Timeline.delete().where(
                    Timeline.source_id << deleted_events_list[i : i + max_deletes]
                ).execute()

            self.expire_snapshots()

            # drop events from db where has_clip and has_snapshot are false
            events = (
                Event.select()
                .where(Event.has_clip == False, Event.has_snapshot == False)
                .iterator()
            )
            events_to_delete: list[Event] = [e for e in events]

            for e in events_to_delete:
                delete_event_thumbnail(e)

            logger.debug(f"Found {len(events_to_delete)} events that can be expired")
            if len(events_to_delete) > 0:
                ids_to_delete = [e.id for e in events_to_delete]
                for i in range(0, len(ids_to_delete), CHUNK_SIZE):
                    chunk = ids_to_delete[i : i + CHUNK_SIZE]
                    logger.debug(f"Deleting {len(chunk)} events from the database")
                    Event.delete().where(Event.id << chunk).execute()

                    if self.config.semantic_search.enabled:
                        self.db.delete_embeddings_description(event_ids=chunk)
                        self.db.delete_embeddings_thumbnail(event_ids=chunk)
                        logger.debug(f"Deleted {len(ids_to_delete)} embeddings")

        logger.info("Exiting event cleanup...")
