import numpy as np
import multiprocessing as mp
from multiprocessing.shared_memory import SharedMemory
from majortomo import Client
from frigate.util import EventsPerSecond
from .detector_config import ModelConfig, DetectionServerConfig


class ObjectDetectionClient:
    def __init__(
        self,
        camera_name: str,
        labels,
        model_config: ModelConfig,
        server_config: DetectionServerConfig,
        timeout=None,
    ):
        self.camera_name = camera_name
        self.labels = labels
        self.model_config = model_config
        self.fps = EventsPerSecond()
        self.in_shm = SharedMemory(name=self.camera_name, create=False)
        self.in_np_shm = np.ndarray(
            (1, model_config.height, model_config.width, 3),
            dtype=np.uint8,
            buffer=self.in_shm.buf,
        )
        self.out_shm = SharedMemory(name=f"out-{self.camera_name}", create=False)
        self.out_np_shm = np.ndarray((20, 6), dtype=np.float32, buffer=self.out_shm.buf)

        self.timeout = timeout
        self.detection_client = Client(server_config.ipc)
        self.detection_client.connect()

    def detect(self, tensor_input, threshold=0.4):
        detections = []
        # copy input to shared memory
        self.in_np_shm[:] = tensor_input[:]

        try:
            self.detection_client.send(
                f"{self.camera_name}".encode("ascii"),
                f"{self.camera_name}".encode("ascii"),
                self.model_config.height.to_bytes(4, "little"),
                self.model_config.width.to_bytes(4, "little"),
            )
            result = self.detection_client.recv_all_as_list(timeout=self.timeout)
            if len(result) == 1:
                # output came back in the reply rather than direct to SHM
                output = np.frombuffer(result[0], dtype=np.float32)
                self.out_np_shm[:] = np.reshape(output, newshape=(20, 6))[:]
        except TimeoutError:
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
        self.detection_client.close()
        self.in_shm.close()
        self.out_shm.close()
