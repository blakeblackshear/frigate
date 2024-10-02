import faulthandler
import logging
import multiprocessing as mp
import signal
import sys
import threading
from functools import wraps
from logging.handlers import QueueHandler
from multiprocessing.connection import wait as mp_wait
from typing import Any

import frigate.log

logger = logging.getLogger(__name__)


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
    stop_event: threading.Event

    @property
    def stop_event(self) -> threading.Event:
        if "stop_event" not in self.__dict__:
            self.__dict__["stop_event"] = threading.Event()
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


class ProcessStopper(threading.Thread):
    def __init__(self, processes: list[mp.Process]):
        super().__init__()
        self.processes = processes
        self.start()

    def run(self):
        # Stop all processes registered for stopping
        sentinels: dict[int, mp.Process] = {}
        for process in self.processes:
            if process is None:
                continue
            process.terminate()
            sentinels[process.sentinel] = process

        # Wait for all the processes to shutdown
        logger.info(f"Waiting for {len(sentinels)} processes to stop")
        while sentinels:
            ready = mp_wait(sentinels.keys(), timeout=10)
            if ready:
                for sentinel in ready:
                    name = sentinels[sentinel].name
                    del sentinels[sentinel]
                    logger.info(f"Process {name} has stopped")
            else:
                proc: mp.Process = next(iter(sentinels.values()))
                logger.warning(
                    f"{len(sentinels)} processes are still running. "
                    f"Killing {proc.name or 'one of them'}"
                )
                proc.kill()
