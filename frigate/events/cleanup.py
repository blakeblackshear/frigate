"""Cleanup events based on configured retention."""

import datetime
import logging
import os
import threading
from enum import Enum
from multiprocessing.synchronize import Event as MpEvent
from pathlib import Path

from frigate.config import FrigateConfig
from frigate.const import CLIPS_DIR
from frigate.models import Event, Timeline

logger = logging.getLogger(__name__)


class EventCleanupType(str, Enum):
    clips = "clips"
    snapshots = "snapshots"


class EventCleanup(threading.Thread):
    def __init__(self, config: FrigateConfig, stop_event: MpEvent):
        threading.Thread.__init__(self)
        self.name = "event_cleanup"
        self.config = config
        self.stop_event = stop_event
        self.camera_keys = list(self.config.cameras.keys())
        self.removed_camera_labels: list[str] = None
        self.camera_labels: dict[str, dict[str, any]] = {}

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

    def expire(self, media_type: EventCleanupType) -> list[str]:
        ## Expire events from unlisted cameras based on the global config
        if media_type == EventCleanupType.clips:
            retain_config = self.config.record.events.retain
            file_extension = None  # mp4 clips are no longer stored in /clips
            update_params = {"has_clip": False}
        else:
            retain_config = self.config.snapshots.retain
            file_extension = "jpg"
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
            expired_events = Event.select(
                Event.id,
                Event.camera,
            ).where(
                Event.camera.not_in(self.camera_keys),
                Event.start_time < expire_after,
                Event.label == event.label,
                Event.retain_indefinitely == False,
            )
            # delete the media from disk
            for event in expired_events:
                media_name = f"{event.camera}-{event.id}"
                media_path = Path(
                    f"{os.path.join(CLIPS_DIR, media_name)}.{file_extension}"
                )
                media_path.unlink(missing_ok=True)
                if file_extension == "jpg":
                    media_path = Path(
                        f"{os.path.join(CLIPS_DIR, media_name)}-clean.png"
                    )
                    media_path.unlink(missing_ok=True)

            # update the clips attribute for the db entry
            update_query = Event.update(update_params).where(
                Event.camera.not_in(self.camera_keys),
                Event.start_time < expire_after,
                Event.label == event.label,
                Event.retain_indefinitely == False,
            )
            update_query.execute()

        events_to_update = []

        ## Expire events from cameras based on the camera config
        for name, camera in self.config.cameras.items():
            if media_type == EventCleanupType.clips:
                retain_config = camera.record.events.retain
            else:
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
                expired_events = Event.select(
                    Event.id,
                    Event.camera,
                ).where(
                    Event.camera == name,
                    Event.start_time < expire_after,
                    Event.label == event.label,
                    Event.retain_indefinitely == False,
                )

                # delete the grabbed clips from disk
                # only snapshots are stored in /clips
                # so no need to delete mp4 files
                for event in expired_events:
                    events_to_update.append(event.id)

                    if media_type == EventCleanupType.snapshots:
                        media_name = f"{event.camera}-{event.id}"
                        media_path = Path(
                            f"{os.path.join(CLIPS_DIR, media_name)}.{file_extension}"
                        )
                        media_path.unlink(missing_ok=True)
                        media_path = Path(
                            f"{os.path.join(CLIPS_DIR, media_name)}-clean.png"
                        )
                        media_path.unlink(missing_ok=True)

        # update the clips attribute for the db entry
        Event.update(update_params).where(Event.id << events_to_update).execute()
        return events_to_update

    def purge_duplicates(self) -> None:
        duplicate_query = """with grouped_events as (
          select id,
            label,
            camera,
            has_snapshot,
            has_clip,
            end_time,
            row_number() over (
              partition by label, camera, round(start_time/5,0)*5
              order by end_time-start_time desc
            ) as copy_number
          from event
        )

        select distinct id, camera, has_snapshot, has_clip from grouped_events
        where copy_number > 1 and end_time not null;"""

        duplicate_events = Event.raw(duplicate_query)
        for event in duplicate_events:
            logger.debug(f"Removing duplicate: {event.id}")
            media_name = f"{event.camera}-{event.id}"
            media_path = Path(f"{os.path.join(CLIPS_DIR, media_name)}.jpg")
            media_path.unlink(missing_ok=True)
            media_path = Path(f"{os.path.join(CLIPS_DIR, media_name)}-clean.png")
            media_path.unlink(missing_ok=True)

        (
            Event.delete()
            .where(Event.id << [event.id for event in duplicate_events])
            .execute()
        )

    def run(self) -> None:
        # only expire events every 5 minutes
        while not self.stop_event.wait(300):
            events_with_expired_clips = self.expire(EventCleanupType.clips)

            # delete timeline entries for events that have expired recordings
            Timeline.delete().where(
                Timeline.source_id << events_with_expired_clips
            ).execute()

            self.expire(EventCleanupType.snapshots)
            self.purge_duplicates()

            # drop events from db where has_clip and has_snapshot are false
            delete_query = Event.delete().where(
                Event.has_clip == False, Event.has_snapshot == False
            )
            delete_query.execute()

        logger.info("Exiting event cleanup...")
