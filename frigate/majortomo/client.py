"""MDP 0.2 Client implementation"""

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
from typing import Iterable, List, Optional, Tuple  # noqa: F401

import zmq

from . import error as e
from . import protocol as p
from .util import TextOrBytes, text_to_ascii_bytes

DEFAULT_ZMQ_LINGER = 2000


class Client(object):
    """MDP 0.2 Client implementation

    :ivar _socket: zmq.Socket
    :type _socket: zmq.Socket
    """

    def __init__(self, broker_url, zmq_context=None, zmq_linger=DEFAULT_ZMQ_LINGER):
        # type: (str, Optional[zmq.Context], int) -> None
        self.broker_url = broker_url
        self._socket = None  # type: zmq.Socket
        self._zmq_context = zmq_context if zmq_context else zmq.Context.instance()
        self._linger = zmq_linger
        self._log = logging.getLogger(__name__)
        self._expect_reply = False

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
        self._expect_reply = False

    def close(self):
        if not self.is_connected():
            return
        self._disconnect()

    def _disconnect(self):
        if not self.is_connected():
            return
        self._log.debug(
            "Disconnecting from broker on ZMQ DEALER socket at %s", self.broker_url
        )
        self._socket.setsockopt(zmq.LINGER, 0)
        self._socket.disconnect(self.broker_url)
        self._socket.close()
        self._socket = None

    def is_connected(self):
        # type: () -> bool
        """Tell whether we are currently connected"""
        return self._socket is not None

    def send(self, service, *args):
        # type: (TextOrBytes, *bytes) -> None
        """Send a REQUEST command to the broker to be passed to the given service.

        Each additional argument will be sent as a request body frame.
        """
        if self._expect_reply:
            raise e.StateError(
                "Still expecting reply from broker, cannot send new request"
            )

        service = text_to_ascii_bytes(service)
        self._log.debug(
            "Sending REQUEST message to %s with %d frames in body", service, len(args)
        )
        self._socket.send_multipart((b"", p.CLIENT_HEADER, p.REQUEST, service) + args)
        self._expect_reply = True

    def recv_part(self, timeout=None):
        # type: (Optional[float]) -> Optional[List[bytes]]
        """Receive a single part of the reply, partial or final

        Note that a "part" is actually a list in this case, as any reply part can contain multiple frames.

        If there are no more parts to receive, will return None
        """
        if not self._expect_reply:
            return None

        timeout = int(timeout * 1000) if timeout else None

        poller = zmq.Poller()
        poller.register(self._socket, zmq.POLLIN)

        try:
            socks = dict(poller.poll(timeout=timeout))
            if socks.get(self._socket) == zmq.POLLIN:
                message = self._socket.recv_multipart()
                m_type, m_content = self._parse_message(message)
                if m_type == p.FINAL:
                    self._expect_reply = False
                return m_content
            else:
                raise e.Timeout("Timed out waiting for reply from broker")
        finally:
            poller.unregister(self._socket)

    def recv_all(self, timeout=None):
        # type: (Optional[float]) -> Iterable[List[bytes]]
        """Return a generator allowing to iterate over all reply parts

        Note that `timeout` applies to each part, not to the full list of parts
        """
        while True:
            part = self.recv_part(timeout)
            if part is None:
                break
            yield part

    def recv_all_as_list(self, timeout=None):
        # type: (Optional[float]) -> List[bytes]
        """Return all reply parts as a single, flat list of frames"""
        return [frame for part in self.recv_all(timeout) for frame in part]

    @staticmethod
    def _parse_message(message):
        # type: (List[bytes]) -> Tuple[bytes, List[bytes]]
        """Parse and validate an incoming message"""
        if len(message) < 3:
            raise e.ProtocolError(
                "Unexpected message length, expecting at least 3 frames, got {}".format(
                    len(message)
                )
            )

        if message.pop(0) != b"":
            raise e.ProtocolError("Expecting first message frame to be empty")

        if message[0] != p.CLIENT_HEADER:
            print(message)
            raise e.ProtocolError(
                "Unexpected protocol header [{}], expecting [{}]".format(
                    message[0].decode("utf8"), p.WORKER_HEADER.decode("utf8")
                )
            )

        if message[1] not in {p.PARTIAL, p.FINAL}:
            raise e.ProtocolError(
                "Unexpected message type [{}], expecting either PARTIAL or FINAL".format(
                    message[1].decode("utf8")
                )
            )

        return message[1], message[2:]

    def __enter__(self):
        self.connect()
        return self

    def __exit__(self, exc_type, exc_val, exc_tb):
        self.close()
