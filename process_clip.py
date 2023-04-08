import sys
from typing_extensions import runtime

sys.path.append("/lab/frigate")

import json
import logging
import multiprocessing as mp
import os
import subprocess as sp
import sys

import click
import csv
import cv2
import numpy as np

from frigate.config import FrigateConfig
from frigate.object_detection import LocalObjectDetector
from frigate.motion import MotionDetector
from frigate.object_processing import CameraState
from frigate.objects import ObjectTracker
from frigate.util import (
    EventsPerSecond,
    SharedMemoryFrameManager,
    draw_box_with_label,
)
from frigate.video import capture_frames, process_frames, start_or_restart_ffmpeg

logging.basicConfig()
logging.root.setLevel(logging.DEBUG)

logger = logging.getLogger(__name__)


def get_frame_shape(source):
    ffprobe_cmd = [
        "ffprobe",
        "-v",
        "panic",
        "-show_error",
        "-show_streams",
        "-of",
        "json",
        source,
    ]
    p = sp.run(ffprobe_cmd, capture_output=True)
    info = json.loads(p.stdout)

    video_info = [s for s in info["streams"] if s["codec_type"] == "video"][0]

    if video_info["height"] != 0 and video_info["width"] != 0:
        return (video_info["height"], video_info["width"], 3)

    # fallback to using opencv if ffprobe didnt succeed
    video = cv2.VideoCapture(source)
    ret, frame = video.read()
    frame_shape = frame.shape
    video.release()
    return frame_shape


class ProcessClip:
    def __init__(self, clip_path, frame_shape, config: FrigateConfig):
        self.clip_path = clip_path
        self.camera_name = "camera"
        self.config = config
        self.camera_config = self.config.cameras["camera"]
        self.frame_shape = self.camera_config.frame_shape
        self.ffmpeg_cmd = [
            c["cmd"] for c in self.camera_config.ffmpeg_cmds if "detect" in c["roles"]
        ][0]
        self.frame_manager = SharedMemoryFrameManager()
        self.frame_queue = mp.Queue()
        self.detected_objects_queue = mp.Queue()
        self.camera_state = CameraState(self.camera_name, config, self.frame_manager)

    def load_frames(self):
        fps = EventsPerSecond()
        skipped_fps = EventsPerSecond()
        current_frame = mp.Value("d", 0.0)
        frame_size = (
            self.camera_config.frame_shape_yuv[0]
            * self.camera_config.frame_shape_yuv[1]
        )
        ffmpeg_process = start_or_restart_ffmpeg(
            self.ffmpeg_cmd, logger, sp.DEVNULL, frame_size
        )
        capture_frames(
            ffmpeg_process,
            self.camera_name,
            self.camera_config.frame_shape_yuv,
            self.frame_manager,
            self.frame_queue,
            fps,
            skipped_fps,
            current_frame,
        )
        ffmpeg_process.wait()
        ffmpeg_process.communicate()

    def process_frames(
        self, object_detector, objects_to_track=["person"], object_filters={}
    ):
        mask = np.zeros((self.frame_shape[0], self.frame_shape[1], 1), np.uint8)
        mask[:] = 255
        motion_detector = MotionDetector(self.frame_shape, self.camera_config.motion)
        motion_detector.save_images = False

        object_tracker = ObjectTracker(self.camera_config.detect)
        process_info = {
            "process_fps": mp.Value("d", 0.0),
            "detection_fps": mp.Value("d", 0.0),
            "detection_frame": mp.Value("d", 0.0),
        }

        detection_enabled = mp.Value("d", 1)
        motion_enabled = mp.Value("d", True)
        stop_event = mp.Event()

        process_frames(
            self.camera_name,
            self.frame_queue,
            self.frame_shape,
            self.config.model,
            self.camera_config.detect,
            self.frame_manager,
            motion_detector,
            object_detector,
            object_tracker,
            self.detected_objects_queue,
            process_info,
            objects_to_track,
            object_filters,
            detection_enabled,
            motion_enabled,
            stop_event,
            exit_on_empty=True,
        )

    def stats(self, debug_path=None):
        total_regions = 0
        total_motion_boxes = 0
        object_ids = set()
        total_frames = 0

        while not self.detected_objects_queue.empty():
            (
                camera_name,
                frame_time,
                current_tracked_objects,
                motion_boxes,
                regions,
            ) = self.detected_objects_queue.get()

            if debug_path:
                self.save_debug_frame(
                    debug_path, frame_time, current_tracked_objects.values()
                )

            self.camera_state.update(
                frame_time, current_tracked_objects, motion_boxes, regions
            )
            total_regions += len(regions)
            total_motion_boxes += len(motion_boxes)
            top_score = 0
            for id, obj in self.camera_state.tracked_objects.items():
                if not obj.false_positive:
                    object_ids.add(id)
                    if obj.top_score > top_score:
                        top_score = obj.top_score

            total_frames += 1

            self.frame_manager.delete(self.camera_state.previous_frame_id)

        return {
            "total_regions": total_regions,
            "total_motion_boxes": total_motion_boxes,
            "true_positive_objects": len(object_ids),
            "total_frames": total_frames,
            "top_score": top_score,
        }

    def save_debug_frame(self, debug_path, frame_time, tracked_objects):
        current_frame = cv2.cvtColor(
            self.frame_manager.get(
                f"{self.camera_name}{frame_time}", self.camera_config.frame_shape_yuv
            ),
            cv2.COLOR_YUV2BGR_I420,
        )
        # draw the bounding boxes on the frame
        for obj in tracked_objects:
            thickness = 2
            color = (0, 0, 175)
            if obj["frame_time"] != frame_time:
                thickness = 1
                color = (255, 0, 0)
            else:
                color = (255, 255, 0)

            # draw the bounding boxes on the frame
            box = obj["box"]
            draw_box_with_label(
                current_frame,
                box[0],
                box[1],
                box[2],
                box[3],
                obj["id"],
                f"{int(obj['score']*100)}% {int(obj['area'])}",
                thickness=thickness,
                color=color,
            )
            # draw the regions on the frame
            region = obj["region"]
            draw_box_with_label(
                current_frame,
                region[0],
                region[1],
                region[2],
                region[3],
                "region",
                "",
                thickness=1,
                color=(0, 255, 0),
            )

        cv2.imwrite(
            f"{os.path.join(debug_path, os.path.basename(self.clip_path))}.{int(frame_time*1000000)}.jpg",
            current_frame,
        )


