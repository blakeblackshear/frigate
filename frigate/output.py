import queue
from multiprocessing import shared_memory
from frigate.util import SharedMemoryFrameManager


def output_frames(config, video_output_queue, stop_event):
    frame_manager = SharedMemoryFrameManager()
    previous_frames = {}

    while True:
        try:
            (
                camera,
                frame_time,
                current_tracked_objects,
                motion_boxes,
                regions,
            ) = video_output_queue.get(True, 10)
        except queue.Empty:
            continue

        frame_id = f"{camera}{frame_time}"

        frame = frame_manager.get(frame_id, config.cameras[camera].frame_shape_yuv)

        if camera in previous_frames:
            frame_manager.delete(previous_frames[camera])

        previous_frames[camera] = frame_id
