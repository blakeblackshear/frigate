import datetime
import logging
import os
import queue
import threading
import time
from pathlib import Path

from frigate.config import FrigateConfig, RecordConfig
from frigate.const import CLIPS_DIR
from frigate.models import Event, Recordings

from peewee import fn

logger = logging.getLogger(__name__)


class EventProcessor(threading.Thread):
    def __init__(
        self, config, camera_processes, event_queue, event_processed_queue, stop_event
    ):
        threading.Thread.__init__(self)
        self.name = "event_processor"
        self.config = config
        self.camera_processes = camera_processes
        self.cached_clips = {}
        self.event_queue = event_queue
        self.event_processed_queue = event_processed_queue
        self.events_in_process = {}
        self.stop_event = stop_event

    def should_create_clip(self, camera, event_data):
        if event_data["false_positive"]:
            return False

        record_config: RecordConfig = self.config.cameras[camera].record

        # Recording is disabled
        if not record_config.enabled:
            return False

        # If there are required zones and there is no overlap
        required_zones = record_config.events.required_zones
        if len(required_zones) > 0 and not set(event_data["entered_zones"]) & set(
            required_zones
        ):
            logger.debug(
                f"Not creating clip for {event_data['id']} because it did not enter required zones"
            )
            return False

        # If the required objects are not present
        if (
            record_config.events.objects is not None
            and event_data["label"] not in record_config.events.objects
        ):
            logger.debug(
                f"Not creating clip for {event_data['id']} because it did not contain required objects"
            )
            return False

        return True

    def run(self):
        while not self.stop_event.is_set():
            try:
                event_type, camera, event_data = self.event_queue.get(timeout=10)
            except queue.Empty:
                continue

            logger.debug(f"Event received: {event_type} {camera} {event_data['id']}")

            if event_type == "start":
                self.events_in_process[event_data["id"]] = event_data

            if event_type == "end":
                record_config: RecordConfig = self.config.cameras[camera].record

                has_clip = self.should_create_clip(camera, event_data)

                if has_clip or event_data["has_snapshot"]:
                    Event.create(
                        id=event_data["id"],
                        label=event_data["label"],
                        camera=camera,
                        start_time=event_data["start_time"],
                        end_time=event_data["end_time"],
                        top_score=event_data["top_score"],
                        false_positive=event_data["false_positive"],
                        zones=list(event_data["entered_zones"]),
                        thumbnail=event_data["thumbnail"],
                        has_clip=has_clip,
                        has_snapshot=event_data["has_snapshot"],
                    )

                del self.events_in_process[event_data["id"]]
                self.event_processed_queue.put((event_data["id"], camera, has_clip))

        logger.info(f"Exiting event processor...")


class EventCleanup(threading.Thread):
    def __init__(self, config: FrigateConfig, stop_event):
        threading.Thread.__init__(self)
        self.name = "event_cleanup"
        self.config = config
        self.stop_event = stop_event
        self.camera_keys = list(self.config.cameras.keys())

    def expire(self, media_type):
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
        for l in distinct_labels:
            # get expiration time for this label
            expire_days = retain_config.objects.get(l.label, retain_config.default)
            expire_after = (
                datetime.datetime.now() - datetime.timedelta(days=expire_days)
            ).timestamp()
            # grab all events after specific time
            expired_events = Event.select().where(
                Event.camera.not_in(self.camera_keys),
                Event.start_time < expire_after,
                Event.label == l.label,
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
                Event.label == l.label,
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
            for l in distinct_labels:
                # get expiration time for this label
                expire_days = retain_config.objects.get(l.label, retain_config.default)
                expire_after = (
                    datetime.datetime.now() - datetime.timedelta(days=expire_days)
                ).timestamp()
                # grab all events after specific time
                expired_events = Event.select().where(
                    Event.camera == name,
                    Event.start_time < expire_after,
                    Event.label == l.label,
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
                    Event.label == l.label,
                )
                update_query.execute()

    def purge_duplicates(self):
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
            if event.has_snapshot:
                media_path = Path(f"{os.path.join(CLIPS_DIR, media_name)}.jpg")
                media_path.unlink(missing_ok=True)
            if event.has_clip:
                media_path = Path(f"{os.path.join(CLIPS_DIR, media_name)}.mp4")
                media_path.unlink(missing_ok=True)

        (
            Event.delete()
            .where(Event.id << [event.id for event in duplicate_events])
            .execute()
        )

    def run(self):
        # only expire events every 5 minutes
        while not self.stop_event.wait(300):
            self.expire("clips")
            self.expire("snapshots")
            self.purge_duplicates()

            # drop events from db where has_clip and has_snapshot are false
            delete_query = Event.delete().where(
                Event.has_clip == False, Event.has_snapshot == False
            )
            delete_query.execute()

        logger.info(f"Exiting event cleanup...")
