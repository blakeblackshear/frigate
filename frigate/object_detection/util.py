"""Object detection utilities."""

import queue
import threading

from numpy import ndarray

from frigate.detectors.detector_config import InputTensorEnum, ModelConfig
from frigate.util.image import UntrackedSharedMemory


def create_detection_input_shm(
    camera: str, models: list[ModelConfig]
) -> UntrackedSharedMemory:
    """Create the shared memory a camera hands detection frames through.

    It is sized for the largest model so a camera re-added under the same name
    with another scene can reuse it. Detectors keep mappings of it, so it is
    never unlinked while they run.

    Args:
        camera: Name of the camera
        models: Every configured model

    Returns:
        The camera's detection input segment
    """
    size = max(model.height * model.width * 3 for model in models)

    try:
        return UntrackedSharedMemory(name=camera, create=True, size=size)
    except FileExistsError:
        shm = UntrackedSharedMemory(name=camera)

    if shm.size >= size:
        return shm

    # left by an earlier run with smaller models, so no detector maps it yet
    shm.close()
    shm.unlink()
    return UntrackedSharedMemory(name=camera, create=True, size=size)


class RequestStore:
    """
    A thread-safe hash-based response store that handles creating requests.
    """

    def __init__(self) -> None:
        self.request_counter = 0
        self.request_counter_lock = threading.Lock()
        self.input_queue: queue.Queue[tuple[int, ndarray]] = queue.Queue()

    def __get_request_id(self) -> int:
        with self.request_counter_lock:
            request_id = self.request_counter
            self.request_counter += 1
            if self.request_counter > 1000000:
                self.request_counter = 0
        return request_id

    def put(self, tensor_input: ndarray) -> int:
        request_id = self.__get_request_id()
        self.input_queue.put((request_id, tensor_input))
        return request_id

    def get(self) -> tuple[int, ndarray] | None:
        try:
            return self.input_queue.get()
        except Exception:
            return None


class ResponseStore:
    """
    A thread-safe hash-based response store that maps request IDs
    to their results. Threads can wait on the condition variable until
    their request's result appears.
    """

    def __init__(self) -> None:
        self.responses: dict[
            int, ndarray
        ] = {}  # Maps request_id -> (original_input, infer_results)
        self.lock = threading.Lock()
        self.cond = threading.Condition(self.lock)

    def put(self, request_id: int, response: ndarray) -> None:
        with self.cond:
            self.responses[request_id] = response
            self.cond.notify_all()

    def get(self, request_id: int, timeout: float | None = None) -> ndarray:
        with self.cond:
            if not self.cond.wait_for(
                lambda: request_id in self.responses, timeout=timeout
            ):
                raise TimeoutError(f"Timeout waiting for response {request_id}")

            return self.responses.pop(request_id)


def tensor_transform(
    desired_shape: InputTensorEnum,
) -> tuple[int, int, int, int] | None:
    # Currently this function only supports BHWC permutations
    if desired_shape == InputTensorEnum.nhwc:
        return None
    elif desired_shape == InputTensorEnum.nchw:
        return (0, 3, 1, 2)
    elif desired_shape == InputTensorEnum.hwnc:
        return (1, 2, 0, 3)
    elif desired_shape == InputTensorEnum.hwcn:
        return (1, 2, 3, 0)
