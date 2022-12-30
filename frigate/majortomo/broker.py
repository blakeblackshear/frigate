"""Majordomo / `MDP/0.2 <https://rfc.zeromq.org/spec:18/MDP/>`_ broker implementation."""

import logging
import logging.config
import threading
import time
from collections import OrderedDict, defaultdict, deque
from itertools import chain
from typing import (
    DefaultDict,
    Dict,
    Generator,
    List,
    Optional,
    Tuple,
    Union,
)  # noqa: F401

import zmq

from . import error, protocol
from .util import id_to_int

DEFAULT_BIND_URL = "tcp://0.0.0.0:5555"


class Broker:
    def __init__(
        self,
        bind: Union[str, List[str]] = [DEFAULT_BIND_URL],
        heartbeat_interval=protocol.DEFAULT_HEARTBEAT_INTERVAL,
        heartbeat_timeout=protocol.DEFAULT_HEARTBEAT_TIMEOUT,
        busy_worker_timeout=protocol.DEFAULT_BUSY_WORKER_TIMEOUT,
        zmq_context=None,
    ):
        self._log = logging.getLogger(__name__)
        self._bind_urls = [bind] if not isinstance(bind, list) else bind
        self._heartbeat_interval = heartbeat_interval
        self._heartbeat_timeout = heartbeat_timeout
        self._busy_worker_timeout = busy_worker_timeout

        self._context = zmq_context if zmq_context else zmq.Context.instance()
        self._socket = None  # type: zmq.Socket
        self._services = ServicesContainer(busy_worker_timeout)
        self._stop = False

        self.broker_thread: threading.Thread = None
        self.request_handlers: Dict[str, object] = {}

    def run(self):
        """Run in a main loop handling all incoming requests, until `stop()` is called"""
        self._log.info("MDP Broker starting up")
        self._stop = False
        self.bind()

        try:
            while not self._stop:
                try:
                    message = self.receive()
                    if message:
                        self.handle_message(message)
                except Exception:
                    self._log.exception("Message handling failed")

        finally:
            self.close()
            self._log.info("MDP Broker shutting down")

    def start(self):
        self.broker_thread = threading.Thread(target=self.run)
        self.broker_thread.name = "zmq_majordomo_broker"
        self.broker_thread.start()

    def stop(self):
        """Stop the broker's main loop"""
        self._stop = True
        if self.broker_thread is not None:
            self.broker_thread.join()
            self.broker_thread = None

    def bind(self):
        """Bind the ZMQ socket"""
        if self._socket:
            raise error.StateError("Socket is already bound")

        self._socket = self._context.socket(zmq.ROUTER)
        self._socket.rcvtimeo = int(self._heartbeat_interval * 1000)
        for bind_url in self._bind_urls:
            self._socket.bind(bind_url)
            self._log.info("Broker listening on %s", bind_url)

    def close(self):
        if self._socket is None:
            return
        for bind_url in self._bind_urls:
            self._socket.disconnect(bind_url)
        self._socket.close()
        self._socket = None
        self._log.info("Broker socket closing")

    def receive(self):
        """Run until a message is received"""
        while True:
            self._purge_expired_workers()
            self._send_heartbeat()
            try:
                frames = self._socket.recv_multipart()
            except zmq.error.Again:
                if self._socket is None or self._stop:
                    self._log.debug(
                        "Socket has been closed or broker has been shut down, breaking from recv loop"
                    )
                    break
                continue

            self._log.debug("Got message of %d frames", len(frames))
            try:
                return self._parse_incoming_message(frames)
            except error.ProtocolError as e:
                self._log.warning(str(e))
                continue

    def handle_message(self, message):
        # type: (protocol.Message) -> None
        """Handle incoming message"""
        if message.header == protocol.WORKER_HEADER:
            self._handle_worker_message(message)
        elif message.header == protocol.CLIENT_HEADER:
            self._handle_client_message(message)
        else:
            raise error.ProtocolError(
                "Unexpected protocol header: {}".format(message.header.decode("utf8"))
            )

        self._dispatch_queued_messages()

    def _handle_worker_message(self, message):
        # type: (protocol.Message) -> None
        """Handle message from a worker"""
        if message.command == protocol.HEARTBEAT:
            self._handle_worker_heartbeat(message.client)
        elif message.command == protocol.READY:
            self._handle_worker_ready(message)
        elif message.command == protocol.FINAL:
            self._handle_worker_final(
                message.client, message.message[0], message.message[2:]
            )
        elif message.command == protocol.PARTIAL:
            self._handle_worker_partial(
                message.client, message.message[0], message.message[2:]
            )
        elif message.command == protocol.DISCONNECT:
            self._handle_worker_disconnect(message.client)
        else:
            self._send_to_worker(message.client, protocol.DISCONNECT)
            raise error.ProtocolError(
                "Unexpected command from worker: {}".format(
                    message.command.decode("utf8")
                )
            )

    def _handle_worker_heartbeat(self, worker_id):
        # type: (bytes) -> None
        """Heartbeat from worker"""
        worker = self._services.get_worker(worker_id)
        if worker is None:
            if not self._services.is_busy_worker(worker_id):
                self._log.warning(
                    "Got HEARTBEAT from unknown worker: %d", id_to_int(worker_id)
                )
                self._send_to_worker(worker_id, protocol.DISCONNECT)
            return

        self._log.debug("Got HEARTBEAT from worker: %d", id_to_int(worker_id))
        worker.expire_at = time.time() + self._heartbeat_timeout

    def _handle_worker_ready(self, message):
        # type: (protocol.Message) -> ServiceWorker
        worker_id = message.client
        service = message.message[0]
        self._log.debug("Got READY from worker: %d", id_to_int(worker_id))
        now = time.time()
        expire_at = now + self._heartbeat_timeout
        next_heartbeat = now + self._heartbeat_interval
        worker = self._services.add_worker(
            worker_id, service, expire_at, next_heartbeat
        )
        worker.request_handler = None
        worker.request_params = []
        if len(message.message) > 1:
            worker.request_handler = str(message.message[1], "ascii")
        if len(message.message) > 2:
            worker.request_params = [str(m, "ascii") for m in message.message[2:]]
        return worker

    def _handle_worker_partial(self, worker_id, client_id, body):
        # type: (bytes, bytes, List[bytes]) -> None
        self._log.debug(
            "Got PARTIAL from worker: %d to client: %d",
            id_to_int(worker_id),
            id_to_int(client_id),
        )
        self._send_to_client(client_id, protocol.PARTIAL, body)

    def _handle_worker_final(self, worker_id, client_id, body):
        # type: (bytes, bytes, List[bytes]) -> None
        self._log.debug(
            "Got FINAL from worker: %d to client: %d",
            id_to_int(worker_id),
            id_to_int(client_id),
        )
        self._send_to_client(client_id, protocol.FINAL, body)
        now = time.time()
        self._services.set_worker_available(
            worker_id, now + self._heartbeat_timeout, now + self._heartbeat_interval
        )

    def _handle_worker_disconnect(self, worker_id):
        # type: (bytes) -> None
        self._log.info("Got DISCONNECT from worker: %d", id_to_int(worker_id))
        try:
            self._services.remove_worker(worker_id)
        except KeyError:
            self._log.info(
                "Got DISCONNECT from unknown worker: %d; ignoring", id_to_int(worker_id)
            )

    def _handle_client_message(self, message):
        # type: (protocol.Message) -> None
        """Handle message from a client"""
        assert message.command == protocol.REQUEST
        if len(message.message) < 2:
            raise error.ProtocolError(
                "Client REQUEST message is expected to be at least 2 frames long, got {}".format(
                    len(message.message)
                )
            )

        service_name = message.message[0]
        body = message.message[1:]

        # TODO: Plug-in MMA handling

        self._log.debug(
            "Queueing client request from %d to %s",
            id_to_int(message.client),
            service_name.decode("ascii"),
        )
        self._services.queue_client_request(message.client, service_name, body)

    def _dispatch_queued_messages(self):
        """Dispatch all queued messages to available workers"""
        expire_at = time.time() + self._busy_worker_timeout
        for message, worker, client, service_name in self._services.dequeue_pending():
            body = [client, b""] + message
            body = self.on_worker_request(worker, service_name, body)
            self._send_to_worker(worker.id, protocol.REQUEST, body)
            self._services.set_worker_busy(worker.id, expire_at=expire_at)

    def register_request_handler(self, handler_name: str, handler):
        self.request_handlers[handler_name] = handler

    def on_worker_request(self, worker, service_name, body):
        # type: (ServiceWorker, bytes, List[bytes]) -> List[bytes]
        if worker.request_handler in self.request_handlers:
            handler = self.request_handlers[worker.request_handler]
            body = handler(worker, service_name, body)
        return body

    def _purge_expired_workers(self):
        """Purge expired workers from the services container"""
        for worker in list(
            self._services.expired_workers()
        ):  # Copying to list as we are going to mutate
            self._log.debug(
                "Worker %d timed out after %0.2f sec, purging",
                id_to_int(worker.id),
                self._busy_worker_timeout
                if worker.is_busy
                else self._heartbeat_timeout,
            )
            self._send_to_worker(worker.id, protocol.DISCONNECT)
            self._services.remove_worker(worker.id)

    def _send_heartbeat(self):
        """Send heartbeat to all workers that didn't get any messages recently"""
        now = time.time()
        for worker in self._services.heartbeat_workers():
            self._log.debug("Sending heartbeat to worker: %d", id_to_int(worker.id))
            self._send_to_worker(worker.id, protocol.HEARTBEAT)
            worker.next_heartbeat = now + self._heartbeat_interval

    def _send_to_worker(self, worker_id, command, body=None):
        # type: (bytes, bytes, Optional[List[bytes]]) -> None
        """Send message to worker"""
        if body is None:
            body = []
        self._socket.send_multipart(
            [worker_id, b"", protocol.WORKER_HEADER, command] + body
        )

    def _send_to_client(self, client_id, command, body):
        # type: (bytes, bytes, List[bytes]) -> None
        """Send message to client"""
        self._socket.send_multipart(
            [client_id, b"", protocol.CLIENT_HEADER, command] + body
        )

    @staticmethod
    def _parse_incoming_message(frames):
        # type: (List[bytes]) -> protocol.Message
        """Parse and verify incoming message"""
        if len(frames) < 4:
            raise error.ProtocolError(
                "Unexpected message length: expecting at least 4 frames, got {}".format(
                    len(frames)
                )
            )

        if frames[1] != b"":
            raise error.ProtocolError(
                "Expecting empty frame 1, got {} bytes".format(len(frames[1]))
            )

        return protocol.Message(
            client=frames[0], header=frames[2], command=frames[3], message=frames[4:]
        )


