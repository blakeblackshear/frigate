"""Facilitates communication between processes."""

import multiprocessing as mp
import threading
from multiprocessing.synchronize import Event as MpEvent
from typing import Callable

import zmq

from frigate.comms.dispatcher import Communicator

SOCKET_REP_REQ = "ipc:///tmp/cache/comms"


class InterProcessCommunicator(Communicator):
    def __init__(self) -> None:
        self.context = zmq.Context()
        self.socket = self.context.socket(zmq.REP)
        self.socket.bind(SOCKET_REP_REQ)
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
            while True:  # load all messages that are queued
                has_message, _, _ = zmq.select([self.socket], [], [], 1)

                if not has_message:
                    break

                try:
                    (topic, value) = self.socket.recv_json(flags=zmq.NOBLOCK)

                    response = self._dispatcher(topic, value)

                    if response is not None:
                        self.socket.send_json(response)
                    else:
                        self.socket.send_json([])
                except zmq.ZMQError:
                    break

    def stop(self) -> None:
        self.stop_event.set()
        self.reader_thread.join()
        self.socket.close()
        self.context.destroy()


class InterProcessRequestor:
    """Simplifies sending data to InterProcessCommunicator and getting a reply."""

    def __init__(self) -> None:
        self.context = zmq.Context()
        self.socket = self.context.socket(zmq.REQ)
        self.socket.connect(SOCKET_REP_REQ)

    def send_data(self, topic: str, data: any) -> any:
        """Sends data and then waits for reply."""
        try:
            self.socket.send_json((topic, data))
            return self.socket.recv_json()
        except zmq.ZMQError:
            return ""

    def stop(self) -> None:
        self.socket.close()
        self.context.destroy()
