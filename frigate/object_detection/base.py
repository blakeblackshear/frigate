import datetime
import logging
import multiprocessing as mp
import os
import queue
import signal
import threading
from abc import ABC, abstractmethod
from multiprocessing import Queue, Value
from multiprocessing.synchronize import Event as MpEvent

import numpy as np
from setproctitle import setproctitle

import frigate.util as util
from frigate.detectors import create_detector
from frigate.detectors.detector_config import (
    BaseDetectorConfig,
    InputDTypeEnum,
    ModelConfig,
)
from frigate.util.builtin import EventsPerSecond, load_labels
from frigate.util.image import SharedMemoryFrameManager, UntrackedSharedMemory
from frigate.util.services import listen

from .util import tensor_transform

logger = logging.getLogger(__name__)


class ObjectDetector(ABC):
    @abstractmethod
    def detect(self, tensor_input, threshold: float = 0.4):
        pass


class LocalObjectDetector(ObjectDetector):
    def __init__(
        self,
        detector_config: BaseDetectorConfig = None,
        labels: str = None,
    ):
        self.fps = EventsPerSecond()
        if labels is None:
            self.labels = {}
        else:
            self.labels = load_labels(labels)

        if detector_config:
            self.input_transform = tensor_transform(detector_config.model.input_tensor)

            self.dtype = detector_config.model.input_dtype
        else:
            self.input_transform = None
            self.dtype = InputDTypeEnum.int

        self.detect_api = create_detector(detector_config)

    def detect(self, tensor_input: np.ndarray, threshold=0.4):
        detections = []

        raw_detections = self.detect_raw(tensor_input)

        for d in raw_detections:
            if int(d[0]) < 0 or int(d[0]) >= len(self.labels):
                logger.warning(f"Raw Detect returned invalid label: {d}")
                continue
            if d[1] < threshold:
                break
            detections.append(
                (self.labels[int(d[0])], float(d[1]), (d[2], d[3], d[4], d[5]))
            )
        self.fps.update()
        return detections

    def detect_raw(self, tensor_input: np.ndarray):
        if self.input_transform:
            tensor_input = np.transpose(tensor_input, self.input_transform)

        if self.dtype == InputDTypeEnum.float:
            tensor_input = tensor_input.astype(np.float32)
            tensor_input /= 255
        elif self.dtype == InputDTypeEnum.float_denorm:
            tensor_input = tensor_input.astype(np.float32)

        return self.detect_api.detect_raw(tensor_input=tensor_input)


def run_detector(
    name: str,
    detection_queue: Queue,
    out_events: dict[str, MpEvent],
    avg_speed: Value,
    start: Value,
    detector_config: BaseDetectorConfig,
):
    threading.current_thread().name = f"detector:{name}"
    logger = logging.getLogger(f"detector.{name}")
    logger.info(f"Starting detection process: {os.getpid()}")
    setproctitle(f"frigate.detector.{name}")
    listen()

    stop_event: MpEvent = mp.Event()

    def receiveSignal(signalNumber, frame):
        stop_event.set()

    signal.signal(signal.SIGTERM, receiveSignal)
    signal.signal(signal.SIGINT, receiveSignal)

    frame_manager = SharedMemoryFrameManager()
    object_detector = LocalObjectDetector(detector_config=detector_config)

    outputs = {}
    for name in out_events.keys():
        out_shm = UntrackedSharedMemory(name=f"out-{name}", create=False)
        out_np = np.ndarray((20, 6), dtype=np.float32, buffer=out_shm.buf)
        outputs[name] = {"shm": out_shm, "np": out_np}

    while not stop_event.is_set():
        try:
            connection_id = detection_queue.get(timeout=1)
        except queue.Empty:
            continue
        input_frame = frame_manager.get(
            connection_id,
            (1, detector_config.model.height, detector_config.model.width, 3),
        )

        if input_frame is None:
            logger.warning(f"Failed to get frame {connection_id} from SHM")
            continue

        # detect and send the output
        start.value = datetime.datetime.now().timestamp()
        detections = object_detector.detect_raw(input_frame)
        duration = datetime.datetime.now().timestamp() - start.value
        frame_manager.close(connection_id)
        outputs[connection_id]["np"][:] = detections[:]
        out_events[connection_id].set()
        start.value = 0.0

        avg_speed.value = (avg_speed.value * 9 + duration) / 10

    logger.info("Exited detection process...")


class ObjectDetectProcess:
    def __init__(
        self,
        name: str,
        detection_queue: Queue,
        out_events: dict[str, MpEvent],
        detector_config: BaseDetectorConfig,
    ):
        self.name = name
        self.out_events = out_events
        self.detection_queue = detection_queue
        self.avg_inference_speed = Value("d", 0.01)
        self.detection_start = Value("d", 0.0)
        self.detect_process: util.Process | None = None
        self.detector_config = detector_config
        self.start_or_restart()

    def stop(self):
        # if the process has already exited on its own, just return
        if self.detect_process and self.detect_process.exitcode:
            return
        self.detect_process.terminate()
        logging.info("Waiting for detection process to exit gracefully...")
        self.detect_process.join(timeout=30)
        if self.detect_process.exitcode is None:
            logging.info("Detection process didn't exit. Force killing...")
            self.detect_process.kill()
            self.detect_process.join()
        logging.info("Detection process has exited...")

    def start_or_restart(self):
        self.detection_start.value = 0.0
        if (self.detect_process is not None) and self.detect_process.is_alive():
            self.stop()
        self.detect_process = util.Process(
            target=run_detector,
            name=f"detector:{self.name}",
            args=(
                self.name,
                self.detection_queue,
                self.out_events,
                self.avg_inference_speed,
                self.detection_start,
                self.detector_config,
            ),
        )
        self.detect_process.daemon = True
        self.detect_process.start()


class RemoteObjectDetector:
    def __init__(
        self,
        name: str,
        labels: dict[int, str],
        detection_queue: Queue,
        event: MpEvent,
        model_config: ModelConfig,
        stop_event: MpEvent,
    ):
        self.labels = labels
        self.name = name
        self.fps = EventsPerSecond()
        self.detection_queue = detection_queue
        self.event = event
        self.stop_event = stop_event
        self.shm = UntrackedSharedMemory(name=self.name, create=False)
        self.np_shm = np.ndarray(
            (1, model_config.height, model_config.width, 3),
            dtype=np.uint8,
            buffer=self.shm.buf,
        )
        self.out_shm = UntrackedSharedMemory(name=f"out-{self.name}", create=False)
        self.out_np_shm = np.ndarray((20, 6), dtype=np.float32, buffer=self.out_shm.buf)

    def detect(self, tensor_input, threshold=0.4):
        detections = []

        if self.stop_event.is_set():
            return detections

        # copy input to shared memory
        self.np_shm[:] = tensor_input[:]
        self.event.clear()
        self.detection_queue.put(self.name)
        result = self.event.wait(timeout=5.0)

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
