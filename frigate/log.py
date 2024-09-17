import atexit
import logging
import multiprocessing as mp
import os
import threading
from collections import deque
from contextlib import AbstractContextManager, ContextDecorator
from logging.handlers import QueueHandler, QueueListener
from types import TracebackType
from typing import Deque, Optional

from typing_extensions import Self

from frigate.util.builtin import clean_camera_user_pass

LOG_HANDLER = logging.StreamHandler()
LOG_HANDLER.setFormatter(
    logging.Formatter(
        "[%(asctime)s] %(name)-30s %(levelname)-8s: %(message)s",
        "%Y-%m-%d %H:%M:%S",
    )
)

LOG_HANDLER.addFilter(
    lambda record: not record.getMessage().startswith(
        "You are using a scalar distance function"
    )
)


class log_thread(AbstractContextManager, ContextDecorator):
    def __init__(self, *, handler: logging.Handler = LOG_HANDLER):
        super().__init__()

        self._handler = handler

        log_queue: mp.Queue = mp.Queue()
        self._queue_handler = QueueHandler(log_queue)

        self._log_listener = QueueListener(
            log_queue, self._handler, respect_handler_level=True
        )

    @property
    def handler(self) -> logging.Handler:
        return self._handler

    def _stop_thread(self) -> None:
        self._log_listener.stop()

    def __enter__(self) -> Self:
        logging.getLogger().addHandler(self._queue_handler)

        atexit.register(self._stop_thread)
        self._log_listener.start()

        return self

    def __exit__(
        self,
        exc_type: Optional[type[BaseException]],
        exc_info: Optional[BaseException],
        exc_tb: Optional[TracebackType],
    ) -> None:
        logging.getLogger().removeHandler(self._queue_handler)

        atexit.unregister(self._stop_thread)
        self._stop_thread()


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
