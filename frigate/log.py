# adapted from https://medium.com/@jonathonbao/python3-logging-with-multiprocessing-f51f460b8778
import logging
import threading
import os
import signal
import queue
import multiprocessing as mp
from multiprocessing.queues import Queue
from logging import handlers
from typing import Optional
from types import FrameType
from setproctitle import setproctitle
from typing import Deque, Optional
from types import FrameType
from collections import deque

from frigate.util import clean_camera_user_pass


def listener_configurer() -> None:
    root = logging.getLogger()

    if root.hasHandlers():
        root.handlers.clear()

    console_handler = logging.StreamHandler()
    formatter = logging.Formatter(
        "[%(asctime)s] %(name)-30s %(levelname)-8s: %(message)s", "%Y-%m-%d %H:%M:%S"
    )
    console_handler.setFormatter(formatter)
    root.addHandler(console_handler)
    root.setLevel(logging.INFO)


def root_configurer(queue: Queue) -> None:
    h = handlers.QueueHandler(queue)
    root = logging.getLogger()

    if root.hasHandlers():
        root.handlers.clear()

    root.addHandler(h)
    root.setLevel(logging.INFO)


def log_process(log_queue: Queue) -> None:
    threading.current_thread().name = f"logger"
    setproctitle("frigate.logger")
    listener_configurer()

    stop_event = mp.Event()

    def receiveSignal(signalNumber: int, frame: Optional[FrameType]) -> None:
        stop_event.set()

    signal.signal(signal.SIGTERM, receiveSignal)
    signal.signal(signal.SIGINT, receiveSignal)

    while True:
        try:
            record = log_queue.get(timeout=1)
        except (queue.Empty, KeyboardInterrupt):
            if stop_event.is_set():
                break
            continue
        logger = logging.getLogger(record.name)
        logger.handle(record)


# based on https://codereview.stackexchange.com/a/17959
class LogPipe(threading.Thread):
    def __init__(self, log_name: str):
        """Setup the object with a logger and start the thread"""
        threading.Thread.__init__(self)
        self.daemon = False
        self.logger = logging.getLogger(log_name)
        self.level = logging.ERROR
        self.deque: Deque[str] = deque(maxlen=100)
        self.fdRead, self.fdWrite = os.pipe()
        self.pipeReader = os.fdopen(self.fdRead)
        self.start()

    def cleanup_log(self, log: str) -> str:
        """Cleanup the log line to remove sensitive info and string tokens."""
        log = clean_camera_user_pass(log).strip("\n")
        return log

    def fileno(self) -> int:
        """Return the write file descriptor of the pipe"""
        return self.fdWrite

    def run(self) -> None:
        """Run the thread, logging everything."""
        for line in iter(self.pipeReader.readline, ""):
            self.deque.append(self.cleanup_log(line))

        self.pipeReader.close()

    def dump(self) -> None:
        while len(self.deque) > 0:
            self.logger.log(self.level, self.deque.popleft())

    def close(self) -> None:
        """Close the write end of the pipe."""
        os.close(self.fdWrite)
