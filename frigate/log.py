# In log.py
import atexit
import io
import logging
import os
import sys
import threading
from collections import deque
from enum import Enum
from functools import wraps
from logging.handlers import QueueHandler, QueueListener
from multiprocessing.managers import SyncManager
from queue import Queue
from typing import Any, Callable, Deque, Optional

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


class LogLevel(str, Enum):
    debug = "debug"
    info = "info"
    warning = "warning"
    error = "error"
    critical = "critical"


log_listener: Optional[QueueListener] = None
log_queue: Optional[Queue] = None


def setup_logging(manager: SyncManager) -> None:
    global log_listener, log_queue
    log_queue = manager.Queue()
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


def apply_log_levels(default: str, log_levels: dict[str, LogLevel]) -> None:
    logging.getLogger().setLevel(default)

    log_levels = {
        "absl": LogLevel.error,
        "httpx": LogLevel.error,
        "tensorflow": LogLevel.error,
        "werkzeug": LogLevel.error,
        "ws4py": LogLevel.error,
        **log_levels,
    }

    for log, level in log_levels.items():
        logging.getLogger(log).setLevel(level.value.upper())


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
    def __init__(self, log_name: str, level: int = logging.ERROR):
        """Setup the object with a logger and start the thread"""
        super().__init__(daemon=False)
        self.logger = logging.getLogger(log_name)
        self.level = level
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


class LogRedirect(io.StringIO):
    """
    A custom file-like object to capture stdout and process it.
    It extends io.StringIO to capture output and then processes it
    line by line.
    """

    def __init__(self, logger_instance: logging.Logger, level: int):
        super().__init__()
        self.logger = logger_instance
        self.log_level = level
        self.buffer = []

    def write(self, s):
        if not isinstance(s, str):
            s = str(s)

        self.buffer.append(s)

        # Process output line by line if a newline is present
        if "\n" in s:
            full_output = "".join(self.buffer)
            lines = full_output.splitlines(keepends=True)
            self.buffer = []

            for line in lines:
                if line.endswith("\n"):
                    self._process_line(line.rstrip("\n"))
                else:
                    self.buffer.append(line)

    def _process_line(self, line):
        self.logger.log(self.log_level, line)

    def flush(self):
        if self.buffer:
            full_output = "".join(self.buffer)
            self.buffer = []
            if full_output:  # Only process if there's content
                self._process_line(full_output)

    def __enter__(self):
        """Context manager entry point."""
        return self

    def __exit__(self, exc_type, exc_val, exc_tb):
        """Context manager exit point. Ensures buffered content is flushed."""
        self.flush()


def redirect_stdout_to_logger(log_name: str, level: int) -> Any:
    def decorator(func: Callable):
        @wraps(func)
        def wrapper(*args, **kwargs):
            current_log_pipe = LogRedirect(log_name, logging.ERROR)

            old_stdout = sys.stdout
            old_stderr = sys.stderr
            sys.stdout = current_log_pipe
            sys.stderr = current_log_pipe

            try:
                result = func(*args, **kwargs)
            finally:
                sys.stdout = old_stdout
                sys.stderr = old_stderr
                current_log_pipe.flush()

            return result

        return wrapper

    return decorator
