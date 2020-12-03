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

from frigate.config import FrigateConfig
from frigate.const import RECORD_DIR, CLIPS_DIR, CACHE_DIR
from frigate.models import Event

from peewee import fn

logger = logging.getLogger(__name__)

class EventProcessor(threading.Thread):
    def __init__(self, config, camera_processes, event_queue, event_processed_queue, stop_event):
        threading.Thread.__init__(self)
        self.name = 'event_processor'
        self.config = config
        self.camera_processes = camera_processes
        self.cached_clips = {}
        self.event_queue = event_queue
        self.event_processed_queue = event_processed_queue
        self.events_in_process = {}
        self.stop_event = stop_event
    
    def refresh_cache(self):
        cached_files = os.listdir(CACHE_DIR)

        files_in_use = []
        for process in psutil.process_iter():
            if process.name() != 'ffmpeg':
                continue
            try:
                flist = process.open_files()
                if flist:
                    for nt in flist:
                        if nt.path.startswith(CACHE_DIR):
                            files_in_use.append(nt.path.split('/')[-1])
            except:
                continue

        for f in cached_files:
            if f in files_in_use or f in self.cached_clips:
                continue

            camera = '-'.join(f.split('-')[:-1])
            start_time = datetime.datetime.strptime(f.split('-')[-1].split('.')[0], '%Y%m%d%H%M%S')
        
            ffprobe_cmd = " ".join([
                'ffprobe',
                '-v',
                'error',
                '-show_entries',
                'format=duration',
                '-of',
                'default=noprint_wrappers=1:nokey=1',
                f"{os.path.join(CACHE_DIR,f)}"
            ])
            p = sp.Popen(ffprobe_cmd, stdout=sp.PIPE, shell=True)
            (output, err) = p.communicate()
            p_status = p.wait()
            if p_status == 0:
                duration = float(output.decode('utf-8').strip())
            else:
                logger.info(f"bad file: {f}")
                os.remove(os.path.join(CACHE_DIR,f))
                continue

            self.cached_clips[f] = {
                'path': f,
                'camera': camera,
                'start_time': start_time.timestamp(),
                'duration': duration
            }

        if len(self.events_in_process) > 0:
            earliest_event = min(self.events_in_process.values(), key=lambda x:x['start_time'])['start_time']
        else:
            earliest_event = datetime.datetime.now().timestamp()

        # if the earliest event exceeds the max seconds, cap it
        max_seconds = self.config.save_clips.max_seconds
        if datetime.datetime.now().timestamp()-earliest_event > max_seconds:
            earliest_event = datetime.datetime.now().timestamp()-max_seconds
        
        for f, data in list(self.cached_clips.items()):
            if earliest_event-90 > data['start_time']+data['duration']:
                del self.cached_clips[f]
                os.remove(os.path.join(CACHE_DIR,f))

    def create_clip(self, camera, event_data, pre_capture):
        # get all clips from the camera with the event sorted
        sorted_clips = sorted([c for c in self.cached_clips.values() if c['camera'] == camera], key = lambda i: i['start_time'])

        while sorted_clips[-1]['start_time'] + sorted_clips[-1]['duration'] < event_data['end_time']:
            time.sleep(5)
            self.refresh_cache()
            # get all clips from the camera with the event sorted
            sorted_clips = sorted([c for c in self.cached_clips.values() if c['camera'] == camera], key = lambda i: i['start_time'])
        
        playlist_start = event_data['start_time']-pre_capture
        playlist_end = event_data['end_time']+5
        playlist_lines = []
        for clip in sorted_clips:
            # clip ends before playlist start time, skip
            if clip['start_time']+clip['duration'] < playlist_start:
                continue
            # clip starts after playlist ends, finish
            if clip['start_time'] > playlist_end:
                break
            playlist_lines.append(f"file '{os.path.join(CACHE_DIR,clip['path'])}'")
            # if this is the starting clip, add an inpoint
            if clip['start_time'] < playlist_start:
                playlist_lines.append(f"inpoint {int(playlist_start-clip['start_time'])}")
            # if this is the ending clip, add an outpoint
            if clip['start_time']+clip['duration'] > playlist_end:
                playlist_lines.append(f"outpoint {int(playlist_end-clip['start_time'])}")

        clip_name = f"{camera}-{event_data['id']}"
        ffmpeg_cmd = [
            'ffmpeg',
            '-y',
            '-protocol_whitelist',
            'pipe,file',
            '-f',
            'concat',
            '-safe',
            '0',
            '-i',
            '-',
            '-c',
            'copy',
            f"{os.path.join(CLIPS_DIR, clip_name)}.mp4"
        ]

        p = sp.run(ffmpeg_cmd, input="\n".join(playlist_lines), encoding='ascii', capture_output=True)
        if p.returncode != 0:
            logger.error(p.stderr)
            return

    def run(self):
        while True:
            if self.stop_event.is_set():
                logger.info(f"Exiting event processor...")
                break

            try:
                event_type, camera, event_data = self.event_queue.get(timeout=10)
            except queue.Empty:
                if not self.stop_event.is_set():
                    self.refresh_cache()
                continue

            self.refresh_cache()

            save_clips_config = self.config.cameras[camera].save_clips

            # if save clips is not enabled for this camera, just continue
            if not save_clips_config.enabled:
                if event_type == 'end':
                    self.event_processed_queue.put((event_data['id'], camera))
                continue

            # if specific objects are listed for this camera, only save clips for them
            if not event_data['label'] in save_clips_config.objects:
                if event_type == 'end':
                    self.event_processed_queue.put((event_data['id'], camera))
                continue

            if event_type == 'start':
                self.events_in_process[event_data['id']] = event_data

            if event_type == 'end':
                if len(self.cached_clips) > 0 and not event_data['false_positive']:
                    self.create_clip(camera, event_data, save_clips_config.pre_capture)
                    Event.create(
                        id=event_data['id'],
                        label=event_data['label'],
                        camera=camera,
                        start_time=event_data['start_time'],
                        end_time=event_data['end_time'],
                        top_score=event_data['top_score'],
                        false_positive=event_data['false_positive'],
                        zones=list(event_data['entered_zones']),
                        thumbnail=event_data['thumbnail']
                    )
                del self.events_in_process[event_data['id']]
                self.event_processed_queue.put((event_data['id'], camera))

