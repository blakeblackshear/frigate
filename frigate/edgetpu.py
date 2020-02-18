import os
import datetime
import multiprocessing as mp
import numpy as np
import SharedArray as sa
import tflite_runtime.interpreter as tflite
from tflite_runtime.interpreter import load_delegate
from frigate.util import EventsPerSecond

def load_labels(path, encoding='utf-8'):
  """Loads labels from file (with or without index numbers).
  Args:
    path: path to label file.
    encoding: label file encoding.
  Returns:
    Dictionary mapping indices to labels.
  """
  with open(path, 'r', encoding=encoding) as f:
    lines = f.readlines()
    if not lines:
        return {}

    if lines[0].split(' ', maxsplit=1)[0].isdigit():
        pairs = [line.split(' ', maxsplit=1) for line in lines]
        return {int(index): label.strip() for index, label in pairs}
    else:
        return {index: line.strip() for index, line in enumerate(lines)}

class ObjectDetector():
    def __init__(self):
        edge_tpu_delegate = None
        try:
            edge_tpu_delegate = load_delegate('libedgetpu.so.1.0')
        except ValueError:
            print("No EdgeTPU detected. Falling back to CPU.")
        
        if edge_tpu_delegate is None:
            self.interpreter = tflite.Interpreter(
                model_path='/cpu_model.tflite')
        else:
            self.interpreter = tflite.Interpreter(
                model_path='/edgetpu_model.tflite',
                experimental_delegates=[edge_tpu_delegate])
        
        self.interpreter.allocate_tensors()

        self.tensor_input_details = self.interpreter.get_input_details()
        self.tensor_output_details = self.interpreter.get_output_details()
    
    def detect_raw(self, tensor_input):
        self.interpreter.set_tensor(self.tensor_input_details[0]['index'], tensor_input)
        self.interpreter.invoke()
        boxes = np.squeeze(self.interpreter.get_tensor(self.tensor_output_details[0]['index']))
        label_codes = np.squeeze(self.interpreter.get_tensor(self.tensor_output_details[1]['index']))
        scores = np.squeeze(self.interpreter.get_tensor(self.tensor_output_details[2]['index']))

        detections = np.zeros((20,6), np.float32)
        for i, score in enumerate(scores):
            detections[i] = [label_codes[i], score, boxes[i][0], boxes[i][1], boxes[i][2], boxes[i][3]]
        
        return detections

class EdgeTPUProcess():
    def __init__(self):
        # TODO: see if we can use the plasma store with a queue and maintain the same speeds
        try:
            sa.delete("frame")
        except:
            pass
        try:
            sa.delete("detections")
        except:
            pass

        self.input_frame = sa.create("frame", shape=(1,300,300,3), dtype=np.uint8)
        self.detections = sa.create("detections", shape=(20,6), dtype=np.float32)

        self.detect_lock = mp.Lock()
        self.detect_ready = mp.Event()
        self.frame_ready = mp.Event()
        self.fps = mp.Value('d', 0.0)
        self.avg_inference_speed = mp.Value('d', 0.01)

        def run_detector(detect_ready, frame_ready, fps, avg_speed):
            print(f"Starting detection process: {os.getpid()}")
            object_detector = ObjectDetector()
            input_frame = sa.attach("frame")
            detections = sa.attach("detections")
            fps_tracker = EventsPerSecond()
            fps_tracker.start()

            while True:
                # wait until a frame is ready
                frame_ready.wait()
                start = datetime.datetime.now().timestamp()
                # signal that the process is busy
                frame_ready.clear()
                detections[:] = object_detector.detect_raw(input_frame)
                # signal that the process is ready to detect
                detect_ready.set()
                fps_tracker.update()
                fps.value = fps_tracker.eps()
                duration = datetime.datetime.now().timestamp()-start
                avg_speed.value = (avg_speed.value*9 + duration)/10

        self.detect_process = mp.Process(target=run_detector, args=(self.detect_ready, self.frame_ready, self.fps, self.avg_inference_speed))
        self.detect_process.daemon = True
        self.detect_process.start()

class RemoteObjectDetector():
    def __init__(self, labels, detect_lock, detect_ready, frame_ready):
        self.labels = load_labels(labels)

        self.input_frame = sa.attach("frame")
        self.detections = sa.attach("detections")

        self.detect_lock = detect_lock
        self.detect_ready = detect_ready
        self.frame_ready = frame_ready
    
    def detect(self, tensor_input, threshold=.4):
        detections = []
        with self.detect_lock:
            self.input_frame[:] = tensor_input
            # unset detections and signal that a frame is ready
            self.detect_ready.clear()
            self.frame_ready.set()
            # wait until the detection process is finished,
            self.detect_ready.wait()
            for d in self.detections:
                if d[1] < threshold:
                    break
                detections.append((
                    self.labels[int(d[0])],
                    float(d[1]),
                    (d[2], d[3], d[4], d[5])
                ))
        return detections