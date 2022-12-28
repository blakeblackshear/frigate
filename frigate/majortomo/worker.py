"""MDP 0.2 Worker implementation"""

# Copyright (c) 2018 Shoppimon LTD
#
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#
#    http://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.

import logging
import signal
import time
import multiprocessing as mp
from typing import Generator, Iterable, List, Optional, Tuple  # noqa: F401

import zmq

from . import error, protocol
from .util import TextOrBytes, text_to_ascii_bytes

DEFAULT_ZMQ_LINGER = 2500


class Worker(object):
    """MDP 0.2 Worker implementation"""

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
        self.broker_url = broker_url
        self.service_names = [
            text_to_ascii_bytes(service_name) for service_name in service_names
        ]

        self.heartbeat_interval = heartbeat_interval
        self._socket = None  # type: zmq.Socket
        self._poller = None  # type: zmq.Poller
        self._zmq_context = zmq_context if zmq_context else zmq.Context.instance()
        self._linger = zmq_linger
        self._log = logging.getLogger(__name__)
        self._heartbeat_timeout = heartbeat_timeout
        self._last_broker_hb = 0.0
        self._last_sent_message = 0.0

        self.ready_params = [
            text_to_ascii_bytes(rp)
            for rp in (
                ([handler_name] if handler_name is not None else []) + handler_params
            )
        ]

        self.stop_event = stop_event or mp.Event()

    def connect(self, reconnect=False):
        # type: (bool) -> None
        if self.is_connected():
            if not reconnect:
                return
            self._disconnect()

        # Set up socket
        self._socket = self._zmq_context.socket(zmq.DEALER)
        self._socket.setsockopt(zmq.LINGER, self._linger)
        self._socket.connect(self.broker_url)
        self._log.debug(
            "Connected to broker on ZMQ DEALER socket at %s", self.broker_url
        )

        self._poller = zmq.Poller()
        self._poller.register(self._socket, zmq.POLLIN)

        self._send_ready()
        self._last_broker_hb = time.time()

    def wait_for_request(self):
        # type: () -> Tuple[bytes, List[bytes]]
        """Wait for a REQUEST command from the broker and return the client address and message body frames.

        Will internally handle timeouts, heartbeats and check for protocol errors and disconnect commands.
        """
        command, frames = self._receive()

        if command == protocol.DISCONNECT:
            self._log.debug("Got DISCONNECT from broker; Disconnecting")
            self._disconnect()
            raise error.Disconnected("Disconnected on message from broker")

        elif command != protocol.REQUEST:
            raise error.ProtocolError(
                "Unexpected message type from broker: {}".format(command.decode("utf8"))
            )

        if len(frames) < 3:
            raise error.ProtocolError(
                "Unexpected REQUEST message size, got {} frames, expecting at least 3".format(
                    len(frames)
                )
            )

        client_addr = frames[0]
        request = frames[2:]
        return client_addr, request

    def send_reply_final(self, client, frames):
        # type: (bytes, List[bytes]) -> None
        """Send final reply to client

        FINAL reply means the client will not expect any additional parts to the reply. This should be used
        when the entire reply is ready to be delivered.
        """
        self._send_to_client(client, protocol.FINAL, *frames)

    def send_reply_partial(self, client, frames):
        # type: (bytes, List[bytes]) -> None
        """Send the given set of frames as a partial reply to client

        PARTIAL reply means the client will expect zero or more additional PARTIAL reply messages following
        this one, with exactly one terminating FINAL reply following. This should be used if parts of the
        reply are ready to be sent, and the client is capable of processing them while the worker is still
        at work on the rest of the reply.
        """
        self._send_to_client(client, protocol.PARTIAL, *frames)

    def send_reply_from_iterable(self, client, frames_iter, final=None):
        # type: (bytes, Iterable[List[bytes]], List[bytes]) -> None
        """Send multiple partial replies from an iterator as PARTIAL replies to client.

        If `final` is provided, it will be sent as the FINAL reply after all PARTIAL replies are sent.
        """
        for part in frames_iter:
            self.send_reply_partial(client, part)
        if final:
            self.send_reply_final(client, final)

    def close(self):
        if not self.is_connected():
            return
        self._send_disconnect()
        self._disconnect()

    def is_connected(self):
        return self._socket is not None

    def _disconnect(self):
        if not self.is_connected():
            return
        self._socket.disconnect(self.broker_url)
        self._socket.close()
        self._socket = None
        self._last_sent_message -= self.heartbeat_interval

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

    def _send_ready(self):
        for service_name in self.service_names:
            self._send(protocol.READY, service_name, *self.ready_params)

    def handle_request(client_id: bytes, request: List[bytes]) -> List[bytes]:
        return request

    def _send_disconnect(self):
        self._send(protocol.DISCONNECT)

    def _check_send_heartbeat(self):
        if time.time() - self._last_sent_message >= self.heartbeat_interval:
            self._log.debug("Sending HEARTBEAT to broker")
            self._send(protocol.HEARTBEAT)

    def _send_to_client(self, client, message_type, *frames):
        self._send(message_type, client, b"", *frames)

    def _send(self, message_type, *args):
        # type: (bytes, *bytes) -> None
        self._socket.send_multipart((b"", protocol.WORKER_HEADER, message_type) + args)
        self._last_sent_message = time.time()

    def _get_poll_timeout(self):
        # type: () -> int
        """Return the poll timeout for the current iteration in milliseconds"""
        return max(
            0,
            int(
                (time.time() - self._last_sent_message + self.heartbeat_interval) * 1000
            ),
        )

    @staticmethod
    def _verify_message(message):
        # type: (List[bytes]) -> Tuple[bytes, List[bytes]]
        if len(message) < 3:
            raise error.ProtocolError(
                "Unexpected message length, expecting at least 3 frames, got {}".format(
                    len(message)
                )
            )

        if message.pop(0) != b"":
            raise error.ProtocolError("Expecting first message frame to be empty")

        if message[0] != protocol.WORKER_HEADER:
            print(message)
            raise error.ProtocolError(
                "Unexpected protocol header [{}], expecting [{}]".format(
                    message[0].decode("utf8"), protocol.WORKER_HEADER.decode("utf8")
                )
            )

        if message[1] not in {
            protocol.DISCONNECT,
            protocol.HEARTBEAT,
            protocol.REQUEST,
        }:
            raise error.ProtocolError(
                "Unexpected message type [{}], expecting either HEARTBEAT, REQUEST or "
                "DISCONNECT".format(message[1].decode("utf8"))
            )

        return message[1], message[2:]

    def __enter__(self):
        self.connect()
        return self

    def __exit__(self, exc_type, exc_val, exc_tb):
        self.close()

    def start(self):
        if not self.is_connected():
            self.connect()

        def signal_handler(sig_num, _):
            self.stop()

        for sig_num in (signal.SIGINT, signal.SIGTERM):
            signal.signal(sig_num, signal_handler)

        while not self.stop_event.is_set():
            try:
                client_id, request = self.wait_for_request()
                reply = self.handle_request(client_id, request)
                self.send_reply_final(client_id, reply)
            except error.ProtocolError as e:
                self._log.warning("Protocol error: %s, dropping request", str(e))
                continue
            except error.Disconnected:
                self._log.info("Worker disconnected")
                break

        self.close()

    def stop(self):
        self.stop_event.set()
