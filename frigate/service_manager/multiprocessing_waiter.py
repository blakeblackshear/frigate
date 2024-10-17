import asyncio
import functools
import logging
import multiprocessing as mp
import queue
import threading
from multiprocessing.connection import Connection
from multiprocessing.connection import wait as mp_wait
from socket import socket
from typing import Any, Optional, Union

logger = logging.getLogger(__name__)


class MultiprocessingWaiter(threading.Thread):
    """A background thread that manages futures for the multiprocessing.connection.wait() method."""

    def __init__(self) -> None:
        super().__init__(daemon=True)

        # Queue of objects to wait for and futures to set results for.
        self._queue: queue.Queue[tuple[Any, asyncio.Future[None]]] = queue.Queue()

        # This is required to get mp_wait() to wake up when new objects to wait for are received.
        receive, send = mp.Pipe(duplex=False)
        self._receive_connection = receive
        self._send_connection = send

    def wait_for_sentinel(self, sentinel: Any) -> asyncio.Future[None]:
        """Create an asyncio.Future tracking a sentinel for multiprocessing.connection.wait()

        Warning: This method is NOT thread-safe.
        """
        # This would be incredibly stupid, but you never know.
        assert sentinel != self._receive_connection

        # Send the future to the background thread for processing.
        future = asyncio.get_running_loop().create_future()
        self._queue.put((sentinel, future))

        # Notify the background thread.
        #
        # This is the non-thread-safe part, but since this method is not really meant to be called
        # by users, we can get away with not adding a lock at this point (to avoid adding 2 locks).
        self._send_connection.send_bytes(b".")

        return future

    def run(self) -> None:
        logger.debug("Started background thread")

        wait_dict: dict[Any, set[asyncio.Future[None]]] = {
            self._receive_connection: set()
        }
        while True:
            for ready_obj in mp_wait(wait_dict.keys()):
                # Make sure we never remove the receive connection from the wait dict
                if ready_obj is self._receive_connection:
                    continue

                logger.debug(
                    f"Sentinel {ready_obj!r} is ready. "
                    f"Notifying {len(wait_dict[ready_obj])} future(s)."
                )

                # Go over all the futures attached to this object and mark them as ready.
                for fut in wait_dict.pop(ready_obj):
                    if fut.cancelled():
                        logger.debug(
                            f"A future for sentinel {ready_obj!r} is ready, "
                            "but the future is cancelled. Skipping."
                        )
                    else:
                        fut.get_loop().call_soon_threadsafe(
                            # Note: We need to check fut.cancelled() again, since it might
                            # have been set before the event loop's definition of "soon".
                            functools.partial(
                                lambda fut: fut.cancelled() or fut.set_result(None), fut
                            )
                        )

            # Check for cancellations in the remaining futures.
            done_objects = []
            for obj, fut_set in wait_dict.items():
                if obj is self._receive_connection:
                    continue

                # Find any cancelled futures and remove them.
                cancelled = [fut for fut in fut_set if fut.cancelled()]
                fut_set.difference_update(cancelled)
                logger.debug(
                    f"Removing {len(cancelled)} future(s) from sentinel: {obj!r}"
                )

                # Mark objects with no remaining futures for removal.
                if len(fut_set) == 0:
                    done_objects.append(obj)

            # Remove any objects that are done after removing cancelled futures.
            for obj in done_objects:
                logger.debug(
                    f"Sentinel {obj!r} no longer has any futures waiting for it."
                )
                del wait_dict[obj]

            # Get new objects to wait for from the queue.
            while True:
                try:
                    obj, fut = self._queue.get_nowait()
                    self._receive_connection.recv_bytes(maxlength=1)
                    self._queue.task_done()

                    logger.debug(f"Received new sentinel: {obj!r}")

                    wait_dict.setdefault(obj, set()).add(fut)
                except queue.Empty:
                    break


waiter_lock = threading.Lock()
waiter_thread: Optional[MultiprocessingWaiter] = None


async def wait(object: Union[mp.Process, Connection, socket]) -> None:
    """Wait for the supplied object to be ready.

    Under the hood, this uses multiprocessing.connection.wait() and a background thread manage the
    returned futures.
    """
    global waiter_thread, waiter_lock

    sentinel: Union[Connection, socket, int]
    if isinstance(object, mp.Process):
        sentinel = object.sentinel
    elif isinstance(object, Connection) or isinstance(object, socket):
        sentinel = object
    else:
        raise ValueError(f"Cannot wait for object of type {type(object).__qualname__}")

    with waiter_lock:
        if waiter_thread is None:
            # Start a new waiter thread.
            waiter_thread = MultiprocessingWaiter()
            waiter_thread.start()

        # Create the future while still holding the lock,
        # since wait_for_sentinel() is not thread safe.
        fut = waiter_thread.wait_for_sentinel(sentinel)

    await fut
