import datetime
import logging
import multiprocessing as mp
import os
import queue
import signal
import threading
from abc import ABC, abstractmethod
from typing import Dict

import numpy as np
import tflite_runtime.interpreter as tflite
from setproctitle import setproctitle
from tflite_runtime.interpreter import load_delegate

from frigate.util import EventsPerSecond, SharedMemoryFrameManager, listen, load_labels
from frigate.yolov5.yolov5edgetpumodel import Yolov5EdgeTPUModel

logger = logging.getLogger(__name__)


class ObjectDetector(ABC):
    @abstractmethod
    def detect(self, tensor_input, threshold=0.4):
        pass


class LocalObjectDetector(ObjectDetector):
    def __init__(self, model_config, tf_device=None, num_threads=3):
        self.fps = EventsPerSecond()
        if model_config.labelmap_path:
            self.labels = load_labels(model_config.labelmap_path)
        self.model_config = model_config

        device_config = {"device": "usb"}
        if not tf_device is None:
            device_config = {"device": tf_device}

        edge_tpu_delegate = None

        if tf_device != "cpu":
            try:
                logger.info(f"Attempting to load TPU as {device_config['device']}")
                edge_tpu_delegate = load_delegate("libedgetpu.so.1.0", device_config)
                logger.info("TPU found")
                self.interpreter = tflite.Interpreter(
                    model_path=model_config.path or "/edgetpu_model.tflite",
                    experimental_delegates=[edge_tpu_delegate],
                )
            except ValueError:
                logger.error(
                    "No EdgeTPU was detected. If you do not have a Coral device yet, you must configure CPU detectors."
                )
                raise
        else:
            logger.warning(
                "CPU detectors are not recommended and should only be used for testing or for trial purposes."
            )
            self.interpreter = tflite.Interpreter(
                model_path=model_config.path or "/cpu_model.tflite", num_threads=num_threads
            )

        self.interpreter.allocate_tensors()

        self.tensor_input_details = self.interpreter.get_input_details()
        self.tensor_output_details = self.interpreter.get_output_details()

        if self.model_config.type == 'yolov5':
            cpu = True
            if tf_device != "cpu":
                cpu = False
            model = Yolov5EdgeTPUModel(model_config.path, cpu)
            input_size = model.get_image_size() # we should probably use model_config.(height,width)
            x = (255 * np.random.random((3, *input_size))).astype(np.uint8)
            model.forward(x)
            self.yolov5Model = model


        if model_config.anchors != "":
            anchors = [float(x) for x in model_config.anchors.split(',')]
            self.anchors = np.array(anchors).reshape(-1, 2)

    def detect(self, tensor_input, threshold=0.4):
        detections = []

        raw_detections = self.detect_raw(tensor_input)

        for d in raw_detections:
            if d[1] < threshold:
                break
            detections.append(
                (self.labels[int(d[0])], float(d[1]), (d[2], d[3], d[4], d[5]))
            )
        self.fps.update()
        return detections

    def sigmoid(self, x):
        return 1. / (1 + np.exp(-x))


    def detect_raw(self, tensor_input):
        if self.model_config.type == "ssd":
            raw_detections = self.detect_ssd(tensor_input)
        elif self.model_config.type == "yolov3":
            raw_detections = self.detect_yolov3(tensor_input)
        elif self.model_config.type == "yolov5":
            raw_detections = self.detect_yolov5(tensor_input)
        else:
            logger.error(f"Unsupported model type {self.model_config.type}")
            raw_detections = []
        return raw_detections


    def get_interpreter_details(self):
        # Get input and output tensor details
        input_details = self.interpreter.get_input_details()
        output_details = self.interpreter.get_output_details()
        input_shape = input_details[0]["shape"]
        return input_details, output_details, input_shape

    # from util.py in https://github.com/guichristmann/edge-tpu-tiny-yolo
    def featuresToBoxes(self, outputs, anchors, n_classes, net_input_shape):
        grid_shape = outputs.shape[1:3]
        n_anchors = len(anchors)

        # Numpy screwaround to get the boxes in reasonable amount of time
        grid_y = np.tile(np.arange(grid_shape[0]).reshape(-1, 1), grid_shape[0]).reshape(1, grid_shape[0], grid_shape[0], 1).astype(np.float32)
        grid_x = grid_y.copy().T.reshape(1, grid_shape[0], grid_shape[1], 1).astype(np.float32)
        outputs = outputs.reshape(1, grid_shape[0], grid_shape[1], n_anchors, -1)
        _anchors = anchors.reshape(1, 1, 3, 2).astype(np.float32)

        # Get box parameters from network output and apply transformations
        bx = (self.sigmoid(outputs[..., 0]) + grid_x) / grid_shape[0] 
        by = (self.sigmoid(outputs[..., 1]) + grid_y) / grid_shape[1]
        # Should these be inverted?
        bw = np.multiply(_anchors[..., 0] / net_input_shape[1], np.exp(outputs[..., 2]))
        bh = np.multiply(_anchors[..., 1] / net_input_shape[2], np.exp(outputs[..., 3]))
        
        # Get the scores 
        scores = self.sigmoid(np.expand_dims(outputs[..., 4], -1)) * \
                self.sigmoid(outputs[..., 5:])
        scores = scores.reshape(-1, n_classes)

        # TODO: some of these are probably not needed but I don't understand numpy magic well enough
        bx = bx.flatten()
        by = (by.flatten()) * 1
        bw = bw.flatten()
        bh = bh.flatten() * 1
        half_bw = bw / 2.
        half_bh = bh / 2.

        tl_x = np.multiply(bx - half_bw, 1)
        tl_y = np.multiply(by - half_bh, 1) 
        br_x = np.multiply(bx + half_bw, 1)
        br_y = np.multiply(by + half_bh, 1)

        # Get indices of boxes with score higher than threshold
        indices = np.argwhere(scores >= 0.5)
        selected_boxes = []
        selected_scores = []
        for i in indices:
            i = tuple(i)
            selected_boxes.append( ((tl_x[i[0]], tl_y[i[0]]), (br_x[i[0]], br_y[i[0]])) )
            selected_scores.append(scores[i])

        selected_boxes = np.array(selected_boxes)
        selected_scores = np.array(selected_scores)
        selected_classes = indices[:, 1]

        return selected_boxes, selected_scores, selected_classes
    
    def detect_yolov5(self, tensor_input):
        tensor_input = np.squeeze(tensor_input, axis=0)
        results = self.yolov5Model.forward(tensor_input)
        det = results[0]
        detections = np.zeros((20, 6), np.float32)
        i = 0
        for *xyxy, conf, cls in reversed(det):
            detections[i] = [
                int(cls),
                float(conf),
                xyxy[1],
                xyxy[0],
                xyxy[3],
                xyxy[2],
            ]
            i += 1

        return detections
        
    def detect_ssd(self, tensor_input):
        self.interpreter.set_tensor(self.tensor_input_details[0]["index"], tensor_input)
        self.interpreter.invoke()

        boxes = self.interpreter.tensor(self.tensor_output_details[0]["index"])()[0]
        class_ids = self.interpreter.tensor(self.tensor_output_details[1]["index"])()[0]
        scores = self.interpreter.tensor(self.tensor_output_details[2]["index"])()[0]
        count = int(
            self.interpreter.tensor(self.tensor_output_details[3]["index"])()[0]
        )

        detections = np.zeros((20, 6), np.float32)

        for i in range(count):
            if scores[i] < 0.4 or i == 20:
                break
            detections[i] = [
                class_ids[i],
                float(scores[i]),
                boxes[i][0],
                boxes[i][1],
                boxes[i][2],
                boxes[i][3],
            ]

        return detections

    def detect_yolov3(self, tensor_input):
        input_details, output_details, net_input_shape = \
            self.get_interpreter_details()

        self.interpreter.set_tensor(self.tensor_input_details[0]['index'], tensor_input)
        self.interpreter.invoke()

        # for yolo, it's a little diffrent
        out1 = self.interpreter.get_tensor(self.tensor_output_details[0]['index'])
        out2 = self.interpreter.get_tensor(self.tensor_output_details[1]['index'])

        # Dequantize output (tpu only)
        o1_scale, o1_zero = self.tensor_output_details[0]['quantization']
        out1 = (out1.astype(np.float32) - o1_zero) * o1_scale
        o2_scale, o2_zero = self.tensor_output_details[1]['quantization']
        out2 = (out2.astype(np.float32) - o2_zero) * o2_scale

        num_classes = len(self.labels)
        _boxes1, _scores1, _classes1 = self.featuresToBoxes(out1, self.anchors[[3, 4, 5]], num_classes, net_input_shape)
        _boxes2, _scores2, _classes2 = self.featuresToBoxes(out2, self.anchors[[1, 2, 3]],  num_classes, net_input_shape)

        if _boxes1.shape[0] == 0:
            _boxes1 = np.empty([0, 2, 2])
            _scores1 = np.empty([0,])
            _classes1 = np.empty([0,])
        if _boxes2.shape[0] == 0:
            _boxes2 = np.empty([0, 2, 2])
            _scores2 = np.empty([0,])
            _classes2 = np.empty([0,])
        boxes = np.append(_boxes1, _boxes2, axis=0)
        scores = np.append(_scores1, _scores2, axis=0)
        label_codes = np.append(_classes1, _classes2, axis=0)

        detections = np.zeros((20,6), np.float32)
        for i, score in enumerate(scores):
            if i < 20:
                detections[i] = [label_codes[i], score, boxes[i][0][1], boxes[i][0][0], boxes[i][1][1], boxes[i][1][0]]
        
        return detections


