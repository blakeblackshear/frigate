import datetime
import logging
import multiprocessing as mp
import queue
from abc import ABC, abstractmethod
from multiprocessing.synchronize import Event

import numpy as np

from frigate import util
from frigate.detectors import create_detector
from frigate.detectors.detector_config import InputTensorEnum
from frigate.util.builtin import EventsPerSecond, load_labels
from frigate.util.image import SharedMemoryFrameManager

logger = logging.getLogger(__name__)


class ObjectDetector(ABC):
    @abstractmethod
    def detect(self, tensor_input, threshold=0.4):
        pass


def tensor_transform(desired_shape):
    # Currently this function only supports BHWC permutations
    if desired_shape == InputTensorEnum.nhwc:
        return None
    elif desired_shape == InputTensorEnum.nchw:
        return (0, 3, 1, 2)


class LocalObjectDetector(ObjectDetector):
    def __init__(
        self,
        detector_config=None,
        labels=None,
    ):
        self.fps = EventsPerSecond()
        if labels is None:
            self.labels = {}
        else:
            self.labels = load_labels(labels)

        if detector_config:
            self.input_transform = tensor_transform(detector_config.model.input_tensor)
        else:
            self.input_transform = None

        self.detect_api = create_detector(detector_config)

    def detect(self, tensor_input, threshold=0.4):
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

    def detect_raw(self, tensor_input):
        if self.input_transform:
            tensor_input = np.transpose(tensor_input, self.input_transform)
        return self.detect_api.detect_raw(tensor_input=tensor_input)


class RemoteObjectDetector(ObjectDetector):
    def __init__(self, name, labels, detection_queue, event, model_config, stop_event):
        self.labels = labels
        self.name = name
        self.fps = EventsPerSecond()
        self.detection_queue = detection_queue
        self.event = event
        self.stop_event = stop_event
        self.shm = mp.shared_memory.SharedMemory(name=self.name, create=False)
        self.np_shm = np.ndarray(
            (1, model_config.height, model_config.width, 3),
            dtype=np.uint8,
            buffer=self.shm.buf,
        )
        self.out_shm = mp.shared_memory.SharedMemory(
            name=f"out-{self.name}", create=False
        )
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


class ObjectDetectProcess(util.Process):
    def __init__(
        self,
        detector_name: str,
        detection_queue: mp.Queue,
        out_events: dict[str, Event],
        detector_config,
    ):
        super().__init__(name=f"frigate.detector:{detector_name}", daemon=True)

        self.detector_name = detector_name
        self.detection_queue = detection_queue
        self.out_events = out_events
        self.detector_config = detector_config

        self.avg_inference_speed = mp.Value("d", 0.01)
        self.detection_start = mp.Value("d", 0.0)

    def run(self):
        self.logger.info(f"Starting detection process: {self.pid}")

        frame_manager = SharedMemoryFrameManager()
        object_detector = LocalObjectDetector(detector_config=self.detector_config)

        outputs = {}
        for event_name in self.out_events.keys():
            out_shm = mp.shared_memory.SharedMemory(
                name=f"out-{event_name}", create=False
            )
            out_np = np.ndarray((20, 6), dtype=np.float32, buffer=out_shm.buf)
            outputs[event_name] = {"shm": out_shm, "np": out_np}

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
                self.logger.warning(f"Failed to get frame {connection_id} from SHM")
                continue

            # detect and send the output
            self.detection_start.value = datetime.datetime.now().timestamp()
            detections = object_detector.detect_raw(input_frame)
            duration = datetime.datetime.now().timestamp() - self.detection_start.value
            frame_manager.close(connection_id)
            outputs[connection_id]["np"][:] = detections[:]
            self.out_events[connection_id].set()
            self.detection_start.value = 0.0

            self.avg_inference_speed.value = (
                self.avg_inference_speed.value * 9 + duration
            ) / 10

        self.logger.info("Exited detection process...")
