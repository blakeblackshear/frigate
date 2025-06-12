import logging
import multiprocessing as mp
import threading
from logging.handlers import QueueHandler
from typing import Callable, Optional

import frigate.log


class BaseProcess(mp.Process):
    def __init__(
        self,
        *,
        name: Optional[str] = None,
        target: Optional[Callable] = None,
        args: tuple = (),
        kwargs: dict = {},
        daemon: Optional[bool] = None,
    ):
        super().__init__(
            name=name, target=target, args=args, kwargs=kwargs, daemon=daemon
        )

    def start(self, *args, **kwargs):
        self.before_start()
        super().start(*args, **kwargs)
        self.after_start()

    def before_start(self) -> None:
        pass

    def after_start(self) -> None:
        pass


class Process(BaseProcess):
    logger: logging.Logger

    @property
    def stop_event(self) -> threading.Event:
        # Lazily create the stop_event. This allows the signal handler to tell if anyone is
        # monitoring the stop event, and to raise a SystemExit if not.
        if "stop_event" not in self.__dict__:
            self.__dict__["stop_event"] = threading.Event()
        return self.__dict__["stop_event"]

    def before_start(self) -> None:
        self.__log_queue = frigate.log.log_queue
        self.logger = logging.getLogger(self.name)
        logging.basicConfig(handlers=[], force=True)
        logging.getLogger().addHandler(QueueHandler(self.__log_queue))