def run_detector(
    name: str,
    detection_queue: mp.Queue,
    out_events: Dict[str, mp.Event],
    avg_speed,
    start,
    model_config,
    tf_device,
    num_threads,
):
    threading.current_thread().name = f"detector:{name}"
    logger = logging.getLogger(f"detector.{name}")
    logger.info(f"Starting detection process: {os.getpid()}")
    setproctitle(f"frigate.detector.{name}")
    listen()

    stop_event = mp.Event()

    def receiveSignal(signalNumber, frame):
        stop_event.set()

    signal.signal(signal.SIGTERM, receiveSignal)
    signal.signal(signal.SIGINT, receiveSignal)

    frame_manager = SharedMemoryFrameManager()
    object_detector = LocalObjectDetector(
        model_config, tf_device=tf_device, num_threads=num_threads
    )

    outputs = {}
    for name in out_events.keys():
        out_shm = mp.shared_memory.SharedMemory(name=f"out-{name}", create=False)
        out_np = np.ndarray((20, 6), dtype=np.float32, buffer=out_shm.buf)
        outputs[name] = {"shm": out_shm, "np": out_np}

    while not stop_event.is_set():
        try:
            connection_id = detection_queue.get(timeout=5)
        except queue.Empty:
            continue
        input_frame = frame_manager.get(
            connection_id, (1, model_config.height, model_config.width, 3)
        )

        if input_frame is None:
            continue

        # detect and send the output
        start.value = datetime.datetime.now().timestamp()
        detections = object_detector.detect_raw(input_frame)
        duration = datetime.datetime.now().timestamp() - start.value
        outputs[connection_id]["np"][:] = detections[:]
        out_events[connection_id].set()
        start.value = 0.0

        avg_speed.value = (avg_speed.value * 9 + duration) / 10


