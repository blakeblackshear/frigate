import os
import datetime
import hashlib
import multiprocessing as mp
import queue
from multiprocessing.connection import Connection
from abc import ABC, abstractmethod
from typing import Dict
import numpy as np
import tflite_runtime.interpreter as tflite
from tflite_runtime.interpreter import load_delegate
from frigate.util import EventsPerSecond, listen, SharedMemoryFrameManager

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

def run_detector(detection_queue, result_connections: Dict[str, Connection], avg_speed, start, tf_device):
    print(f"Starting detection process: {os.getpid()}")
    listen()
    frame_manager = SharedMemoryFrameManager()
    object_detector = LocalObjectDetector(tf_device=tf_device)

    while True:
        connection_id = detection_queue.get()
        input_frame = frame_manager.get(connection_id, (1,300,300,3))

        if input_frame is None:
            continue

        # detect and put the output in the plasma store
        start.value = datetime.datetime.now().timestamp()
        # TODO: what is the overhead for pickling this result vs writing back to shared memory?
        #       I could try using an Event() and waiting in the other process before looking in memory...
        detections = object_detector.detect_raw(input_frame)
        result_connections[connection_id].send(detections)
        duration = datetime.datetime.now().timestamp()-start.value
        start.value = 0.0

        avg_speed.value = (avg_speed.value*9 + duration)/10
        
class EdgeTPUProcess():
    def __init__(self, result_connections, tf_device=None):
        self.result_connections = result_connections
        self.detection_queue = mp.Queue()
        self.avg_inference_speed = mp.Value('d', 0.01)
        self.detection_start = mp.Value('d', 0.0)
        self.detect_process = None
        self.tf_device = tf_device
        self.start_or_restart()
    
    def stop(self):
        self.detect_process.terminate()
        print("Waiting for detection process to exit gracefully...")
        self.detect_process.join(timeout=30)
        if self.detect_process.exitcode is None:
            print("Detection process didnt exit. Force killing...")
            self.detect_process.kill()
            self.detect_process.join()

    def start_or_restart(self):
        self.detection_start.value = 0.0
        if (not self.detect_process is None) and self.detect_process.is_alive():
            self.stop()
        self.detect_process = mp.Process(target=run_detector, args=(self.detection_queue, self.result_connections, self.avg_inference_speed, self.detection_start, self.tf_device))
        self.detect_process.daemon = True
        self.detect_process.start()

class RemoteObjectDetector():
    def __init__(self, name, labels, detection_queue, result_connection: Connection):
        self.labels = load_labels(labels)
        self.name = name
        self.fps = EventsPerSecond()
        self.detection_queue = detection_queue
        self.result_connection = result_connection
        self.shm = mp.shared_memory.SharedMemory(name=self.name, create=True, size=300*300*3)
        self.np_shm = np.ndarray((1,300,300,3), dtype=np.uint8, buffer=self.shm.buf)
    
    def detect(self, tensor_input, threshold=.4):
        detections = []

        # copy input to shared memory
        # TODO: what if I just write it there in the first place?
        self.np_shm[:] = tensor_input[:]
        self.detection_queue.put(self.name)
        if self.result_connection.poll(10):
            raw_detections = self.result_connection.recv()
        else:
            return detections

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
