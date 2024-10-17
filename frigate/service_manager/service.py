from __future__ import annotations

import asyncio
import atexit
import logging
import threading
from abc import ABC, abstractmethod
from contextvars import ContextVar
from dataclasses import dataclass
from types import TracebackType
from typing import Coroutine, Optional, Union

from typing_extensions import Self


@dataclass
class Command:
    coro: Coroutine
    done: Optional[threading.Event] = None


class Service(ABC):
    def __init__(
        self,
        *,
        name: Optional[str] = None,
        manager: Optional[ServiceManager] = None,
    ):
        self.__name = name or type(self).__qualname__

        self.__manager = manager or ServiceManager.current()
        self.__manager.register(self)

    @property
    def name(self) -> str:
        return self.__name

    @property
    def manager(self) -> ServiceManager:
        return self.__manager

    def start(
        self,
        *,
        wait: bool = False,
        wait_timeout: Optional[float] = None,
    ) -> None:
        self.manager.run_task(self.on_start(), wait=wait, wait_timeout=wait_timeout)

    @abstractmethod
    async def on_start(self) -> None:
        pass

    def stop(
        self,
        *,
        timeout: Optional[float] = None,
        wait: bool = False,
        wait_timeout: Optional[float] = None,
    ) -> None:
        self.manager.run_task(
            self.on_stop(timeout=timeout),
            wait=wait,
            wait_timeout=wait_timeout,
        )

    @abstractmethod
    async def on_stop(self, *, timeout: Optional[float] = None) -> None:
        pass

    def restart(
        self,
        wait: bool = False,
        wait_timeout: Optional[float] = None,
    ) -> None:
        self.manager.run_task(
            self.on_restart(),
            wait=wait,
            wait_timeout=wait_timeout,
        )

    async def on_restart(self) -> None:
        await self.on_stop()
        await self.on_start()


current_service_manager: ContextVar[ServiceManager] = ContextVar(
    "current_service_manager"
)


class ServiceManager:
    _name: str
    _services: dict[str, Service]
    _services_lock: threading.Lock

    _command_queue: asyncio.Queue
    _event_loop: asyncio.AbstractEventLoop
    _setup_event: threading.Event

    def __init__(self, *, name: Optional[str] = None):
        self._name = name if name is not None else (__package__ or __name__)
        self.logger = logging.getLogger(self.name)

        # The set of registered services.
        self._services = dict()
        self._services_lock = threading.Lock()

        # --- Start the manager thread and wait for it to be ready. ---

        self._setup_event = threading.Event()

        async def start_manager() -> None:
            self._event_loop = asyncio.get_running_loop()
            self._command_queue = asyncio.Queue()

            self._setup_event.set()
            await self._run_manager()

        self._manager_thread = threading.Thread(
            name=self.name,
            target=lambda: asyncio.run(start_manager()),
            daemon=True,
        )

        self._manager_thread.start()
        atexit.register(self.shutdown)

    def run_task(
        self,
        coro: Coroutine,
        *,
        wait: bool = False,
        wait_timeout: Optional[float] = None,
    ) -> None:
        """Run an async task in the background thread."""

        if not isinstance(coro, Coroutine):
            raise ValueError(f"Cannot schedule task for object of type {type(coro)}")

        cmd = Command(coro=coro)
        if wait or wait_timeout is not None:
            cmd.done = threading.Event()

        self._send_command(cmd)

        if cmd.done is not None:
            cmd.done.wait(timeout=wait_timeout)

    def register(self, service: Service) -> None:
        self._ensure_running()
        with self._services_lock:
            name_conflict: Optional[Service] = next(
                (
                    existing
                    for name, existing in self._services.items()
                    if name == service.name
                ),
                None,
            )

            if name_conflict is service:
                raise RuntimeError(f"Attempt to re-register service: {service.name}")
            elif name_conflict is not None:
                raise RuntimeError(f"Duplicate service name: {service.name}")

            self.logger.debug(f"Registering service: {service.name}")
            self._services[service.name] = service

    def shutdown(self) -> None:
        """Shutdown the service manager."""

        self._send_command(None)
        self._manager_thread.join()

    def _ensure_running(self) -> None:
        self._setup_event.wait()
        if not self._manager_thread.is_alive():
            raise RuntimeError(f"ServiceManager {self.name} is not running")

    def _send_command(self, command: Union[Command, None]) -> None:
        self._ensure_running()
        asyncio.run_coroutine_threadsafe(
            self._command_queue.put(command), self._event_loop
        )

    def __enter__(self) -> Self:
        self._context_token = current_service_manager.set(self)
        return self

    def __exit__(
        self,
        exc_type: Optional[type[BaseException]],
        exc_info: Optional[BaseException],
        exc_tb: Optional[TracebackType],
    ) -> None:
        current_service_manager.reset(self._context_token)
        del self._context_token

    @classmethod
    def current(cls) -> ServiceManager:
        current = current_service_manager.get(None)
        if current is None:
            current = cls()
            current_service_manager.set(current)
        return current

    @property
    def name(self) -> str:
        return self._name

    async def _run_manager(self) -> None:
        self.logger.info("Started service manager")

        tasks = set()

        def run_command(command: Command) -> None:
            def task_done(task: asyncio.Task) -> None:
                exc = task.exception()
                if exc:
                    self.logger.exception(
                        "Exception in service manager task", exc_info=exc
                    )
                tasks.discard(task)
                if command.done is not None:
                    command.done.set()

            task = asyncio.create_task(command.coro)
            tasks.add(task)
            task.add_done_callback(task_done)

        # Main command processing loop.
        while (command := await self._command_queue.get()) is not None:
            run_command(command)

        # Stop all services.
        with self._services_lock:
            self.logger.debug(f"Stopping {len(self._services)} services")
            for service in self._services.values():
                run_command(Command(coro=service.on_stop()))

        # Wait for any pending tasks.
        if tasks:
            self.logger.debug(f"Waiting for {len(tasks)} tasks to finish")
            done, pending = await asyncio.wait(tasks)
            if len(pending) > 0:
                self.logger.warning(f"{len(pending)} tasks did not finish on shutdown")

        self.logger.info("Exiting service manager")
