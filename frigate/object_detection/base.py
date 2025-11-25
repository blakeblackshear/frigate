import datetime
import logging
import queue
import threading
import time
from abc import ABC, abstractmethod
from collections import deque
from multiprocessing import Queue, Value
from multiprocessing.synchronize import Event as MpEvent

import numpy as np
import zmq

from frigate.comms.object_detector_signaler import (
    ObjectDetectorPublisher,
    ObjectDetectorSubscriber,
)
from frigate.config import FrigateConfig
from frigate.const import PROCESS_PRIORITY_HIGH
from frigate.detectors import create_detector
from frigate.detectors.detector_config import (
    BaseDetectorConfig,
    InputDTypeEnum,
    ModelConfig,
)
from frigate.util.builtin import EventsPerSecond, load_labels
from frigate.util.image import SharedMemoryFrameManager, UntrackedSharedMemory
from frigate.util.process import FrigateProcess

from .util import tensor_transform

logger = logging.getLogger(__name__)


class ObjectDetector(ABC):
    @abstractmethod
    def detect(self, tensor_input, threshold: float = 0.4):
        pass


class BaseLocalDetector(ObjectDetector):
    def __init__(
        self,
        detector_config: BaseDetectorConfig = None,
        labels: str = None,
        stop_event: MpEvent = None,
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

        # If the detector supports stop_event, pass it
        if hasattr(self.detect_api, "set_stop_event") and stop_event:
            self.detect_api.set_stop_event(stop_event)

    def _transform_input(self, tensor_input: np.ndarray) -> np.ndarray:
        if self.input_transform:
            tensor_input = np.transpose(tensor_input, self.input_transform)

        if self.dtype == InputDTypeEnum.float:
            tensor_input = tensor_input.astype(np.float32)
            tensor_input /= 255
        elif self.dtype == InputDTypeEnum.float_denorm:
            tensor_input = tensor_input.astype(np.float32)

        return tensor_input

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


class LocalObjectDetector(BaseLocalDetector):
    def detect_raw(self, tensor_input: np.ndarray):
        tensor_input = self._transform_input(tensor_input)
        return self.detect_api.detect_raw(tensor_input=tensor_input)


class AsyncLocalObjectDetector(BaseLocalDetector):
    def async_send_input(self, tensor_input: np.ndarray, connection_id: str):
        tensor_input = self._transform_input(tensor_input)
        return self.detect_api.send_input(connection_id, tensor_input)

    def async_receive_output(self):
        return self.detect_api.receive_output()


class DetectorRunner(FrigateProcess):
    def __init__(
        self,
        name,
        detection_queue: Queue,
        cameras: list[str],
        avg_speed: Value,
        start_time: Value,
        config: FrigateConfig,
        detector_config: BaseDetectorConfig,
        stop_event: MpEvent,
    ) -> None:
        super().__init__(stop_event, PROCESS_PRIORITY_HIGH, name=name, daemon=True)
        self.detection_queue = detection_queue
        self.cameras = cameras
        self.avg_speed = avg_speed
        self.start_time = start_time
        self.config = config
        self.detector_config = detector_config
        self.outputs: dict = {}

    def create_output_shm(self, name: str):
        out_shm = UntrackedSharedMemory(name=f"out-{name}", create=False)
        out_np = np.ndarray((20, 6), dtype=np.float32, buffer=out_shm.buf)
        self.outputs[name] = {"shm": out_shm, "np": out_np}

    def run(self) -> None:
        self.pre_run_setup(self.config.logger)

        frame_manager = SharedMemoryFrameManager()
        object_detector = LocalObjectDetector(detector_config=self.detector_config)
        detector_publisher = ObjectDetectorPublisher()

        for name in self.cameras:
            self.create_output_shm(name)

        while not self.stop_event.is_set():
            try:
                connection_id = self.detection_queue.get(timeout=1)
            except queue.Empty:
                continue
            input_frame = frame_manager.get(
                connection_id,
                (
                    1,
                    self.detector_config.model.height,
                    self.detector_config.model.width,
                    3,
                ),
            )

            if input_frame is None:
                logger.warning(f"Failed to get frame {connection_id} from SHM")
                continue

            # detect and send the output
            self.start_time.value = datetime.datetime.now().timestamp()
            detections = object_detector.detect_raw(input_frame)
            duration = datetime.datetime.now().timestamp() - self.start_time.value
            frame_manager.close(connection_id)

            if connection_id not in self.outputs:
                self.create_output_shm(connection_id)

            self.outputs[connection_id]["np"][:] = detections[:]
            detector_publisher.publish(connection_id)
            self.start_time.value = 0.0

            self.avg_speed.value = (self.avg_speed.value * 9 + duration) / 10

        detector_publisher.stop()
        logger.info("Exited detection process...")


class AsyncDetectorRunner(FrigateProcess):
    def __init__(
        self,
        name,
        detection_queue: Queue,
        cameras: list[str],
        avg_speed: Value,
        start_time: Value,
        config: FrigateConfig,
        detector_config: BaseDetectorConfig,
        stop_event: MpEvent,
    ) -> None:
        super().__init__(stop_event, PROCESS_PRIORITY_HIGH, name=name, daemon=True)
        self.detection_queue = detection_queue
        self.cameras = cameras
        self.avg_speed = avg_speed
        self.start_time = start_time
        self.config = config
        self.detector_config = detector_config
        self.outputs: dict = {}
        self._frame_manager: SharedMemoryFrameManager | None = None
        self._publisher: ObjectDetectorPublisher | None = None
        self._detector: AsyncLocalObjectDetector | None = None
        self.send_times = deque()

    def create_output_shm(self, name: str):
        out_shm = UntrackedSharedMemory(name=f"out-{name}", create=False)
        out_np = np.ndarray((20, 6), dtype=np.float32, buffer=out_shm.buf)
        self.outputs[name] = {"shm": out_shm, "np": out_np}

    def _detect_worker(self) -> None:
        logger.info("Starting Detect Worker Thread")
        while not self.stop_event.is_set():
            try:
                connection_id = self.detection_queue.get(timeout=1)
            except queue.Empty:
                continue

            input_frame = self._frame_manager.get(
                connection_id,
                (
                    1,
                    self.detector_config.model.height,
                    self.detector_config.model.width,
                    3,
                ),
            )

            if input_frame is None:
                logger.warning(f"Failed to get frame {connection_id} from SHM")
                continue

            # mark start time and send to accelerator
            self.send_times.append(time.perf_counter())
            self._detector.async_send_input(input_frame, connection_id)

    def _result_worker(self) -> None:
        logger.info("Starting Result Worker Thread")
        while not self.stop_event.is_set():
            connection_id, detections = self._detector.async_receive_output()

            # Handle timeout case (queue.Empty) - just continue
            if connection_id is None:
                continue

            if not self.send_times:
                # guard; shouldn't happen if send/recv are balanced
                continue
            ts = self.send_times.popleft()
            duration = time.perf_counter() - ts

            # release input buffer
            self._frame_manager.close(connection_id)

            if connection_id not in self.outputs:
                self.create_output_shm(connection_id)

            # write results and publish
            if detections is not None:
                self.outputs[connection_id]["np"][:] = detections[:]
            self._publisher.publish(connection_id)

            # update timers
            self.avg_speed.value = (self.avg_speed.value * 9 + duration) / 10
            self.start_time.value = 0.0

    def run(self) -> None:
        self.pre_run_setup(self.config.logger)

        self._frame_manager = SharedMemoryFrameManager()
        self._publisher = ObjectDetectorPublisher()
        self._detector = AsyncLocalObjectDetector(
            detector_config=self.detector_config, stop_event=self.stop_event
        )

        for name in self.cameras:
            self.create_output_shm(name)

        t_detect = threading.Thread(target=self._detect_worker, daemon=False)
        t_result = threading.Thread(target=self._result_worker, daemon=False)
        t_detect.start()
        t_result.start()

        try:
            while not self.stop_event.is_set():
                time.sleep(0.5)

            logger.info(
                "Stop event detected, waiting for detector threads to finish..."
            )

            # Wait for threads to finish processing
            t_detect.join(timeout=5)
            t_result.join(timeout=5)

            # Shutdown the AsyncDetector
            self._detector.detect_api.shutdown()

            self._publisher.stop()
        except Exception as e:
            logger.error(f"Error during async detector shutdown: {e}")
        finally:
            logger.info("Exited Async detection process...")


class ObjectDetectProcess:
    def __init__(
        self,
        name: str,
        detection_queue: Queue,
        cameras: list[str],
        config: FrigateConfig,
        detector_config: BaseDetectorConfig,
        stop_event: MpEvent,
    ):
        self.name = name
        self.cameras = cameras
        self.detection_queue = detection_queue
        self.avg_inference_speed = Value("d", 0.01)
        self.detection_start = Value("d", 0.0)
        self.detect_process: FrigateProcess | None = None
        self.config = config
        self.detector_config = detector_config
        self.stop_event = stop_event
        self.start_or_restart()

    def stop(self):
        # if the process has already exited on its own, just return
        if self.detect_process and self.detect_process.exitcode:
            return

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

        # Async path for MemryX
        if self.detector_config.type == "memryx":
            self.detect_process = AsyncDetectorRunner(
                f"frigate.detector:{self.name}",
                self.detection_queue,
                self.cameras,
                self.avg_inference_speed,
                self.detection_start,
                self.config,
                self.detector_config,
                self.stop_event,
            )
        else:
            self.detect_process = DetectorRunner(
                f"frigate.detector:{self.name}",
                self.detection_queue,
                self.cameras,
                self.avg_inference_speed,
                self.detection_start,
                self.config,
                self.detector_config,
                self.stop_event,
            )
        self.detect_process.start()


class RemoteObjectDetector:
    def __init__(
        self,
        name: str,
        labels: dict[int, str],
        detection_queue: Queue,
        model_config: ModelConfig,
        stop_event: MpEvent,
    ):
        self.labels = labels
        self.name = name
        self.fps = EventsPerSecond()
        self.detection_queue = detection_queue
        self.stop_event = stop_event
        self.shm = UntrackedSharedMemory(name=self.name, create=False)
        self.np_shm = np.ndarray(
            (1, model_config.height, model_config.width, 3),
            dtype=np.uint8,
            buffer=self.shm.buf,
        )
        self.out_shm = UntrackedSharedMemory(name=f"out-{self.name}", create=False)
        self.out_np_shm = np.ndarray((20, 6), dtype=np.float32, buffer=self.out_shm.buf)
        self.detector_subscriber = ObjectDetectorSubscriber(name)

    def detect(self, tensor_input, threshold=0.4):
        detections = []

        if self.stop_event.is_set():
            return detections

        # Drain any stale detection results from the ZMQ buffer before making a new request
        # This prevents reading detection results from a previous request
        # NOTE: This should never happen, but can in some rare cases
        while True:
            try:
                self.detector_subscriber.socket.recv_string(flags=zmq.NOBLOCK)
            except zmq.Again:
                break

        # copy input to shared memory
        self.np_shm[:] = tensor_input[:]
        self.detection_queue.put(self.name)
        result = self.detector_subscriber.check_for_update()

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
        self.detector_subscriber.stop()
        self.shm.unlink()
        self.out_shm.unlink()
