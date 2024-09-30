import faulthandler
import logging
import multiprocessing as mp
import signal
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

    def before_start(self) -> None:
        self.__log_queue = frigate.log.log_listener.queue

    def before_run(self) -> None:
        faulthandler.enable()

        logging.basicConfig(level=logging.INFO, handlers=[], force=True)
        logging.getLogger().addHandler(QueueHandler(self.__log_queue))

        self.logger = logging.getLogger(self.name)

        self.stop_event = mp.Event()

        def receiveSignal(signalNumber, frame):
            self.stop_event.set()

        signal.signal(signal.SIGTERM, receiveSignal)
        signal.signal(signal.SIGINT, receiveSignal)
