import asyncio
import multiprocessing as mp
from asyncio.exceptions import TimeoutError
from typing import Optional

from .multiprocessing_waiter import wait as mp_wait
from .service import Service, ServiceManager


class ServiceProcess(Service):
    def __init__(
        self, name: Optional[str] = None, manager: Optional[ServiceManager] = None
    ) -> None:
        super().__init__(name=name, manager=manager)

        self._process_lock = asyncio.Lock()

    async def on_start(self) -> None:
        pid = None
        async with self._process_lock:
            if not hasattr(self, "_process"):
                self._process = mp.Process(
                    name=self.name, target=self._run_process, daemon=True
                )
                self._process.start()
                pid = self._process.pid
            elif not self._process.is_alive():
                raise NotImplementedError("Restarting a dead process")
        if pid is not None:
            self.manager.logger.info(f"Started {self.name} (pid: {pid})")

    async def on_stop(self) -> None:
        async with self._process_lock:
            if not hasattr(self, "_process"):
                return  # Already stopped.

            timeout = 10  # seconds
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

    def _run_process(self) -> None:
        self.run()

    def run(self) -> None:
        raise NotImplementedError(f"Service {self.name} not implemented")
