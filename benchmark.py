import os
from statistics import mean
import multiprocessing as mp
import numpy as np
import datetime
from frigate.config import DetectorTypeEnum
from frigate.object_detection import (
    LocalObjectDetector,
    ObjectDetectProcess,
    RemoteObjectDetector,
    load_labels,
)

my_frame = np.expand_dims(np.full((300, 300, 3), 1, np.uint8), axis=0)
labels = load_labels("/labelmap.txt")

######
# Minimal same process runner
######
# object_detector = LocalObjectDetector()
# tensor_input = np.expand_dims(np.full((300,300,3), 0, np.uint8), axis=0)

# start = datetime.datetime.now().timestamp()

# frame_times = []
# for x in range(0, 1000):
#   start_frame = datetime.datetime.now().timestamp()

#   tensor_input[:] = my_frame
#   detections = object_detector.detect_raw(tensor_input)
#   parsed_detections = []
#   for d in detections:
#       if d[1] < 0.4:
#           break
#       parsed_detections.append((
#           labels[int(d[0])],
#           float(d[1]),
#           (d[2], d[3], d[4], d[5])
#       ))
#   frame_times.append(datetime.datetime.now().timestamp()-start_frame)

# duration = datetime.datetime.now().timestamp()-start
# print(f"Processed for {duration:.2f} seconds.")
# print(f"Average frame processing time: {mean(frame_times)*1000:.2f}ms")


def start(id, num_detections, detection_queue, event):
    object_detector = RemoteObjectDetector(
        str(id), "/labelmap.txt", detection_queue, event
    )
    start = datetime.datetime.now().timestamp()

    frame_times = []
    for x in range(0, num_detections):
        start_frame = datetime.datetime.now().timestamp()
        detections = object_detector.detect(my_frame)
        frame_times.append(datetime.datetime.now().timestamp() - start_frame)

    duration = datetime.datetime.now().timestamp() - start
    object_detector.cleanup()
    print(f"{id} - Processed for {duration:.2f} seconds.")
    print(f"{id} - FPS: {object_detector.fps.eps():.2f}")
    print(f"{id} - Average frame processing time: {mean(frame_times)*1000:.2f}ms")


######
# Separate process runner
######
# event = mp.Event()
# detection_queue = mp.Queue()
# edgetpu_process = EdgeTPUProcess(detection_queue, {'1': event}, 'usb:0')

# start(1, 1000, edgetpu_process.detection_queue, event)
# print(f"Average raw inference speed: {edgetpu_process.avg_inference_speed.value*1000:.2f}ms")

####
# Multiple camera processes
####
camera_processes = []

events = {}
for x in range(0, 10):
    events[str(x)] = mp.Event()
detection_queue = mp.Queue()
edgetpu_process_1 = ObjectDetectProcess(
    detection_queue, events, DetectorTypeEnum.edgetpu, "usb:0"
)
edgetpu_process_2 = ObjectDetectProcess(
    detection_queue, events, DetectorTypeEnum.edgetpu, "usb:1"
)

for x in range(0, 10):
    camera_process = mp.Process(
        target=start, args=(x, 300, detection_queue, events[str(x)])
    )
    camera_process.daemon = True
    camera_processes.append(camera_process)

start_time = datetime.datetime.now().timestamp()

for p in camera_processes:
    p.start()

for p in camera_processes:
    p.join()

duration = datetime.datetime.now().timestamp() - start_time
print(f"Total - Processed for {duration:.2f} seconds.")
