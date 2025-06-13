import faulthandler
import logging
import multiprocessing as mp
import signal
import sys
import threading
from logging.handlers import QueueHandler
from typing import Callable, Optional

from setproctitle import setproctitle

import frigate.log
from frigate.config.logger import LoggerConfig


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
        self.__log_queue = frigate.log.log_listener.queue

    def pre_run_setup(self, logConfig: LoggerConfig | None = None) -> None:
        setproctitle(self.name)
        threading.current_thread().name = f"process:{self.name}"
        faulthandler.enable()

        def receiveSignal(signalNumber, frame):
            # Get the stop_event through the dict to bypass lazy initialization.
            stop_event = self.__dict__.get("stop_event")
            if stop_event is not None:
                # Someone is monitoring stop_event. We should set it.
                stop_event.set()
            else:
                # Nobody is monitoring stop_event. We should raise SystemExit.
                sys.exit()

        signal.signal(signal.SIGTERM, receiveSignal)
        signal.signal(signal.SIGINT, receiveSignal)
        self.logger = logging.getLogger(self.name)
        logging.basicConfig(handlers=[], force=True)
        logging.getLogger().addHandler(QueueHandler(self.__log_queue))

        if logConfig:
            frigate.log.apply_log_levels(
                logConfig.default.value.upper(), logConfig.logs
            )
