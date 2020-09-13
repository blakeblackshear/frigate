import os
import datetime
import hashlib
import multiprocessing as mp
from abc import ABC, abstractmethod
import numpy as np
import pyarrow.plasma as plasma
import tflite_runtime.interpreter as tflite
from tflite_runtime.interpreter import load_delegate
from frigate.util import EventsPerSecond, listen

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

class ObjectDetector(ABC):
    @abstractmethod
    def detect(self, tensor_input, threshold = .4):
        pass

class LocalObjectDetector(ObjectDetector):
    def __init__(self, tf_device=None, labels=None):
        self.fps = EventsPerSecond()
        if labels is None:
            self.labels = {}
        else:
            self.labels = load_labels(labels)

        device_config = {"device": "usb"}
        if not tf_device is None:
            device_config = {"device": tf_device}

        edge_tpu_delegate = None
        try:
            print(f"Attempting to load TPU as {device_config['device']}")
            edge_tpu_delegate = load_delegate('libedgetpu.so.1.0', device_config)
            print("TPU found")
        except ValueError:
            try:
                print(f"Attempting to load TPU as pci:0")
                edge_tpu_delegate = load_delegate('libedgetpu.so.1.0', {"device": "pci:0"})
                print("PCIe TPU found")
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
    
    def detect(self, tensor_input, threshold=.4):
        detections = []

        raw_detections = self.detect_raw(tensor_input)

        for d in raw_detections:
            if d[1] < threshold:
                break
            detections.append((
                self.labels[int(d[0])],
                float(d[1]),
                (d[2], d[3], d[4], d[5])
            ))
        self.fps.update()
        return detections

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

def run_detector(detection_queue, avg_speed, start, tf_device):
    print(f"Starting detection process: {os.getpid()}")
    listen()
    plasma_client = plasma.connect("/tmp/plasma")
    object_detector = LocalObjectDetector(tf_device=tf_device)

    while True:
        object_id_str = detection_queue.get()
        object_id_hash = hashlib.sha1(str.encode(object_id_str))
        object_id = plasma.ObjectID(object_id_hash.digest())
        object_id_out = plasma.ObjectID(hashlib.sha1(str.encode(f"out-{object_id_str}")).digest())
        input_frame = plasma_client.get(object_id, timeout_ms=0)

        if input_frame is plasma.ObjectNotAvailable:
            continue

        # detect and put the output in the plasma store
        start.value = datetime.datetime.now().timestamp()
        plasma_client.put(object_detector.detect_raw(input_frame), object_id_out)
        duration = datetime.datetime.now().timestamp()-start.value
        start.value = 0.0

        avg_speed.value = (avg_speed.value*9 + duration)/10
        
class EdgeTPUProcess():
    def __init__(self, tf_device=None):
        self.detection_queue = mp.Queue()
        self.avg_inference_speed = mp.Value('d', 0.01)
        self.detection_start = mp.Value('d', 0.0)
        self.detect_process = None
        self.tf_device = tf_device
        self.start_or_restart()

    def start_or_restart(self):
        self.detection_start.value = 0.0
        if (not self.detect_process is None) and self.detect_process.is_alive():
            self.detect_process.terminate()
            print("Waiting for detection process to exit gracefully...")
            self.detect_process.join(timeout=30)
            if self.detect_process.exitcode is None:
                print("Detection process didnt exit. Force killing...")
                self.detect_process.kill()
                self.detect_process.join()
        self.detect_process = mp.Process(target=run_detector, args=(self.detection_queue, self.avg_inference_speed, self.detection_start, self.tf_device))
        self.detect_process.daemon = True
        self.detect_process.start()

class RemoteObjectDetector():
    def __init__(self, name, labels, detection_queue):
        self.labels = load_labels(labels)
        self.name = name
        self.fps = EventsPerSecond()
        self.plasma_client = plasma.connect("/tmp/plasma")
        self.detection_queue = detection_queue
    
    def detect(self, tensor_input, threshold=.4):
        detections = []

        now = f"{self.name}-{str(datetime.datetime.now().timestamp())}"
        object_id_frame = plasma.ObjectID(hashlib.sha1(str.encode(now)).digest())
        object_id_detections = plasma.ObjectID(hashlib.sha1(str.encode(f"out-{now}")).digest())
        self.plasma_client.put(tensor_input, object_id_frame)
        self.detection_queue.put(now)
        raw_detections = self.plasma_client.get(object_id_detections, timeout_ms=10000)

        if raw_detections is plasma.ObjectNotAvailable:
            self.plasma_client.delete([object_id_frame])
            return detections

        for d in raw_detections:
            if d[1] < threshold:
                break
            detections.append((
                self.labels[int(d[0])],
                float(d[1]),
                (d[2], d[3], d[4], d[5])
            ))
        self.plasma_client.delete([object_id_frame, object_id_detections])
        self.fps.update()
        return detections
