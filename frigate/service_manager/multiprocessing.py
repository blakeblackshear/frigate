import asyncio
import multiprocessing as mp
from abc import ABC, abstractmethod
from asyncio.exceptions import TimeoutError
from typing import Optional

from .multiprocessing_waiter import wait as mp_wait
from .service import Service, ServiceManager

DEFAULT_STOP_TIMEOUT = 10  # seconds


class ServiceProcess(Service, ABC):
    _process: mp.Process

    def __init__(
        self,
        name: Optional[str] = None,
        manager: Optional[ServiceManager] = None,
    ) -> None:
        super().__init__(name=name, manager=manager)

        self._process_lock = asyncio.Lock()

    async def on_start(self) -> None:
        async with self._process_lock:
            if hasattr(self, "_process"):
                if self._process.is_alive():
                    self.manager.logger.debug(
                        "Attempted to start already running process"
                        f" {self.name} (pid: {self._process.pid})"
                    )
                    return
                else:
                    self._process.close()

            # At this point, the process is either stopped or dead, so we can recreate it.
            self._process = mp.Process(name=self.name, target=self.run, daemon=True)
            self._process.start()
            self.manager.logger.info(f"Started {self.name} (pid: {self._process.pid})")

    async def on_stop(self, *, timeout: Optional[float] = None) -> None:
        if timeout is None:
            timeout = DEFAULT_STOP_TIMEOUT

        async with self._process_lock:
            if not hasattr(self, "_process"):
                return  # Already stopped.

            self._process.terminate()
            try:
                await asyncio.wait_for(mp_wait(self._process), timeout)
            except TimeoutError:
                self.manager.logger.warning(
                    f"{self.name} is still running after "
                    f"{timeout} seconds. Killing."
                )
                self._process.kill()
                await mp_wait(self._process)

            del self._process

        self.manager.logger.info(f"{self.name} stopped")

    @abstractmethod
    def run(self) -> None:
        pass
