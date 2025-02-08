from __future__ import annotations

import asyncio
import atexit
import logging
import threading
from abc import ABC, abstractmethod
from contextvars import ContextVar
from dataclasses import dataclass
from functools import partial
from typing import Coroutine, Optional, Union, cast

from typing_extensions import Self


class Service(ABC):
    """An abstract service instance."""

    def __init__(
        self,
        *,
        name: Optional[str] = None,
        manager: Optional[ServiceManager] = None,
    ):
        if name:
            self.__dict__["name"] = name

        self.__manager = manager or ServiceManager.current()
        self.__lock = asyncio.Lock(loop=self.__manager._event_loop)
        self.__manager._register(self)

    @property
    def name(self) -> str:
        try:
            return cast(str, self.__dict__["name"])
        except KeyError:
            return type(self).__qualname__

    @property
    def manager(self) -> ServiceManager:
        """The service manager this service is registered with."""
        try:
            return self.__manager
        except AttributeError:
            raise RuntimeError("Cannot access associated service manager")

    def start(
        self,
        *,
        wait: bool = False,
        wait_timeout: Optional[float] = None,
    ) -> Self:
        """Start this service.

        :param wait: If set, this function will block until the task is complete.
        :param wait_timeout: If set, this function will not return until the task is complete or the
            specified timeout has elapsed.
        """

        self.manager.run_task(
            self.on_start(),
            wait=wait,
            wait_timeout=wait_timeout,
            lock=self.__lock,
        )

        return self

    def stop(
        self,
        *,
        force: bool = False,
        timeout: Optional[float] = None,
        wait: bool = False,
        wait_timeout: Optional[float] = None,
    ) -> Self:
        """Stop this service.

        :param force: If set, the service will be killed immediately.
        :param timeout: Maximum amount of time to wait before force-killing the service.

        :param wait: If set, this function will block until the task is complete.
        :param wait_timeout: If set, this function will not return until the task is complete or the
            specified timeout has elapsed.
        """

        self.manager.run_task(
            self.on_stop(force=force, timeout=timeout),
            wait=wait,
            wait_timeout=wait_timeout,
            lock=self.__lock,
        )

        return self

    def restart(
        self,
        *,
        force: bool = False,
        stop_timeout: Optional[float] = None,
        wait: bool = False,
        wait_timeout: Optional[float] = None,
    ) -> Self:
        """Restart this service.

        :param force: If set, the service will be killed immediately.
        :param timeout: Maximum amount of time to wait before force-killing the service.

        :param wait: If set, this function will block until the task is complete.
        :param wait_timeout: If set, this function will not return until the task is complete or the
            specified timeout has elapsed.
        """

        self.manager.run_task(
            self.on_restart(force=force, stop_timeout=stop_timeout),
            wait=wait,
            wait_timeout=wait_timeout,
            lock=self.__lock,
        )

        return self

    @abstractmethod
    async def on_start(self) -> None:
        pass

    @abstractmethod
    async def on_stop(
        self,
        *,
        force: bool = False,
        timeout: Optional[float] = None,
    ) -> None:
        pass

    async def on_restart(
        self,
        *,
        force: bool = False,
        stop_timeout: Optional[float] = None,
    ) -> None:
        await self.on_stop(force=force, timeout=stop_timeout)
        await self.on_start()


default_service_manager_lock = threading.Lock()
default_service_manager: Optional[ServiceManager] = None

current_service_manager: ContextVar[ServiceManager] = ContextVar(
    "current_service_manager"
)


@dataclass
class Command:
    """A coroutine to execute in the service manager thread.

    Attributes:
        coro: The coroutine to execute.
        lock: An async lock to acquire before calling the coroutine.
        done: If specified, the service manager will set this event after the command completes.
    """

    coro: Coroutine
    lock: Optional[asyncio.Lock] = None
    done: Optional[threading.Event] = None


