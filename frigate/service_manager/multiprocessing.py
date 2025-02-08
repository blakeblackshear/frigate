import asyncio
import faulthandler
import logging
import multiprocessing as mp
import signal
import sys
import threading
from abc import ABC, abstractmethod
from asyncio.exceptions import TimeoutError
from logging.handlers import QueueHandler
from types import FrameType
from typing import Optional

import frigate.log

from .multiprocessing_waiter import wait as mp_wait
from .service import Service, ServiceManager

DEFAULT_STOP_TIMEOUT = 10  # seconds


class BaseServiceProcess(Service, ABC):
    """A Service the manages a multiprocessing.Process."""

    _process: Optional[mp.Process]

    def __init__(
        self,
        *,
        name: Optional[str] = None,
        manager: Optional[ServiceManager] = None,
    ) -> None:
        super().__init__(name=name, manager=manager)

        self._process = None

    async def on_start(self) -> None:
        if self._process is not None:
            if self._process.is_alive():
                return  # Already started.
            else:
                self._process.close()

        # At this point, the process is either stopped or dead, so we can recreate it.
        self._process = mp.Process(target=self._run)
        self._process.name = self.name
        self._process.daemon = True
        self.before_start()
        self._process.start()
        self.after_start()

        self.manager.logger.info(f"Started {self.name} (pid: {self._process.pid})")

    async def on_stop(
        self,
        *,
        force: bool = False,
        timeout: Optional[float] = None,
    ) -> None:
        if timeout is None:
            timeout = DEFAULT_STOP_TIMEOUT

        if self._process is None:
            return  # Already stopped.

        running = True

        if not force:
            self._process.terminate()
            try:
                await asyncio.wait_for(mp_wait(self._process), timeout)
                running = False
            except TimeoutError:
                self.manager.logger.warning(
                    f"{self.name} is still running after {timeout} seconds. Killing."
                )

        if running:
            self._process.kill()
            await mp_wait(self._process)

        self._process.close()
        self._process = None

        self.manager.logger.info(f"{self.name} stopped")

    @property
    def pid(self) -> Optional[int]:
        return self._process.pid if self._process else None

    def _run(self) -> None:
        self.before_run()
        self.run()
        self.after_run()

    def before_start(self) -> None:
        pass

    def after_start(self) -> None:
        pass

    def before_run(self) -> None:
        pass

    def after_run(self) -> None:
        pass

    @abstractmethod
    def run(self) -> None:
        pass

    def __getstate__(self) -> dict:
        return {
            k: v
            for k, v in self.__dict__.items()
            if not (k.startswith("_Service__") or k == "_process")
        }


class ServiceProcess(BaseServiceProcess):
    logger: logging.Logger

    @property
    def stop_event(self) -> threading.Event:
        # Lazily create the stop_event. This allows the signal handler to tell if anyone is
        # monitoring the stop event, and to raise a SystemExit if not.
        if "stop_event" not in self.__dict__:
            stop_event = threading.Event()
            self.__dict__["stop_event"] = stop_event
        else:
            stop_event = self.__dict__["stop_event"]
            assert isinstance(stop_event, threading.Event)

        return stop_event

    def before_start(self) -> None:
        if frigate.log.log_listener is None:
            raise RuntimeError("Logging has not yet been set up.")
        self.__log_queue = frigate.log.log_listener.queue

    def before_run(self) -> None:
        super().before_run()

        faulthandler.enable()

        def receiveSignal(signalNumber: int, frame: Optional[FrameType]) -> None:
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
        del self.__log_queue
