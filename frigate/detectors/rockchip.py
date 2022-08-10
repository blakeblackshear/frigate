"""Handles detection with rockchip TPUs."""

import datetime
import logging
import multiprocessing as mp
import os
import queue
import signal
import threading
from abc import ABC, abstractmethod

import numpy as np
from setproctitle import setproctitle
from rknnlite.api import RKNNLite

from frigate.detectors.detector import ObjectDetector
from frigate.util import EventsPerSecond, SharedMemoryFrameManager, listen, load_labels

logger = logging.getLogger(__name__)

class LocalObjectDetector(ObjectDetector):
    def __init__(self, rk_device=None, model_path=None, labels=None):
        self.fps = EventsPerSecond()
        if labels is None:
            self.labels = {}
        else:
            self.labels = load_labels(labels)

        try:
            self.rknn = RKNNLite()
            self.rknn.load_rknn(model_path or "/precompiled_models/rockchip_rk1808_default.rknn")
        except ValueError:
            logger.error(f"Not able to load rk model at {model_path}.")
            raise

        try:
            self.rknn.init_runtime('rk1808')
        except ValueError as e:
            logger.error(f"Not able to init rk model: {e}.")
            raise

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

    def detect_raw(self, tensor_input):
        self.rknn.inference(inputs=[tensor_input])
        # TODO figure out how to use the model output to get values
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

def run_detector(
    name: str,
    detection_queue: mp.Queue,
    out_events: dict[str, mp.Event],
    avg_speed,
    start,
    model_path,
    model_shape,
    rk_device,
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
        rk_device=rk_device,
        model_path=model_path,
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
            connection_id, (1, model_shape[0], model_shape[1], 3)
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

class RockchipTPUProcess:
    def __init__(
        self,
        name,
        detection_queue,
        out_events,
        model_path,
        model_shape,
        rk_device=None,
    ):
        self.name = name
        self.out_events = out_events
        self.detection_queue = detection_queue
        self.avg_inference_speed = mp.Value("d", 0.01)
        self.detection_start = mp.Value("d", 0.0)
        self.detect_process = None
        self.model_path = model_path
        self.model_shape = model_shape
        self.rk_device = rk_device
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
                self.model_path,
                self.model_shape,
                self.rk_device,
            ),
        )
        self.detect_process.daemon = True
        self.detect_process.start()