import logging
import multiprocessing as mp
from functools import wraps
from logging.handlers import QueueHandler
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
    def before_start(self) -> None:
        self.__log_queue = frigate.log.log_listener.queue

    def before_run(self) -> None:
        if self.__log_queue:
            logging.basicConfig(handlers=[], force=True)
            logging.getLogger().addHandler(QueueHandler(self.__log_queue))