class ServiceWorker:
    """ServiceWorker objects represent a connected / known MDP worker process"""

    def __init__(
        self,
        worker_id: bytes,
        service: set[bytes],
        expire_at: float,
        next_heartbeat: float,
    ):
        self.id = worker_id
        self.service = service
        self.expire_at = expire_at
        self.next_heartbeat = next_heartbeat
        self.is_busy = False
        self.request_handler: str
        self.request_params: list[str] = []

    def is_expired(self, now=None):
        # type: (Optional[float]) -> bool
        """Check if worker is expired"""
        if now is None:
            now = time.time()
        return now >= self.expire_at

    def is_heartbeat(self, now=None):
        # type: (Optional[float]) -> bool
        """Check if worker is due for sending a heartbeat message"""
        if now is None:
            now = time.time()
        return now >= self.next_heartbeat


class Service:
    """Service objects manage all workers that can handle a specific service, as well as a queue of MDP Client
    requests to be handled by this service
    """

    def __init__(self):
        self._queue = deque()
        self._workers = OrderedDict()

    def queue_request(self, client, request_body):
        # type: (bytes, List[bytes]) -> None
        """Queue a client request"""
        self._queue.append((client, request_body))

    def add_worker(self, worker):
        # type: (ServiceWorker) -> None
        """Add a ServiceWorker to the service"""
        self._workers[worker.id] = worker

    def remove_worker(self, worker_id):
        # type: (bytes) -> None
        """Remove a worker from the service"""
        if worker_id in self._workers:
            del self._workers[worker_id]

    def dequeue_pending(self):
        # type: () -> Generator[Tuple[List[bytes], ServiceWorker, bytes], None, None]
        """Dequeue pending workers and requests to be handled by them"""
        while len(self._queue) and len(self._workers):
            client, message = self._queue.popleft()
            _, worker = self._workers.popitem(last=False)
            yield message, worker, client

    @property
    def queued_requests(self):
        # type: () -> int
        """Number of queued requests for this service"""
        return len(self._queue)

    @property
    def available_workers(self):
        # type: () -> int
        """Number of available workers for this service"""
        return len(self._workers)


