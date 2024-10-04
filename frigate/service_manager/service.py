from __future__ import annotations

import asyncio
import atexit
import logging
import threading
from abc import ABC, abstractmethod
from contextvars import ContextVar
from dataclasses import dataclass
from types import TracebackType
from typing import Optional

from typing_extensions import Self


class Command(ABC):
    @abstractmethod
    async def run(self) -> None:
        pass


@dataclass
class StartService(Command):
    service: Service

    async def run(self) -> None:
        await self.service.on_start()


@dataclass
class StopService(Command):
    service: Service

    async def run(self) -> None:
        await self.service.on_stop()


class Service(ABC):
    def __init__(
        self,
        *,
        name: Optional[str] = None,
        manager: Optional[ServiceManager] = None,
    ):
        self._name = name or type(self).__qualname__

        self._manager = manager or ServiceManager.current()
        self._manager.register(self)

    @property
    def name(self) -> str:
        return self._name

    @property
    def manager(self) -> ServiceManager:
        return self._manager

    def start(self) -> None:
        self.manager.notify_manager(StartService(service=self))

    def stop(self) -> None:
        self.manager.notify_manager(StopService(service=self))

    @abstractmethod
    async def on_start(self) -> None:
        pass

    @abstractmethod
    async def on_stop(self) -> None:
        pass


current_service_manager: ContextVar[ServiceManager] = ContextVar(
    "current_service_manager"
)
current_service_manager_lock = threading.Lock()


class ServiceManager:
    _command_queue: asyncio.Queue

    def __init__(self, *, name: Optional[str] = None):
        self._name = name if name is not None else __name__
        self.logger = logging.getLogger(self.name)

        # The set of registered services.
        self._services: dict[str, Service] = dict()
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

        atexit.register(self.stop_manager)

        self._manager_thread.start()
        self._setup_event.wait()

    def _ensure_running(self) -> None:
        self._setup_event.wait()
        if not self._manager_thread.is_alive():
            raise RuntimeError("ServiceManager is not running")

    def _send_manager_event(self, command: Optional[Command]) -> None:
        self._ensure_running()
        asyncio.run_coroutine_threadsafe(
            self._command_queue.put(command), self._event_loop
        )

    def stop_manager(self) -> None:
        self._send_manager_event(None)
        self._manager_thread.join()

    def notify_manager(self, command: Command) -> None:
        if not isinstance(command, Command):
            raise ValueError(
                f"Invalid manager command type: {type(command).__qualname__}"
            )

        self._send_manager_event(command)

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
        with current_service_manager_lock:
            current = current_service_manager.get(None)
            if current is None:
                current = cls()
                current_service_manager.set(current)
        return current

    @property
    def name(self) -> str:
        return self._name

    def register(self, service: Service, /) -> None:
        with self._services_lock:
            if not hasattr(self, "_services"):
                raise RuntimeError(
                    f"Attempt to register service {service.name} to service manager after shutdown"
                )

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

            task = asyncio.create_task(command.run())
            tasks.add(task)
            task.add_done_callback(task_done)

        while True:
            command = await self._command_queue.get()
            if command is None:
                self.logger.debug("Exit requested")

                # Stop all existing services
                with self._services_lock:
                    for service in self._services.values():
                        run_command(StopService(service=service))
                    del self._services

                break

            self.logger.debug(f"Got command: {command!r}")

            run_command(command)

        # Wait for any pending tasks.
        if tasks:
            self.logger.debug(f"Waiting for {len(tasks)} tasks to finish")
            done, pending = await asyncio.wait(tasks)
            if len(pending) > 0:
                self.logger.warning(f"{len(pending)} tasks did not finish on shutdown")

        self.logger.info("Exiting service manager")
