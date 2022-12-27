"""Majordomo / `MDP/0.2 <https://rfc.zeromq.org/spec:18/MDP/>`_ broker implementation.

Extends the implementation of https://github.com/shoppimon/majortomo
"""

import signal
import threading
import time
import zmq
import multiprocessing as mp
from multiprocessing.shared_memory import SharedMemory
from typing import (
    DefaultDict,
    Dict,
    Generator,
    List,
    Optional,
    Tuple,
    Union,
)  # noqa: F401
from majortomo import error, protocol
from majortomo.config import DEFAULT_BIND_URL
from majortomo.broker import (
    Broker,
    Worker as MdpBrokerWorker,
    ServicesContainer,
    id_to_int,
)
from majortomo.util import TextOrBytes, text_to_ascii_bytes
from majortomo.worker import DEFAULT_ZMQ_LINGER, Worker as MdpWorker


class BrokerWorker(MdpBrokerWorker):
    """Worker objects represent a connected / known MDP worker process"""

    def __init__(
        self, worker_id: bytes, service: bytes, expire_at: float, next_heartbeat: float
    ):
        super().__init__(worker_id, service, expire_at, next_heartbeat)
        self.request_handler: str
        self.request_params: list[str] = []


class QueueServicesContainer(ServicesContainer):
    def __init__(self, busy_workers_timeout=protocol.DEFAULT_BUSY_WORKER_TIMEOUT):
        super().__init__(busy_workers_timeout)

    def dequeue_pending(self):
        # type: () -> Generator[Tuple[List[bytes], BrokerWorker, bytes], None, None]
        """Pop ready message-worker pairs from all service queues so they can be dispatched"""
        for service_name, service in self._services.items():
            for message, worker, client in service.dequeue_pending():
                yield message, worker, client, service_name

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
            worker = BrokerWorker(worker_id, set([service]), expire_at, next_heartbeat)
            self._workers[worker.id] = worker
        self._services[service].add_worker(worker)
        return worker

    def set_worker_available(self, worker_id, expire_at, next_heartbeat):
        # type: (bytes, float, float) -> BrokerWorker
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


class QueueBroker(Broker):
    def __init__(
        self,
        bind: Union[str, List[str]] = [DEFAULT_BIND_URL],
        heartbeat_interval=protocol.DEFAULT_HEARTBEAT_INTERVAL,
        heartbeat_timeout=protocol.DEFAULT_HEARTBEAT_TIMEOUT,
        busy_worker_timeout=protocol.DEFAULT_BUSY_WORKER_TIMEOUT,
        zmq_context=None,
    ):
        super().__init__(
            heartbeat_interval=heartbeat_interval,
            heartbeat_timeout=heartbeat_timeout,
            busy_worker_timeout=busy_worker_timeout,
            zmq_context=zmq_context,
        )
        self._services = QueueServicesContainer(busy_worker_timeout)
        self._bind_urls = [bind] if not isinstance(bind, list) else bind
        self.broker_thread: threading.Thread = None
        self.request_handlers: Dict[str, object] = {}

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

    def start(self):
        self.broker_thread = threading.Thread(target=self.run)
        self.broker_thread.start()

    def stop(self):
        super().stop()
        if self.broker_thread is not None:
            self.broker_thread.join()
            self.broker_thread = None

    def _handle_worker_message(self, message):
        if message.command == protocol.READY:
            self._handle_worker_ready(message)
        else:
            super()._handle_worker_message(message)

    def _handle_worker_ready(self, message):
        # type: (protocol.Message) -> BrokerWorker
        worker_id = message.client
        service = message.message[0]
        self._log.info("Got READY from worker: %d", id_to_int(worker_id))
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

    def on_worker_request(
        self, worker: BrokerWorker, service_name: bytes, body: List[bytes]
    ):
        if worker.request_handler in self.request_handlers:
            handler = self.request_handlers[worker.request_handler]
            body = handler(worker, service_name, body)
        return body


class QueueWorker(MdpWorker):
    def __init__(
        self,
        broker_url: str,
        service_names: List[TextOrBytes],
        heartbeat_interval=protocol.DEFAULT_HEARTBEAT_INTERVAL,
        heartbeat_timeout=protocol.DEFAULT_HEARTBEAT_TIMEOUT,
        zmq_context=None,
        zmq_linger=DEFAULT_ZMQ_LINGER,
        handler_name: TextOrBytes = None,
        handler_params: List[TextOrBytes] = [],
        stop_event: mp.Event = None,
    ):
        super().__init__(
            broker_url,
            b"",
            heartbeat_interval,
            heartbeat_timeout,
            zmq_context,
            zmq_linger,
        )

        self.service_names = [
            text_to_ascii_bytes(service_name) for service_name in service_names
        ]
        self.ready_params = [
            text_to_ascii_bytes(rp)
            for rp in (
                ([handler_name] if handler_name is not None else []) + handler_params
            )
        ]
        self.stop_event = stop_event or mp.Event()

    def _send_ready(self):
        for service_name in self.service_names:
            self._send(protocol.READY, service_name, *self.ready_params)

    def handle_request(client_id: bytes, request: List[bytes]) -> List[bytes]:
        return request

    def start(self):
        if not self.is_connected:
            self.connect()

        def signal_handler(sig_num, _):
            self.stop()

        for sig_num in (signal.SIGINT, signal.SIGTERM):
            signal.signal(sig_num, signal_handler)

        while not self.stop_event.is_set():
            try:
                client_id, request = self.wait_for_request()
                reply = self.handle_request(client_id, request)
                self.send_reply_final(reply)
            except error.ProtocolError as e:
                self._log.warning("Protocol error: %s, dropping request", str(e))
                continue
            except error.Disconnected:
                self._log.info("Worker disconnected")
                break

        self.close()

    def stop(self):
        self.stop_event.set()

    def _receive(self):
        # type: () -> Tuple[bytes, List[bytes]]
        """Poll on the socket until a command is received

        Will handle timeouts and heartbeats internally without returning
        """
        while not self.stop_event.is_set():
            if self._socket is None:
                raise error.Disconnected("Worker is disconnected")

            self._check_send_heartbeat()
            poll_timeout = self._get_poll_timeout()

            try:
                socks = dict(self._poller.poll(timeout=poll_timeout))
            except zmq.error.ZMQError:
                # Probably connection was explicitly closed
                if self._socket is None:
                    continue
                raise

            if socks.get(self._socket) == zmq.POLLIN:
                message = self._socket.recv_multipart()
                self._log.debug("Got message of %d frames", len(message))
            else:
                self._log.debug("Receive timed out after %d ms", poll_timeout)
                if (time.time() - self._last_broker_hb) > self._heartbeat_timeout:
                    # We're not connected anymore?
                    self._log.info(
                        "Got no heartbeat in %d sec, disconnecting and reconnecting socket",
                        self._heartbeat_timeout,
                    )
                    self.connect(reconnect=True)
                continue

            command, frames = self._verify_message(message)
            self._last_broker_hb = time.time()

            if command == protocol.HEARTBEAT:
                self._log.debug("Got heartbeat message from broker")
                continue

            return command, frames

        return protocol.DISCONNECT, []
