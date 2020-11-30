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

logger = logging.getLogger(__name__)

SECONDS_IN_DAY = 60 * 60 * 24

class RecordingMaintainer(threading.Thread):
    def __init__(self, config: FrigateConfig, stop_event):
        threading.Thread.__init__(self)
        self.name = 'recording_maint'
        self.config = config
        record_dirs = list(set([camera.record.record_dir for camera in self.config.cameras.values()]))
        self.record_dir = None if len(record_dirs) == 0 else record_dirs[0]
        self.stop_event = stop_event

    def move_files(self):
        if self.record_dir is None:
            return

        recordings = [d for d in os.listdir(self.record_dir) if os.path.isfile(os.path.join(self.record_dir, d)) and d.endswith(".mp4")]

        files_in_use = []
        for process in psutil.process_iter():
            if process.name() != 'ffmpeg':
                continue
            try:
                flist = process.open_files()
                if flist:
                    for nt in flist:
                        if nt.path.startswith(self.record_dir):
                            files_in_use.append(nt.path.split('/')[-1])
            except:
                continue

        for f in recordings:
            if f in files_in_use:
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
                f"{os.path.join(self.record_dir,f)}"
            ])
            p = sp.Popen(ffprobe_cmd, stdout=sp.PIPE, shell=True)
            (output, err) = p.communicate()
            p_status = p.wait()
            if p_status == 0:
                duration = float(output.decode('utf-8').strip())
            else:
                logger.info(f"bad file: {f}")
                os.remove(os.path.join(self.record_dir,f))
                continue

            directory = os.path.join(self.record_dir, start_time.strftime('%Y-%m/%d/%H'), camera)

            if not os.path.exists(directory):
                os.makedirs(directory)

            file_name = f"{start_time.strftime('%M.%S.mp4')}"

            os.rename(os.path.join(self.record_dir,f), os.path.join(directory,file_name))

    def expire_files(self):
        delete_before = {}
        for name, camera in self.config.cameras.items():
            delete_before[name] = datetime.datetime.now().timestamp() - SECONDS_IN_DAY*camera.record.retain_days

        for p in Path('/media/frigate/recordings').rglob("*.mp4"):
            if not p.parent in delete_before:
                continue
            if p.stat().st_mtime < delete_before[p.parent]:
                p.unlink(missing_ok=True)

    def run(self):
        counter = 0
        self.expire_files()
        while(True):
            if self.stop_event.is_set():
                logger.info(f"Exiting recording maintenance...")
                break

            # only expire events every 10 minutes, but check for new files every 10 seconds
            time.sleep(10)
            counter = counter + 1
            if counter < 60:
                self.expire_files()
            counter = 0

            self.move_files()


   