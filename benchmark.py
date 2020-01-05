import statistics
import numpy as np
from edgetpu.detection.engine import DetectionEngine

# Path to frozen detection graph. This is the actual model that is used for the object detection.
PATH_TO_CKPT = '/frozen_inference_graph.pb'

# Load the edgetpu engine and labels
engine = DetectionEngine(PATH_TO_CKPT)

frame = np.zeros((300,300,3), np.uint8)
flattened_frame = np.expand_dims(frame, axis=0).flatten()

detection_times = []

for x in range(0, 1000):
    objects = engine.detect_with_input_tensor(flattened_frame, threshold=0.1, top_k=3)
    detection_times.append(engine.get_inference_time())

print("Average inference time: " + str(statistics.mean(detection_times)))