@click.command()
@click.option("-p", "--path", required=True, help="Path to clip or directory to test.")
@click.option("-l", "--label", default="person", help="Label name to detect.")
@click.option("-o", "--output", default=None, help="File to save csv of data")
@click.option("--debug-path", default=None, help="Path to output frames for debugging.")
def process(path, label, output, debug_path):
    clips = []
    if os.path.isdir(path):
        files = os.listdir(path)
        files.sort()
        clips = [os.path.join(path, file) for file in files]
    elif os.path.isfile(path):
        clips.append(path)

    json_config = {
        "mqtt": {"host": "mqtt"},
        "detectors": {"coral": {"type": "edgetpu", "device": "usb"}},
        "cameras": {
            "camera": {
                "ffmpeg": {
                    "inputs": [
                        {
                            "path": "path.mp4",
                            "global_args": "-hide_banner",
                            "input_args": "-loglevel info",
                            "roles": ["detect"],
                        }
                    ]
                },
                "rtmp": {"enabled": False},
                "record": {"enabled": False},
            }
        },
    }

    object_detector = LocalObjectDetector(labels="/labelmap.txt")

    results = []
    for c in clips:
        logger.info(c)
        frame_shape = get_frame_shape(c)

        json_config["cameras"]["camera"]["detect"] = {
            "height": frame_shape[0],
            "width": frame_shape[1],
        }
        json_config["cameras"]["camera"]["ffmpeg"]["inputs"][0]["path"] = c

        frigate_config = FrigateConfig(**json_config)
        runtime_config = frigate_config.runtime_config
        runtime_config.cameras["camera"].create_ffmpeg_cmds()

        process_clip = ProcessClip(c, frame_shape, runtime_config)
        process_clip.load_frames()
        process_clip.process_frames(object_detector, objects_to_track=[label])

        results.append((c, process_clip.stats(debug_path)))

    positive_count = sum(
        1 for result in results if result[1]["true_positive_objects"] > 0
    )
    print(
        f"Objects were detected in {positive_count}/{len(results)}({positive_count/len(results)*100:.2f}%) clip(s)."
    )

    if output:
        # now we will open a file for writing
        data_file = open(output, "w")

        # create the csv writer object
        csv_writer = csv.writer(data_file)

        # Counter variable used for writing
        # headers to the CSV file
        count = 0

        for result in results:
            if count == 0:

                # Writing headers of CSV file
                header = ["file"] + list(result[1].keys())
                csv_writer.writerow(header)
                count += 1

            # Writing data of CSV file
            csv_writer.writerow([result[0]] + list(result[1].values()))

        data_file.close()


if __name__ == "__main__":
    process()
