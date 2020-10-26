import os
import time
import psutil
import threading
from collections import defaultdict
import json
import datetime
import subprocess as sp
import queue

class EventProcessor(threading.Thread):
    def __init__(self, config, camera_processes, cache_dir, clip_dir, event_queue, stop_event):
        threading.Thread.__init__(self)
        self.config = config
        self.camera_processes = camera_processes
        self.cache_dir = cache_dir
        self.clip_dir = clip_dir
        self.cached_clips = {}
        self.event_queue = event_queue
        self.events_in_process = {}
        self.stop_event = stop_event
    
    def refresh_cache(self):
        cached_files = os.listdir(self.cache_dir)

        files_in_use = []
        for process_data in self.camera_processes.values():
            try:
                ffmpeg_process = psutil.Process(pid=process_data['ffmpeg_pid'].value)
                flist = ffmpeg_process.open_files()
                if flist:
                    for nt in flist:
                        if nt.path.startswith(self.cache_dir):
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
                f"{os.path.join(self.cache_dir,f)}"
            ])
            p = sp.Popen(ffprobe_cmd, stdout=sp.PIPE, shell=True)
            (output, err) = p.communicate()
            p_status = p.wait()
            if p_status == 0:
                duration = float(output.decode('utf-8').strip())
            else:
                print(f"bad file: {f}")
                os.remove(os.path.join(self.cache_dir,f))
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
        max_seconds = self.config.get('save_clips', {}).get('max_seconds', 300)
        if datetime.datetime.now().timestamp()-earliest_event > max_seconds:
            earliest_event = datetime.datetime.now().timestamp()-max_seconds
        
        for f, data in list(self.cached_clips.items()):
            if earliest_event-90 > data['start_time']+data['duration']:
                del self.cached_clips[f]
                os.remove(os.path.join(self.cache_dir,f))

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
            playlist_lines.append(f"file '{os.path.join(self.cache_dir,clip['path'])}'")
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
            f"{os.path.join(self.clip_dir, clip_name)}.mp4"
        ]

        p = sp.run(ffmpeg_cmd, input="\n".join(playlist_lines), encoding='ascii', capture_output=True)
        if p.returncode != 0:
            print(p.stderr)
            return
        
        with open(f"{os.path.join(self.clip_dir, clip_name)}.json", 'w') as outfile:
            json.dump(event_data, outfile)

    def run(self):
        while True:
            if self.stop_event.is_set():
                print(f"Exiting event processor...")
                break

            try:
                event_type, camera, event_data = self.event_queue.get(timeout=10)
            except queue.Empty:
                if not self.stop_event.is_set():
                    self.refresh_cache()
                continue

            self.refresh_cache()

            save_clips_config = self.config['cameras'][camera].get('save_clips', {})

            # if save clips is not enabled for this camera, just continue
            if not save_clips_config.get('enabled', False):
                continue

            # if specific objects are listed for this camera, only save clips for them
            if 'objects' in save_clips_config:
                if not event_data['label'] in save_clips_config['objects']:
                    continue

            if event_type == 'start':
                self.events_in_process[event_data['id']] = event_data

            if event_type == 'end':
                if len(self.cached_clips) > 0 and not event_data['false_positive']:
                    self.create_clip(camera, event_data, save_clips_config.get('pre_capture', 30))
                del self.events_in_process[event_data['id']]

                