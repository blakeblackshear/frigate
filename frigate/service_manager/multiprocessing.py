import asyncio
import faulthandler
import logging
import multiprocessing as mp
import os
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

DEFAULT_STOP_TIMEOUT = 10


class BaseServiceProcess(Service, ABC):
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
        if self._process and self._process.is_alive():
            return

        if self._process:
            self._process.close()

        self._process = mp.Process(target=self._run, daemon=True)
        self._process.name = self.name
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
        timeout = timeout or DEFAULT_STOP_TIMEOUT
        if not self._process:
            return

        if force:
            self._kill_process()
            return

        self._terminate_process(timeout)

    def _terminate_process(self, timeout: float) -> None:
        self._process.terminate()
        try:
            asyncio.run(asyncio.wait_for(mp_wait(self._process), timeout))
        except TimeoutError:
            self.manager.logger.warning(
                f"{self.name} is still running after {timeout} seconds. Killing."
            )
            self._kill_process()

    def _kill_process(self) -> None:
        self._process.kill()
        asyncio.run(mp_wait(self._process))
        self.manager.logger.info(f"{self.name} killed")
        self._cleanup_process()

    def _cleanup_process(self) -> None:
        self._process.close()
        self._process = None
        self.manager.logger.info(f"{self.name} stopped")

    @property
    def pid(self) -> Optional[int]:
        return self._process.pid if self._process else None

    def _run(self) -> None:
        try:
            self.before_run()
            self.run()
        except Exception:
            logging.exception(f"Exception in {self.name} process.")
            raise
        finally:
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
        state = self.__dict__.copy()
        state["_process"] = None
        return state


class ServiceProcess(BaseServiceProcess):
    logger: logging.Logger

    def __init__(
        self,
        *,
        name: Optional[str] = None,
        manager: Optional[ServiceManager] = None,
    ) -> None:
        super().__init__(name=name, manager=manager)
        self._stop_event = threading.Event()

    @property
    def stop_event(self) -> threading.Event:
        return self._stop_event

    def before_start(self) -> None:
        if frigate.log.log_listener is None:
            raise RuntimeError("Logging has not yet been set up.")
        self.__log_queue = frigate.log.log_listener.queue

    def before_run(self) -> None:
        super().before_run()
        faulthandler.enable()

        def receiveSignal(signalNumber: int, frame: Optional[FrameType]) -> None:
            self.stop_event.set()
            sys.exit()

        signal.signal(signal.SIGTERM, receiveSignal)
        signal.signal(signal.SIGINT, receiveSignal)

        self.logger = logging.getLogger(self.name)
        logging.basicConfig(handlers=[], level=logging.INFO, force=True)
        queue_handler = QueueHandler(self.__log_queue)
        self.logger.addHandler(queue_handler)

        self._setup_process_security()

    def _setup_process_security(self) -> None:
        try:
            os.nice(10)
        except OSError:
            self.logger.warn("Failed to set process niceness.")

        try:
            os.setrlimit(
                resource.RLIMIT_NOFILE, (1024, resource.RLIM_HARD_INFINITY)
            )  # type: ignore[attr-defined]
        except Exception:
            self.logger.warn("Failed to increase file descriptor limit.")

        try:
            os.umask(0o077)
        except OSError:
            self.logger.warn("Failed to set umask.")

        try:
            if os.getuid() == 0:
                try:
                    import grp  # pylint: disable=import-outside-toplevel

                    group = grp.getgrnam("nogroup")
                    os.setgid(group.gr_gid)
                except Exception:
                    self.logger.warn("Failed to drop group privileges.")

                try:
                    os.setuid(65534)
                except Exception:
                    self.logger.warn("Failed to drop user privileges.")
        except Exception:
            self.logger.warn("Not running as root, skipping privilege dropping.")
