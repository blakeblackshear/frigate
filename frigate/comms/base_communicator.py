from abc import ABC, abstractmethod
from collections.abc import Callable
from typing import TYPE_CHECKING, Any

if TYPE_CHECKING:
    from frigate.comms.dispatcher import Dispatcher


class Communicator(ABC):
    """pub/sub model via specific protocol."""

    def attach_dispatcher(self, dispatcher: "Dispatcher") -> None:
        """Receive the owning dispatcher.

        Transports that need more than the receiver callback (the command topic
        surface, the snapshot API) take it here rather than reaching through the
        bound receiver.
        """
        return None

    def start(self) -> None:
        """Start background I/O after receiver wiring is complete."""
        return None

    @abstractmethod
    def publish(self, topic: str, payload: Any, retain: bool = False) -> None:
        """Send data via specific protocol."""
        pass

    @abstractmethod
    def subscribe(self, receiver: Callable) -> None:
        """Pass receiver so communicators can pass commands."""
        pass

    @abstractmethod
    def stop(self) -> None:
        """Stop the communicator."""
        pass
