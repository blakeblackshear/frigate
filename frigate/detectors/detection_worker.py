import datetime
import logging
import os
import threading
import numpy as np
import multiprocessing as mp
from multiprocessing.shared_memory import SharedMemory
from typing import List

from frigate.majordomo import QueueWorker
from frigate.util import listen, EventsPerSecond, load_labels
from .detector_config import InputTensorEnum, BaseDetectorConfig
from .detector_types import create_detector

from setproctitle import setproctitle

logger = logging.getLogger(__name__)


class ObjectDetectionWorker(QueueWorker):
    def __init__(
        self,
        detector_name: str,
        detector_config: BaseDetectorConfig,
        avg_inference_speed: mp.Value = mp.Value("d", 0.01),
        detection_start: mp.Value = mp.Value("d", 0.00),
        labels=None,
        stop_event: mp.Event = None,
    ):
        super().__init__(
            broker_url=detector_config.address,
            service_names=detector_config.cameras,
            handler_name="DETECT_NO_SHM" if not detector_config.shared_memory else None,
            stop_event=stop_event,
        )
        self.detector_name = detector_name
        self.detector_config = detector_config
        self.avg_inference_speed = avg_inference_speed
        self.detection_start = detection_start
        self.detection_shms: dict[str, SharedMemory] = {}
        self.detection_outputs = {}

        self.fps = EventsPerSecond()
        self.shm_shape = (
            1,
            self.detector_config.model.height,
            self.detector_config.model.width,
            3,
        )
        self.out_shm = None
        self.out_np = None

        self.labels = labels
        if self.labels is None:
            self.labels = {}
        else:
            self.labels = load_labels(self.labels)

        if self.detector_config:
            self.input_transform = self.tensor_transform(
                self.detector_config.model.input_tensor
            )
        else:
            self.input_transform = None

        self.detect_api = create_detector(self.detector_config)

    def handle_request(self, client_id: bytes, request: List[bytes]):
        self.detection_start.value = datetime.datetime.now().timestamp()

        # expected request format:
        # if SHM: [camera_name, model.height, model.width]
        # else: [tensor_input]
        # detect and send the output
        detections = None
        frames = []
        if len(request) == 1:
            detections = self.detect_raw(request[0])
            if detections is None:
                self.detection_start.value = 0.0
                return frames
            frames.append(detections.tobytes())

        elif len(request) == 3:
            camera_name = request[0].decode("ascii")
            shm_shape = (
                1,
                int.from_bytes(request[1], byteorder="little"),
                int.from_bytes(request[2], byteorder="little"),
                3,
            )
            detections = self.detect_shm(camera_name, shm_shape)
            out_np = self.detection_outputs.get(camera_name, None)
            if out_np is None:
                out_shm = self.detection_shms.get(f"out-{camera_name}", None)
                if out_shm is None:
                    out_shm = SharedMemory(name=f"out-{camera_name}", create=False)
                out_np = self.detection_outputs[camera_name] = np.ndarray(
                    (20, 6), dtype=np.float32, buffer=out_shm.buf
                )
            out_np[:] = detections[:]

        duration = datetime.datetime.now().timestamp() - self.detection_start.value
        self.detection_start.value = 0.0
        self.avg_inference_speed.value = (
            self.avg_inference_speed.value * 9 + duration
        ) / 10
        return frames

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
        if self.input_transform:
            tensor_input = np.transpose(tensor_input, self.input_transform)
        detections = self.detect_api.detect_raw(tensor_input=tensor_input)
        return detections

    def detect_shm(self, camera_name, shm_shape):
        in_shm = self.detection_shms.get(camera_name)
        if in_shm is None:
            in_shm = self.detection_shms[camera_name] = SharedMemory(camera_name)

        tensor_input = np.ndarray(shm_shape, dtype=np.uint8, buffer=in_shm.buf)
        detections = self.detect_raw(tensor_input=tensor_input)
        return detections

    def tensor_transform(self, desired_shape):
        # Currently this function only supports BHWC permutations
        if desired_shape == InputTensorEnum.nhwc:
            return None
        elif desired_shape == InputTensorEnum.nchw:
            return (0, 3, 1, 2)

    def close(self):
        super().close()
        self.detection_outputs = {}
        while len(self.detection_shms) > 0:
            shm = self.detection_shms.popitem()
            shm[1].close()


def run_detector(
    detector_name, detector_config, avg_inference_speed, detection_start, labels
):
    threading.current_thread().name = f"detector:{detector_name}"
    logger = logging.getLogger(f"detector.{detector_name}")
    logger.info(f"Starting detection process: {os.getpid()}")
    setproctitle(f"frigate.detector.{detector_name}")
    listen()

    worker = ObjectDetectionWorker(
        detector_name,
        detector_config,
        avg_inference_speed,
        detection_start,
        labels,
    )
    worker.start()


class ObjectDetectProcess:
    def __init__(
        self,
        detector_name: str,
        detector_config: BaseDetectorConfig,
        labels=None,
    ):
        self.detector_name = detector_name
        self.detector_config = detector_config
        self.labels = labels

        self.avg_inference_speed = mp.Value("d", 0.01)
        self.detection_start = mp.Value("d", 0.0)
        self.detect_process: mp.Process

        self.start_or_restart()

    def stop(self):
        self.detect_process.terminate()
        logging.info("Waiting for detection process to exit gracefully...")
        self.detect_process.join(timeout=30)
        if self.detect_process.exitcode is None:
            logging.info("Detection process didn't exit. Force killing...")
            self.detect_process.kill()
            self.detect_process.join()

    def start_or_restart(self):
        self.detection_start.value = 0.0
        if (not self.detect_process is None) and self.detect_process.is_alive():
            self.stop()
        self.detect_process = mp.Process(
            target=run_detector,
            name=f"detector:{self.detector_name}",
            args=(
                self.detector_name,
                self.detector_config,
                self.avg_inference_speed,
                self.detection_start,
                self.labels,
            ),
        )
        self.detect_process.daemon = True
        self.detect_process.start()
