# adapted from https://medium.com/@jonathonbao/python3-logging-with-multiprocessing-f51f460b8778
import logging
import threading
import os
import signal
import queue
import multiprocessing as mp
from logging import handlers
from setproctitle import setproctitle
from collections import deque


def listener_configurer():
    root = logging.getLogger()
    console_handler = logging.StreamHandler()
    formatter = logging.Formatter("%(name)-30s %(levelname)-8s: %(message)s")
    console_handler.setFormatter(formatter)
    root.addHandler(console_handler)
    root.setLevel(logging.INFO)


def root_configurer(queue):
    h = handlers.QueueHandler(queue)
    root = logging.getLogger()
    root.addHandler(h)
    root.setLevel(logging.INFO)


def log_process(log_queue):
    stop_event = mp.Event()

    def receiveSignal(signalNumber, frame):
        stop_event.set()

    signal.signal(signal.SIGTERM, receiveSignal)
    signal.signal(signal.SIGINT, receiveSignal)

    threading.current_thread().name = f"logger"
    setproctitle("frigate.logger")
    listener_configurer()
    while True:
        if stop_event.is_set() and log_queue.empty():
            break
        try:
            record = log_queue.get(timeout=5)
        except queue.Empty:
            continue
        logger = logging.getLogger(record.name)
        logger.handle(record)


# based on https://codereview.stackexchange.com/a/17959
class LogPipe(threading.Thread):
    def __init__(self, log_name, level):
        """Setup the object with a logger and a loglevel
        and start the thread
        """
        threading.Thread.__init__(self)
        self.daemon = False
        self.logger = logging.getLogger(log_name)
        self.level = level
        self.deque = deque(maxlen=100)
        self.fdRead, self.fdWrite = os.pipe()
        self.pipeReader = os.fdopen(self.fdRead)
        self.start()

    def fileno(self):
        """Return the write file descriptor of the pipe"""
        return self.fdWrite

    def run(self):
        """Run the thread, logging everything."""
        for line in iter(self.pipeReader.readline, ""):
            self.deque.append(line.strip("\n"))

        self.pipeReader.close()

    def dump(self):
        while len(self.deque) > 0:
            self.logger.log(self.level, self.deque.popleft())

    def close(self):
        """Close the write end of the pipe."""
        os.close(self.fdWrite)
