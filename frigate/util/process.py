import faulthandler
import logging
import multiprocessing as mp
import threading
from logging.handlers import QueueHandler
from multiprocessing.synchronize import Event as MpEvent
from typing import Callable, Optional

from setproctitle import setproctitle

import frigate.log
from frigate.config.logger import LoggerConfig


class BaseProcess(mp.Process):
    def __init__(
        self,
        stop_event: MpEvent,
        *,
        name: Optional[str] = None,
        target: Optional[Callable] = None,
        args: tuple = (),
        kwargs: dict = {},
        daemon: Optional[bool] = None,
    ):
        self.stop_event = stop_event
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


class FrigateProcess(BaseProcess):
    logger: logging.Logger

    def before_start(self) -> None:
        self.__log_queue = frigate.log.log_listener.queue

    def pre_run_setup(self, logConfig: LoggerConfig | None = None) -> None:
        setproctitle(self.name)
        threading.current_thread().name = f"process:{self.name}"
        faulthandler.enable()

        # setup logging
        self.logger = logging.getLogger(self.name)
        logging.basicConfig(handlers=[], force=True)
        logging.getLogger().addHandler(QueueHandler(self.__log_queue))

        if logConfig:
            frigate.log.apply_log_levels(
                logConfig.default.value.upper(), logConfig.logs
            )