class EventCleanup(threading.Thread):
    def __init__(self, config: FrigateConfig, stop_event):
        threading.Thread.__init__(self)
        self.name = 'event_cleanup'
        self.config = config
        self.stop_event = stop_event

    def run(self):
        counter = 0
        while(True):
            if self.stop_event.is_set():
                logger.info(f"Exiting event cleanup...")
                break

            # only expire events every 10 minutes, but check for stop events every 10 seconds
            time.sleep(10)
            counter = counter + 1
            if counter < 60:
                continue
            counter = 0

            camera_keys = list(self.config.cameras.keys())

            # Expire events from unlisted cameras based on the global config
            retain_config = self.config.save_clips.retain
            
            distinct_labels = (Event.select(Event.label)
                        .where(Event.camera.not_in(camera_keys))
                        .distinct())
            
            # loop over object types in db
            for l in distinct_labels:
                # get expiration time for this label
                expire_days = retain_config.objects.get(l.label, retain_config.default)
                expire_after = (datetime.datetime.now() - datetime.timedelta(days=expire_days)).timestamp()
                # grab all events after specific time
                expired_events = (
                    Event.select()
                        .where(Event.camera.not_in(camera_keys), 
                            Event.start_time < expire_after, 
                            Event.label == l.label)
                )
                # delete the grabbed clips from disk
                for event in expired_events:
                    clip_name = f"{event.camera}-{event.id}"
                    clip = Path(f"{os.path.join(CLIPS_DIR, clip_name)}.mp4")
                    clip.unlink(missing_ok=True)
                # delete the event for this type from the db
                delete_query = (
                    Event.delete()
                        .where(Event.camera.not_in(camera_keys), 
                            Event.start_time < expire_after, 
                            Event.label == l.label)
                )
                delete_query.execute()

            # Expire events from cameras based on the camera config
            for name, camera in self.config.cameras.items():
                retain_config = camera.save_clips.retain
                # get distinct objects in database for this camera
                distinct_labels = (Event.select(Event.label)
                        .where(Event.camera == name)
                        .distinct())

                # loop over object types in db
                for l in distinct_labels:
                    # get expiration time for this label
                    expire_days = retain_config.objects.get(l.label, retain_config.default)
                    expire_after = (datetime.datetime.now() - datetime.timedelta(days=expire_days)).timestamp()
                    # grab all events after specific time
                    expired_events = (
                        Event.select()
                            .where(Event.camera == name, 
                                Event.start_time < expire_after, 
                                Event.label == l.label)
                    )
                    # delete the grabbed clips from disk
                    for event in expired_events:
                        clip_name = f"{event.camera}-{event.id}"
                        clip = Path(f"{os.path.join(CLIPS_DIR, clip_name)}.mp4")
                        clip.unlink(missing_ok=True)
                    # delete the event for this type from the db
                    delete_query = (
                        Event.delete()
                            .where( Event.camera == name, 
                                Event.start_time < expire_after, 
                                Event.label == l.label)
                    )
                    delete_query.execute()
