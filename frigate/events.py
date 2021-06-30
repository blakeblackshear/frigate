import datetime
import json
import logging
import os
import queue
import subprocess as sp
import threading
import time
from collections import defaultdict
from pathlib import Path

import psutil
import shutil

from frigate.config import FrigateConfig
from frigate.const import RECORD_DIR, CLIPS_DIR, CACHE_DIR
from frigate.models import Event

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

        # if there are required zones and there is no overlap
        required_zones = self.config.cameras[camera].clips.required_zones
        if len(required_zones) > 0 and not set(event_data["entered_zones"]) & set(
            required_zones
        ):
            logger.debug(
                f"Not creating clip for {event_data['id']} because it did not enter required zones"
            )
            return False

        return True

    def refresh_cache(self):
        cached_files = os.listdir(CACHE_DIR)

        files_in_use = []
        for process in psutil.process_iter():
            try:
                if process.name() != "ffmpeg":
                    continue

                flist = process.open_files()
                if flist:
                    for nt in flist:
                        if nt.path.startswith(CACHE_DIR):
                            files_in_use.append(nt.path.split("/")[-1])
            except:
                continue

        for f in cached_files:
            if f in files_in_use or f in self.cached_clips:
                continue

            basename = os.path.splitext(f)[0]
            camera, date = basename.rsplit("-", maxsplit=1)
            start_time = datetime.datetime.strptime(date, "%Y%m%d%H%M%S")

            ffprobe_cmd = [
                "ffprobe",
                "-v",
                "error",
                "-show_entries",
                "format=duration",
                "-of",
                "default=noprint_wrappers=1:nokey=1",
                f"{os.path.join(CACHE_DIR, f)}",
            ]
            p = sp.run(ffprobe_cmd, capture_output=True)
            if p.returncode == 0:
                duration = float(p.stdout.decode().strip())
            else:
                logger.info(f"bad file: {f}")
                os.remove(os.path.join(CACHE_DIR, f))
                continue

            self.cached_clips[f] = {
                "path": f,
                "camera": camera,
                "start_time": start_time.timestamp(),
                "duration": duration,
            }

        if len(self.events_in_process) > 0:
            earliest_event = min(
                self.events_in_process.values(), key=lambda x: x["start_time"]
            )["start_time"]
        else:
            earliest_event = datetime.datetime.now().timestamp()

        # if the earliest event is more tha max seconds ago, cap it
        max_seconds = self.config.clips.max_seconds
        earliest_event = max(
            earliest_event,
            datetime.datetime.now().timestamp() - self.config.clips.max_seconds,
        )

        for f, data in list(self.cached_clips.items()):
            if earliest_event - 90 > data["start_time"] + data["duration"]:
                del self.cached_clips[f]
                logger.debug(f"Cleaning up cached file {f}")
                os.remove(os.path.join(CACHE_DIR, f))

        # if we are still using more than 90% of the cache, proactively cleanup
        cache_usage = shutil.disk_usage("/tmp/cache")
        while (
            cache_usage.used / cache_usage.total > 0.9
            and cache_usage.free < 200000000
            and len(self.cached_clips) > 0
        ):
            logger.warning("More than 90% of the cache is used.")
            logger.warning(
                "Consider increasing space available at /tmp/cache or reducing max_seconds in your clips config."
            )
            logger.warning("Proactively cleaning up the cache...")
            oldest_clip = min(self.cached_clips.values(), key=lambda x: x["start_time"])
            del self.cached_clips[oldest_clip["path"]]
            os.remove(os.path.join(CACHE_DIR, oldest_clip["path"]))
            cache_usage = shutil.disk_usage("/tmp/cache")

    def create_clip(self, camera, event_data, pre_capture, post_capture):
        # get all clips from the camera with the event sorted
        sorted_clips = sorted(
            [c for c in self.cached_clips.values() if c["camera"] == camera],
            key=lambda i: i["start_time"],
        )

        # if there are no clips in the cache or we are still waiting on a needed file check every 5 seconds
        wait_count = 0
        while (
            len(sorted_clips) == 0
            or sorted_clips[-1]["start_time"] + sorted_clips[-1]["duration"]
            < event_data["end_time"] + post_capture
        ):
            if wait_count > 4:
                logger.warning(
                    f"Unable to create clip for {camera} and event {event_data['id']}. There were no cache files for this event."
                )
                return False
            logger.debug(f"No cache clips for {camera}. Waiting...")
            time.sleep(5)
            self.refresh_cache()
            # get all clips from the camera with the event sorted
            sorted_clips = sorted(
                [c for c in self.cached_clips.values() if c["camera"] == camera],
                key=lambda i: i["start_time"],
            )
            wait_count += 1

        playlist_start = event_data["start_time"] - pre_capture
        playlist_end = event_data["end_time"] + post_capture
        playlist_lines = []
        for clip in sorted_clips:
            # clip ends before playlist start time, skip
            if clip["start_time"] + clip["duration"] < playlist_start:
                continue
            # clip starts after playlist ends, finish
            if clip["start_time"] > playlist_end:
                break
            playlist_lines.append(f"file '{os.path.join(CACHE_DIR,clip['path'])}'")
            # if this is the starting clip, add an inpoint
            if clip["start_time"] < playlist_start:
                playlist_lines.append(
                    f"inpoint {int(playlist_start-clip['start_time'])}"
                )
            # if this is the ending clip, add an outpoint
            if clip["start_time"] + clip["duration"] > playlist_end:
                playlist_lines.append(
                    f"outpoint {int(playlist_end-clip['start_time'])}"
                )

        clip_name = f"{camera}-{event_data['id']}"
        ffmpeg_cmd = [
            "ffmpeg",
            "-y",
            "-protocol_whitelist",
            "pipe,file",
            "-f",
            "concat",
            "-safe",
            "0",
            "-i",
            "-",
            "-c",
            "copy",
            "-movflags",
            "+faststart",
            f"{os.path.join(CLIPS_DIR, clip_name)}.mp4",
        ]

        p = sp.run(
            ffmpeg_cmd,
            input="\n".join(playlist_lines),
            encoding="ascii",
            capture_output=True,
        )
        if p.returncode != 0:
            logger.error(p.stderr)
            return False
        return True

    def run(self):
        while not self.stop_event.is_set():
            try:
                event_type, camera, event_data = self.event_queue.get(timeout=10)
            except queue.Empty:
                if not self.stop_event.is_set():
                    self.refresh_cache()
                continue

            logger.debug(f"Event received: {event_type} {camera} {event_data['id']}")
            self.refresh_cache()

            if event_type == "start":
                self.events_in_process[event_data["id"]] = event_data

            if event_type == "end":
                clips_config = self.config.cameras[camera].clips

                clip_created = False
                if self.should_create_clip(camera, event_data):
                    if clips_config.enabled and (
                        clips_config.objects is None
                        or event_data["label"] in clips_config.objects
                    ):
                        clip_created = self.create_clip(
                            camera,
                            event_data,
                            clips_config.pre_capture,
                            clips_config.post_capture,
                        )

                if clip_created or event_data["has_snapshot"]:
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
                        has_clip=clip_created,
                        has_snapshot=event_data["has_snapshot"],
                    )
                del self.events_in_process[event_data["id"]]
                self.event_processed_queue.put((event_data["id"], camera, clip_created))

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
            retain_config = self.config.clips.retain
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
                retain_config = camera.clips.retain
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
