import signal
import threading
import zmq
from multiprocessing.shared_memory import SharedMemory
from typing import Union, List
from majortomo import error, protocol
from majortomo.config import DEFAULT_BIND_URL
from majortomo.broker import Broker


READY_SHM = b"\007"


class ObjectDetectionBroker(Broker):
    def __init__(
        self,
        bind: Union[str, List[str]] = DEFAULT_BIND_URL,
        shms: dict[str, SharedMemory] = {},
        heartbeat_interval=protocol.DEFAULT_HEARTBEAT_INTERVAL,
        heartbeat_timeout=protocol.DEFAULT_HEARTBEAT_TIMEOUT,
        busy_worker_timeout=protocol.DEFAULT_BUSY_WORKER_TIMEOUT,
        zmq_context=None,
    ):
        protocol.Message.ALLOWED_COMMANDS[protocol.WORKER_HEADER].add(READY_SHM)

        super().__init__(
            self,
            heartbeat_interval=heartbeat_interval,
            heartbeat_timeout=heartbeat_timeout,
            busy_worker_timeout=busy_worker_timeout,
            zmq_context=zmq_context,
        )
        self.shm_workers = set()
        self.shms = shms
        self._bind_urls = [bind] if not isinstance(bind, list) else bind
        self.broker_thread: threading.Thread = None

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

    def _handle_worker_message(self, message):
        if message.command == READY_SHM:
            self.shm_workers.add(message.client)
            self._handle_worker_ready(message.client, message.message[0])
        else:
            super()._handle_worker_message(message)

    def _purge_expired_workers(self):
        self.shm_workers.intersection_update(self._services._workers.keys())
        super()._purge_expired_workers()

    def _send_to_worker(self, worker_id, command, body=None):
        if (
            worker_id not in self.shm_workers
            and command == protocol.REQUEST
            and body is not None
        ):
            service_name = body[2]
            in_shm = self.shms[str(service_name, "ascii")]
            tensor_input = in_shm.buf
            body = body[0:2] + [tensor_input]
        super()._send_to_worker(worker_id, command, body)

    def start(self):
        self.broker_thread = threading.Thread(target=self.run)
        self.broker_thread.start()

    def stop(self):
        super().stop()
        if self.broker_thread is not None:
            self.broker_thread.join()
            self.broker_thread = None