class ServiceManager:
    """A set of services, along with the global state required to manage them efficiently.

    Typically users of the service infrastructure will not interact with a service manager directly,
    but rather through individual Service subclasses that will automatically manage a service
    manager instance.

    Each service manager instance has a background thread in which service lifecycle tasks are
    executed in an async executor. This is done to avoid head-of-line blocking in the business logic
    that spins up individual services. This thread is automatically started when the service manager
    is created and stopped either manually, or on application exit.

    All (public) service manager methods are thread-safe.
    """

    _name: str
    _logger: logging.Logger

    # The set of services this service manager knows about.
    _services: dict[str, Service]
    _services_lock: threading.Lock

    # Commands will be queued with associated event loop. Queueing `None` signals shutdown.
    _command_queue: asyncio.Queue[Union[Command, None]]
    _event_loop: asyncio.AbstractEventLoop

    # The pending command counter is used to ensure all commands have been queued before shutdown.
    _pending_commands: AtomicCounter

    # The set of pending tasks after they have been received by the background thread and spawned.
    _tasks: set

    # Fired after the async runtime starts. Object initialization completes after this is set.
    _setup_event: threading.Event

    # Will be acquired to ensure the shutdown sentinel is sent only once. Never released.
    _shutdown_lock: threading.Lock

    def __init__(self, *, name: Optional[str] = None):
        self._name = name if name is not None else (__package__ or __name__)
        self._logger = logging.getLogger(self.name)

        self._services = dict()
        self._services_lock = threading.Lock()

        self._pending_commands = AtomicCounter()
        self._tasks = set()

        self._shutdown_lock = threading.Lock()

        # --- Start the manager thread and wait for it to be ready. ---

        self._setup_event = threading.Event()

        async def start_manager() -> None:
            self._event_loop = asyncio.get_running_loop()
            self._command_queue = asyncio.Queue()

            self._setup_event.set()
            await self._monitor_command_queue()

        self._manager_thread = threading.Thread(
            name=self.name,
            target=lambda: asyncio.run(start_manager()),
            daemon=True,
        )

        self._manager_thread.start()
        atexit.register(partial(self.shutdown, wait=True))

        self._setup_event.wait()

    @property
    def name(self) -> str:
        """The name of this service manager. Primarily intended for logging purposes."""
        return self._name

    @property
    def logger(self) -> logging.Logger:
        """The logger used by this service manager."""
        return self._logger

    @classmethod
    def current(cls) -> ServiceManager:
        """The service manager set in the current context (async task or thread).

        A global default service manager will be automatically created on first access."""

        global default_service_manager

        current = current_service_manager.get(None)
        if current is None:
            with default_service_manager_lock:
                if default_service_manager is None:
                    default_service_manager = cls()

            current = default_service_manager
            current_service_manager.set(current)
        return current

    def make_current(self) -> None:
        """Make this the current service manager."""

        current_service_manager.set(self)

    def run_task(
        self,
        coro: Coroutine,
        *,
        wait: bool = False,
        wait_timeout: Optional[float] = None,
        lock: Optional[asyncio.Lock] = None,
    ) -> None:
        """Run an async task in the service manager thread.

        :param wait: If set, this function will block until the task is complete.
        :param wait_timeout: If set, this function will not return until the task is complete or the
            specified timeout has elapsed.
        """

        if not isinstance(coro, Coroutine):
            raise TypeError(f"Cannot schedule task for object of type {type(coro)}")

        cmd = Command(coro=coro, lock=lock)
        if wait or wait_timeout is not None:
            cmd.done = threading.Event()

        self._send_command(cmd)

        if cmd.done is not None:
            cmd.done.wait(timeout=wait_timeout)

    def shutdown(
        self, *, wait: bool = False, wait_timeout: Optional[float] = None
    ) -> None:
        """Shutdown the service manager thread.

        After the shutdown process completes, any subsequent calls to the service manager will
        produce an error.

        :param wait: If set, this function will block until the shutdown process is complete.
        :param wait_timeout: If set, this function will not return until the shutdown process is
            complete or the specified timeout has elapsed.
        """

        if self._shutdown_lock.acquire(blocking=False):
            self._send_command(None)
        if wait:
            self._manager_thread.join(timeout=wait_timeout)

    def _ensure_running(self) -> None:
        self._setup_event.wait()
        if not self._manager_thread.is_alive():
            raise RuntimeError(f"ServiceManager {self.name} is not running")

    def _send_command(self, command: Union[Command, None]) -> None:
        self._ensure_running()

        async def queue_command() -> None:
            await self._command_queue.put(command)
            self._pending_commands.sub()

        self._pending_commands.add()
        asyncio.run_coroutine_threadsafe(queue_command(), self._event_loop)

    def _register(self, service: Service) -> None:
        """Register a service with the service manager. This is done by the service constructor."""

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

    def _run_command(self, command: Command) -> None:
        """Execute a command and add it to the tasks set."""

        def task_done(task: asyncio.Task) -> None:
            exc = task.exception()
            if exc:
                self.logger.exception("Exception in service manager task", exc_info=exc)
            self._tasks.discard(task)
            if command.done is not None:
                command.done.set()

        async def task_harness() -> None:
            if command.lock is not None:
                async with command.lock:
                    await command.coro
            else:
                await command.coro

        task = asyncio.create_task(task_harness())
        task.add_done_callback(task_done)
        self._tasks.add(task)

    async def _monitor_command_queue(self) -> None:
        """The main function of the background thread."""

        self.logger.info("Started service manager")

        # Main command processing loop.
        while (command := await self._command_queue.get()) is not None:
            self._run_command(command)

        # Send a stop command to all services. We don't have a status command yet, so we can just
        # stop everything and be done with it.
        with self._services_lock:
            self.logger.debug(f"Stopping {len(self._services)} services")
            for service in self._services.values():
                service.stop()

        # Wait for all commands to finish executing.
        await self._shutdown()

        self.logger.info("Exiting service manager")

    async def _shutdown(self) -> None:
        """Ensure all commands have been queued & executed."""

        while True:
            command = None
            try:
                # Try and get a command from the queue.
                command = self._command_queue.get_nowait()
            except asyncio.QueueEmpty:
                if self._pending_commands.value > 0:
                    # If there are pending commands to queue, await them.
                    command = await self._command_queue.get()
                elif self._tasks:
                    # If there are still pending tasks, wait for them. These tasks might queue
                    # commands though, so we have to loop again.
                    await asyncio.wait(self._tasks)
                else:
                    # Nothing is pending at this point, so we're done here.
                    break

            # If we got a command, run it.
            if command is not None:
                self._run_command(command)


class AtomicCounter:
    """A lock-protected atomic counter."""

    # Modern CPUs have atomics, but python doesn't seem to include them in the standard library.
    # Besides, the performance penalty is negligible compared to, well, using python.
    # So this will do just fine.

    def __init__(self, initial: int = 0):
        self._lock = threading.Lock()
        self._value = initial

    def add(self, value: int = 1) -> None:
        with self._lock:
            self._value += value

    def sub(self, value: int = 1) -> None:
        with self._lock:
            self._value -= value

    @property
    def value(self) -> int:
        with self._lock:
            return self._value