class EdgeTPUProcess:
    def __init__(
        self,
        name,
        detection_queue,
        out_events,
        model_config,
        tf_device=None,
        num_threads=3,
    ):
        self.name = name
        self.out_events = out_events
        self.detection_queue = detection_queue
        self.avg_inference_speed = mp.Value("d", 0.01)
        self.detection_start = mp.Value("d", 0.0)
        self.detect_process = None
        self.model_path = model_config.path
        self.model_shape = (model_config.height, model_config.width)
        self.tf_device = tf_device
        self.num_threads = num_threads
        self.model_config = model_config
        self.start_or_restart()

    def stop(self):
        self.detect_process.terminate()
        logging.info("Waiting for detection process to exit gracefully...")
        self.detect_process.join(timeout=30)
        if self.detect_process.exitcode is None:
            logging.info("Detection process didnt exit. Force killing...")
            self.detect_process.kill()
            self.detect_process.join()

    def start_or_restart(self):
        self.detection_start.value = 0.0
        if (not self.detect_process is None) and self.detect_process.is_alive():
            self.stop()
        self.detect_process = mp.Process(
            target=run_detector,
            name=f"detector:{self.name}",
            args=(
                self.name,
                self.detection_queue,
                self.out_events,
                self.avg_inference_speed,
                self.detection_start,
                self.model_config,
                self.tf_device,
                self.num_threads,
            ),
        )
        self.detect_process.daemon = True
        self.detect_process.start()


class RemoteObjectDetector:
    def __init__(self, name, labels, detection_queue, event, model_shape):
        self.labels = labels
        self.name = name
        self.fps = EventsPerSecond()
        self.detection_queue = detection_queue
        self.event = event
        self.shm = mp.shared_memory.SharedMemory(name=self.name, create=False)
        self.np_shm = np.ndarray(
            (1, model_shape[0], model_shape[1], 3), dtype=np.uint8, buffer=self.shm.buf
        )
        self.out_shm = mp.shared_memory.SharedMemory(
            name=f"out-{self.name}", create=False
        )
        self.out_np_shm = np.ndarray((20, 6), dtype=np.float32, buffer=self.out_shm.buf)

    def detect(self, tensor_input, threshold=0.4):
        detections = []

        # copy input to shared memory
        self.np_shm[:] = tensor_input[:]
        self.event.clear()
        self.detection_queue.put(self.name)
        result = self.event.wait(timeout=10.0)

        # if it timed out
        if result is None:
            return detections

        for d in self.out_np_shm:
            if d[1] < threshold:
                break
            detections.append(
                (self.labels[int(d[0])], float(d[1]), (d[2], d[3], d[4], d[5]))
            )
        self.fps.update()
        return detections

    def cleanup(self):
        self.shm.unlink()
        self.out_shm.unlink()
