import faulthandler
import logging
import multiprocessing as mp
import signal
import sys
from functools import wraps
from logging.handlers import QueueHandler
from multiprocessing.synchronize import Event
from typing import Any

import frigate.log


class BaseProcess(mp.Process):
    def __init__(self, **kwargs):
        super().__init__(**kwargs)

    def start(self, *args, **kwargs):
        self.before_start()
        super().start(*args, **kwargs)
        self.after_start()

    def __getattribute__(self, name: str) -> Any:
        if name == "run":
            run = super().__getattribute__("run")

            @wraps(run)
            def run_wrapper(*args, **kwargs):
                try:
                    self.before_run()
                    return run(*args, **kwargs)
                finally:
                    self.after_run()

            return run_wrapper

        return super().__getattribute__(name)

    def before_start(self) -> None:
        pass

    def after_start(self) -> None:
        pass

    def before_run(self) -> None:
        pass

    def after_run(self) -> None:
        pass


class Process(BaseProcess):
    logger: logging.Logger
    stop_event: Event

    @property
    def stop_event(self) -> Event:
        if "stop_event" not in self.__dict__:
            self.__dict__["stop_event"] = mp.Event()
        return self.__dict__["stop_event"]

    def before_start(self) -> None:
        self.__log_queue = frigate.log.log_listener.queue

    def before_run(self) -> None:
        faulthandler.enable()

        logging.basicConfig(level=logging.INFO, handlers=[], force=True)
        logging.getLogger().addHandler(QueueHandler(self.__log_queue))

        self.logger = logging.getLogger(self.name)

        def receiveSignal(signalNumber, frame):
            # Make sure we do not trigger stop_event lazy initialization
            stop_event = self.__dict__.get("stop_event")

            if stop_event is not None:
                stop_event.set()
            else:
                sys.exit()

        signal.signal(signal.SIGTERM, receiveSignal)
        signal.signal(signal.SIGINT, receiveSignal)
