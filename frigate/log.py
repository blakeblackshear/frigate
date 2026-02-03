# In log.py
import atexit
import io
import logging
import os
import sys
import threading
from collections import deque
from contextlib import contextmanager
from enum import Enum
from functools import wraps
from logging.handlers import QueueHandler, QueueListener
from multiprocessing.managers import SyncManager
from queue import Empty, Queue
from typing import Any, Callable, Deque, Generator, Optional

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
    lambda record: (
        not record.getMessage().startswith("You are using a scalar distance function")
    )
)

# filter out tflite logging
LOG_HANDLER.addFilter(
    lambda record: (
        "Created TensorFlow Lite XNNPACK delegate for CPU." not in record.getMessage()
    )
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
        "h5py": LogLevel.error,
        "keras": LogLevel.error,
        "matplotlib": LogLevel.error,
        "tensorflow": LogLevel.error,
        "tensorflow.python": LogLevel.error,
        "werkzeug": LogLevel.error,
        "ws4py": LogLevel.error,
        "PIL": LogLevel.warning,
        "numba": LogLevel.warning,
        "google_genai.models": LogLevel.warning,
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
        self._line_buffer: list[str] = []

    def write(self, s: Any) -> int:
        if not isinstance(s, str):
            s = str(s)

        self._line_buffer.append(s)

        # Process output line by line if a newline is present
        if "\n" in s:
            full_output = "".join(self._line_buffer)
            lines = full_output.splitlines(keepends=True)
            self._line_buffer = []

            for line in lines:
                if line.endswith("\n"):
                    self._process_line(line.rstrip("\n"))
                else:
                    self._line_buffer.append(line)

        return len(s)

    def _process_line(self, line: str) -> None:
        self.logger.log(self.log_level, line)

    def flush(self) -> None:
        if self._line_buffer:
            full_output = "".join(self._line_buffer)
            self._line_buffer = []
            if full_output:  # Only process if there's content
                self._process_line(full_output)

    def __enter__(self) -> "LogRedirect":
        """Context manager entry point."""
        return self

    def __exit__(self, exc_type: Any, exc_val: Any, exc_tb: Any) -> None:
        """Context manager exit point. Ensures buffered content is flushed."""
        self.flush()


@contextmanager
def __redirect_fd_to_queue(queue: Queue[str]) -> Generator[None, None, None]:
    """Redirect file descriptor 1 (stdout) to a pipe and capture output in a queue."""
    stdout_fd = os.dup(1)
    read_fd, write_fd = os.pipe()
    os.dup2(write_fd, 1)
    os.close(write_fd)

    stop_event = threading.Event()

    def reader() -> None:
        """Read from pipe and put lines in queue until stop_event is set."""
        try:
            with os.fdopen(read_fd, "r") as pipe:
                while not stop_event.is_set():
                    line = pipe.readline()
                    if not line:  # EOF
                        break
                    queue.put(line.strip())
        except OSError as e:
            queue.put(f"Reader error: {e}")
        finally:
            if not stop_event.is_set():
                stop_event.set()

    reader_thread = threading.Thread(target=reader, daemon=False)
    reader_thread.start()

    try:
        yield
    finally:
        os.dup2(stdout_fd, 1)
        os.close(stdout_fd)
        stop_event.set()
        reader_thread.join(timeout=1.0)
        try:
            os.close(read_fd)
        except OSError:
            pass


def redirect_output_to_logger(logger: logging.Logger, level: int) -> Any:
    """Decorator to redirect both Python sys.stdout/stderr and C-level stdout to logger."""

    def decorator(func: Callable) -> Callable:
        @wraps(func)
        def wrapper(*args: Any, **kwargs: Any) -> Any:
            queue: Queue[str] = Queue()

            log_redirect = LogRedirect(logger, level)
            old_stdout = sys.stdout
            old_stderr = sys.stderr
            sys.stdout = log_redirect
            sys.stderr = log_redirect

            try:
                # Redirect C-level stdout
                with __redirect_fd_to_queue(queue):
                    result = func(*args, **kwargs)
            finally:
                # Restore Python stdout/stderr
                sys.stdout = old_stdout
                sys.stderr = old_stderr
                log_redirect.flush()

                # Log C-level output from queue
                while True:
                    try:
                        logger.log(level, queue.get_nowait())
                    except Empty:
                        break

            return result

        return wrapper

    return decorator


def suppress_os_output(func: Callable) -> Callable:
    """
    A decorator that suppresses all output (stdout and stderr)
    at the operating system file descriptor level for the decorated function.
    This is useful for silencing noisy C/C++ libraries.
    Note: This is a Unix-specific solution using os.dup2 and os.pipe.
    It temporarily redirects file descriptors 1 (stdout) and 2 (stderr)
    to a non-read pipe, effectively discarding their output.
    """

    @wraps(func)
    def wrapper(*args: tuple, **kwargs: dict[str, Any]) -> Any:
        # Save the original file descriptors for stdout (1) and stderr (2)
        original_stdout_fd = os.dup(1)
        original_stderr_fd = os.dup(2)

        # Create dummy pipes. We only need the write ends to redirect to.
        # The data written to these pipes will be discarded as nothing
        # will read from the read ends.
        devnull_read_fd, devnull_write_fd = os.pipe()

        try:
            # Redirect stdout (FD 1) and stderr (FD 2) to the write end of our dummy pipe
            os.dup2(devnull_write_fd, 1)  # Redirect stdout to devnull pipe
            os.dup2(devnull_write_fd, 2)  # Redirect stderr to devnull pipe

            # Execute the original function
            result = func(*args, **kwargs)

        finally:
            # Restore original stdout and stderr file descriptors (1 and 2)
            # This is crucial to ensure normal printing resumes after the decorated function.
            os.dup2(original_stdout_fd, 1)
            os.dup2(original_stderr_fd, 2)

            # Close all duplicated and pipe file descriptors to prevent resource leaks.
            # It's important to close the read end of the dummy pipe too,
            # as nothing is explicitly reading from it.
            os.close(original_stdout_fd)
            os.close(original_stderr_fd)
            os.close(devnull_read_fd)
            os.close(devnull_write_fd)

        return result

    return wrapper


@contextmanager
def suppress_stderr_during(operation_name: str) -> Generator[None, None, None]:
    """
    Context manager to suppress stderr output during a specific operation.

    Useful for silencing LLVM debug output, CUDA messages, and other native
    library logging that cannot be controlled via Python logging or environment
    variables. Completely redirects file descriptor 2 (stderr) to /dev/null.

    Usage:
        with suppress_stderr_during("model_conversion"):
            converter = tf.lite.TFLiteConverter.from_keras_model(model)
            tflite_model = converter.convert()

    Args:
        operation_name: Name of the operation for debugging purposes
    """
    original_stderr_fd = os.dup(2)
    devnull = os.open(os.devnull, os.O_WRONLY)
    try:
        os.dup2(devnull, 2)
        yield
    finally:
        os.dup2(original_stderr_fd, 2)
        os.close(devnull)
        os.close(original_stderr_fd)
