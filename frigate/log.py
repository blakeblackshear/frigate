# adapted from https://medium.com/@jonathonbao/python3-logging-with-multiprocessing-f51f460b8778
import logging
import threading
import os
import signal
import queue
from multiprocessing.queues import Queue
from logging import handlers
from setproctitle import setproctitle
from typing import Deque
from collections import deque


def listener_configurer() -> None:
    root = logging.getLogger()
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
    root.addHandler(h)
    root.setLevel(logging.INFO)


def log_process(log_queue: Queue) -> None:
    threading.current_thread().name = f"logger"
    setproctitle("frigate.logger")
    listener_configurer()
    while True:
        try:
            record = log_queue.get(timeout=5)
        except (queue.Empty, KeyboardInterrupt):
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

    def fileno(self) -> int:
        """Return the write file descriptor of the pipe"""
        return self.fdWrite

    def run(self) -> None:
        """Run the thread, logging everything."""
        for line in iter(self.pipeReader.readline, ""):
            self.deque.append(line.strip("\n"))

        self.pipeReader.close()

    def dump(self) -> None:
        while len(self.deque) > 0:
            self.logger.log(self.level, self.deque.popleft())

    def close(self) -> None:
        """Close the write end of the pipe."""
        os.close(self.fdWrite)
