import statistics
import numpy as np
import time
from frigate.edgetpu import ObjectDetector

object_detector = ObjectDetector()

frame = np.zeros((300,300,3), np.uint8)
input_frame = np.expand_dims(frame, axis=0)

detection_times = []

for x in range(0, 100):
    start = time.monotonic()
    object_detector.detect_raw(input_frame)
    detection_times.append(time.monotonic()-start)

print(f"Average inference time: {statistics.mean(detection_times)*1000:.2f}ms")