class ServicesContainer:
    """A container for all services managed by the broker"""

    def __init__(self, busy_workers_timeout=protocol.DEFAULT_BUSY_WORKER_TIMEOUT):
        # type: (float) -> None
        self._busy_workers_timeout = busy_workers_timeout
        self._services = defaultdict(Service)  # type: DefaultDict[bytes, Service]
        self._workers = OrderedDict()  # type: OrderedDict[bytes, ServiceWorker]
        self._busy_workers = dict()  # type: Dict[bytes, ServiceWorker]

    def queue_client_request(self, client, service, body):
        # type: (bytes, bytes, List[bytes]) -> None
        """Queue a request from a client"""
        self._services[service].queue_request(client, body)

    def dequeue_pending(self):
        # type: () -> Generator[Tuple[List[bytes], ServiceWorker, bytes], None, None]
        """Pop ready message-worker pairs from all service queues so they can be dispatched"""
        for service_name, service in self._services.items():
            for message, worker, client in service.dequeue_pending():
                for other_service in self._services.values():
                    other_service.remove_worker(worker.id)
                yield message, worker, client, service_name

    def get_worker(self, worker_id):
        # type: (bytes) -> Optional[ServiceWorker]
        """Get a worker by ID if exists"""
        return self._workers.get(worker_id, None)

    def add_worker(
        self, worker_id: bytes, service: bytes, expire_at: float, next_heartbeat: float
    ):
        """Add a worker to the list of available workers"""
        if worker_id in self._workers:
            worker = self._workers[worker_id]
            if service in worker.service:
                raise error.StateError(
                    f"Worker '{id_to_int(worker_id)}' has already sent READY message for service '{service.decode('ascii')}'"
                )
            else:
                worker.service.add(service)
        else:
            worker = ServiceWorker(worker_id, set([service]), expire_at, next_heartbeat)
            self._workers[worker.id] = worker
        self._services[service].add_worker(worker)
        return worker

    def set_worker_busy(self, worker_id, expire_at):
        # type: (bytes, float) -> ServiceWorker
        """Mark a worker as busy - that is currently processing a request and not available for more work"""
        if worker_id not in self._workers:
            raise error.StateError(
                "Worker id {} is not in the list of available workers".format(
                    id_to_int(worker_id)
                )
            )
        worker = self._workers.pop(worker_id)
        worker.is_busy = True
        worker.expire_at = expire_at
        self._busy_workers[worker.id] = worker
        return worker

    def set_worker_available(self, worker_id, expire_at, next_heartbeat):
        # type: (bytes, float, float) -> ServiceWorker
        """Mark a worker that was busy processing a request as back and available again"""
        if worker_id not in self._busy_workers:
            raise error.StateError(
                "Worker id {} is not previously known or has expired".format(
                    id_to_int(worker_id)
                )
            )
        worker = self._busy_workers.pop(worker_id)
        worker.is_busy = False
        worker.expire_at = expire_at
        worker.next_heartbeat = next_heartbeat
        self._workers[worker_id] = worker
        for service in worker.service:
            self._services[service].add_worker(worker)
        return worker

    def is_busy_worker(self, worker_id):
        # type: (bytes) -> bool
        """Return True if the given worker_id is of a known busy worker"""
        return worker_id in self._busy_workers

    def remove_worker(self, worker_id):
        # type: (bytes) -> None
        """Remove a worker from the list of known workers"""
        try:
            worker = self._workers[worker_id]
            for service_name in worker.service:
                service = self._services[service_name]
                if worker_id in service._workers:
                    service.remove_worker(worker_id)
            del self._workers[worker_id]
        except KeyError:
            try:
                del self._busy_workers[worker_id]
            except KeyError:
                raise error.StateError(f"Worker id {id_to_int(worker_id)} is not known")

    def heartbeat_workers(self):
        # type: () -> Generator[ServiceWorker, None, None]
        """Get iterator of workers waiting for a heartbeat"""
        now = time.time()
        return (w for w in self._workers.values() if w.is_heartbeat(now))

    def expired_workers(self):
        # type: () -> Generator[ServiceWorker, None, None]
        """Get iterator of workers that have expired (no heartbeat received in too long) and busy workers that
        have not returned in too long
        """
        now = time.time()
        return (
            w
            for w in chain(self._workers.values(), self._busy_workers.values())
            if w.is_expired(now)
        )
