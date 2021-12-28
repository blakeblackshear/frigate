import datetime
import logging
import multiprocessing as mp
import os
import queue
import signal
import threading
import os
import numpy as np
import multiprocessing as mp
from frigate.util import EventsPerSecond, SharedMemoryFrameManager, listen
from frigate.config import DetectorConfig, DetectorTypeEnum
from frigate.detection.object_detector import ObjectDetector
import importlib
from setproctitle import setproctitle
from typing import Dict, Callable


logger = logging.getLogger(__name__)


DETECTORS = {
    DetectorTypeEnum.cpu: "edgetpu",
    DetectorTypeEnum.edgetpu: "edgetpu",
    DetectorTypeEnum.tensorrt: "tensorrt",
}


def get_object_detector_factory(
    detector_config: DetectorConfig, model_path: str
) -> Callable[[], ObjectDetector]:
    """
    Return an object detector factory.
    Since resource initialization might be performed on python import,
    delay module load until the thread started
    """
    detector_module = DETECTORS.get(detector_config.type)
    if detector_module is None:
        logger.error(f"Unsupported detector type '{detector_config.type}'.")
        return None

    def _detector_factory() -> ObjectDetector:
        path = os.path.join(os.path.dirname(__file__), f"{detector_module}.py")
        spec = importlib.util.spec_from_file_location(
            f"frigate.detection.{detector_module}", path
        )
        module = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(module)
        object_detector = module.object_detector_factory(detector_config, model_path)
        return object_detector

    return _detector_factory


def run_detector(
    name: str,
    detection_queue: mp.Queue,
    out_events: Dict[str, mp.Event],
    avg_speed,
    start,
    model_shape,
    object_detector_factory: Callable[[], ObjectDetector],
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

    outputs = {}
    for name in out_events.keys():
        out_shm = mp.shared_memory.SharedMemory(name=f"out-{name}", create=False)
        out_np = np.ndarray((20, 6), dtype=np.float32, buffer=out_shm.buf)
        outputs[name] = {"shm": out_shm, "np": out_np}

    object_detector = object_detector_factory()
    while not stop_event.is_set():
        try:
            connection_id = detection_queue.get(timeout=5)
        except queue.Empty:
            continue
        input_frame = frame_manager.get(
            connection_id, (model_shape[0], model_shape[1], 3)
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
    del object_detector


class DetectionProcess:
    def __init__(
        self,
        name,
        detection_queue,
        out_events,
        model_path,
        model_shape,
        detector_config: DetectorConfig,
    ):
        self.name = name
        self.out_events = out_events
        self.detection_queue = detection_queue
        self.avg_inference_speed = mp.Value("d", 0.01)
        self.detection_start = mp.Value("d", 0.0)
        self.detect_process = None
        self.model_path = model_path
        self.model_shape = model_shape
        self.detector_config = detector_config

        self.object_detector_factory = get_object_detector_factory(
            detector_config, model_path
        )
        if self.object_detector_factory:
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
                self.model_shape,
                self.object_detector_factory,
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
            label_key = int(d[0])
            if label_key in self.labels:
                detections.append(
                    (self.labels[label_key], float(d[1]), (d[2], d[3], d[4], d[5]))
                )
        self.fps.update()
        return detections

    def cleanup(self):
        self.shm.unlink()
        self.out_shm.unlink()
