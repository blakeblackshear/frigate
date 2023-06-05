"""Cleanup events based on configured retention."""

import datetime
import logging
import os
import threading
from multiprocessing.synchronize import Event as MpEvent
from pathlib import Path

from frigate.config import FrigateConfig
from frigate.const import CLIPS_DIR
from frigate.models import Event

logger = logging.getLogger(__name__)


class EventCleanup(threading.Thread):
    def __init__(self, config: FrigateConfig, stop_event: MpEvent):
        threading.Thread.__init__(self)
        self.name = "event_cleanup"
        self.config = config
        self.stop_event = stop_event
        self.camera_keys = list(self.config.cameras.keys())

    def expire(self, media_type: str) -> None:
        # TODO: Refactor media_type to enum
        ## Expire events from unlisted cameras based on the global config
        if media_type == "clips":
            retain_config = self.config.record.events.retain
            file_extension = "mp4"
            update_params = {"has_clip": False}
        else:
            retain_config = self.config.snapshots.retain
            file_extension = "jpg"
            update_params = {"has_snapshot": False}

        distinct_labels = (
            Event.select(Event.label)
            .where(Event.camera.not_in(self.camera_keys))
            .distinct()
        )

        # loop over object types in db
        for event in distinct_labels:
            # get expiration time for this label
            expire_days = retain_config.objects.get(event.label, retain_config.default)
            expire_after = (
                datetime.datetime.now() - datetime.timedelta(days=expire_days)
            ).timestamp()
            # grab all events after specific time
            expired_events = Event.select().where(
                Event.camera.not_in(self.camera_keys),
                Event.start_time < expire_after,
                Event.label == event.label,
                Event.retain_indefinitely is False,
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
                Event.retain_indefinitely is False,
            )
            update_query.execute()

        ## Expire events from cameras based on the camera config
        for name, camera in self.config.cameras.items():
            if media_type == "clips":
                retain_config = camera.record.events.retain
            else:
                retain_config = camera.snapshots.retain
            # get distinct objects in database for this camera
            distinct_labels = (
                Event.select(Event.label).where(Event.camera == name).distinct()
            )

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
                expired_events = Event.select().where(
                    Event.camera == name,
                    Event.start_time < expire_after,
                    Event.label == event.label,
                    Event.retain_indefinitely is False,
                )
                # delete the grabbed clips from disk
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
                    Event.camera == name,
                    Event.start_time < expire_after,
                    Event.label == event.label,
                    Event.retain_indefinitely is False,
                )
                update_query.execute()

    def purge_duplicates(self) -> None:
        duplicate_query = """with grouped_events as (
          select id,
            label,
            camera,
            has_snapshot,
            has_clip,
            row_number() over (
              partition by label, camera, round(start_time/5,0)*5
              order by end_time-start_time desc
            ) as copy_number
          from event
        )

        select distinct id, camera, has_snapshot, has_clip from grouped_events
        where copy_number > 1;"""

        duplicate_events = Event.raw(duplicate_query)
        for event in duplicate_events:
            logger.debug(f"Removing duplicate: {event.id}")
            media_name = f"{event.camera}-{event.id}"
            media_path = Path(f"{os.path.join(CLIPS_DIR, media_name)}.jpg")
            media_path.unlink(missing_ok=True)
            media_path = Path(f"{os.path.join(CLIPS_DIR, media_name)}-clean.png")
            media_path.unlink(missing_ok=True)
            media_path = Path(f"{os.path.join(CLIPS_DIR, media_name)}.mp4")
            media_path.unlink(missing_ok=True)

        (
            Event.delete()
            .where(Event.id << [event.id for event in duplicate_events])
            .execute()
        )

    def run(self) -> None:
        # only expire events every 5 minutes
        while not self.stop_event.wait(300):
            self.expire("clips")
            self.expire("snapshots")
            self.purge_duplicates()

            # drop events from db where has_clip and has_snapshot are false
            delete_query = Event.delete().where(
                Event.has_clip is False, Event.has_snapshot is False
            )
            delete_query.execute()

        logger.info("Exiting event cleanup...")
