import multiprocessing as mp
import queue
import threading
from multiprocessing.synchronize import Event as MpEvent
from typing import Callable

from faster_fifo import Queue

from frigate.comms.dispatcher import Communicator


class InterProcessCommunicator(Communicator):
    def __init__(self, queue: Queue) -> None:
        self.queue = queue
        self.stop_event: MpEvent = mp.Event()

    def publish(self, topic: str, payload: str, retain: bool) -> None:
        """There is no communication back to the processes."""
        pass

    def subscribe(self, receiver: Callable) -> None:
        self._dispatcher = receiver
        self.reader_thread = threading.Thread(target=self.read)
        self.reader_thread.start()

    def read(self) -> None:
        while not self.stop_event.is_set():
            try:
                (
                    topic,
                    value,
                ) = self.queue.get(True, 1)
            except queue.Empty:
                continue

            self._dispatcher(topic, value)

    def stop(self) -> None:
        self.stop_event.set()
        self.reader_thread.join()
