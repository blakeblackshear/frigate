"""Facilitates communication between processes."""

import multiprocessing as mp
import os
import threading
from multiprocessing.synchronize import Event as MpEvent
from typing import Callable

import zmq

from frigate.comms.dispatcher import Communicator
from frigate.const import PORT_INTER_PROCESS_COMM


class InterProcessCommunicator(Communicator):
    def __init__(self) -> None:
        INTER_PROCESS_COMM_PORT = (
            os.environ.get("INTER_PROCESS_COMM_PORT") or PORT_INTER_PROCESS_COMM
        )
        self.context = zmq.Context()
        self.socket = self.context.socket(zmq.REP)
        self.socket.bind(f"tcp://127.0.0.1:{INTER_PROCESS_COMM_PORT}")
        self.stop_event: MpEvent = mp.Event()

    def publish(self, topic: str, payload: str, retain: bool) -> None:
        """There is no communication back to the processes."""
        pass

    def subscribe(self, receiver: Callable) -> None:
        self._dispatcher = receiver
        self.reader_thread = threading.Thread(target=self.read)
        self.reader_thread.start()

    def read(self) -> None:
        while not self.stop_event.wait(0.5):
            while True:  # load all messages that are queued
                try:
                    (topic, value) = self.socket.recv_pyobj(flags=zmq.NOBLOCK)

                    response = self._dispatcher(topic, value)

                    if response is not None:
                        self.socket.send_pyobj(response)
                    else:
                        self.socket.send_pyobj([])
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
        port = os.environ.get("INTER_PROCESS_COMM_PORT") or PORT_INTER_PROCESS_COMM
        self.context = zmq.Context()
        self.socket = self.context.socket(zmq.REQ)
        self.socket.connect(f"tcp://127.0.0.1:{port}")

    def send_data(self, topic: str, data: any) -> any:
        """Sends data and then waits for reply."""
        self.socket.send_pyobj((topic, data))
        return self.socket.recv_pyobj()

    def stop(self) -> None:
        self.socket.close()
        self.context.destroy()
