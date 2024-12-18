import atexit
import logging
import multiprocessing as mp
import os
import sys
import threading
from collections import deque
from logging.handlers import QueueHandler, QueueListener
from typing import Deque, Optional

from frigate.util.builtin import clean_camera_user_pass

LOG_HANDLER = logging.StreamHandler()
LOG_HANDLER.setFormatter(
    logging.Formatter(
        "[%(asctime)s] %(name)-30s %(levelname)-8s: %(message)s",
        "%Y-%m-%d %H:%M:%S",
    )
)

# filter out norfair warning
LOG_HANDLER.addFilter(
    lambda record: not record.getMessage().startswith(
        "You are using a scalar distance function"
    )
)

# filter out tflite logging
LOG_HANDLER.addFilter(
    lambda record: "Created TensorFlow Lite XNNPACK delegate for CPU."
    not in record.getMessage()
)

log_listener: Optional[QueueListener] = None


def setup_logging() -> None:
    global log_listener

    log_queue: mp.Queue = mp.Queue()
    log_listener = QueueListener(log_queue, LOG_HANDLER, respect_handler_level=True)

    atexit.register(_stop_logging)
    log_listener.start()

    logging.basicConfig(
        level=logging.INFO,
        handlers=[],
        force=True,
    )

    logging.getLogger().addHandler(QueueHandler(log_listener.queue))


def _stop_logging() -> None:
    global log_listener

    if log_listener is not None:
        log_listener.stop()
        log_listener = None


# When a multiprocessing.Process exits, python tries to flush stdout and stderr. However, if the
# process is created after a thread (for example a logging thread) is created and the process fork
# happens while an internal lock is held, the stdout/err flush can cause a deadlock.
#
# https://github.com/python/cpython/issues/91776
def reopen_std_streams() -> None:
    sys.stdout = os.fdopen(1, "w")
    sys.stderr = os.fdopen(2, "w")


os.register_at_fork(after_in_child=reopen_std_streams)


# based on https://codereview.stackexchange.com/a/17959
class LogPipe(threading.Thread):
    def __init__(self, log_name: str):
        """Setup the object with a logger and start the thread"""
        super().__init__(daemon=False)
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
