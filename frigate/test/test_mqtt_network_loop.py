import fcntl
import resource
import selectors
import socket
import time
import unittest
from unittest.mock import MagicMock, patch

import paho.mqtt.client as mqtt
from paho.mqtt.enums import CallbackAPIVersion

from frigate.comms.mqtt import MqttClient


class TestMqttNetworkLoop(unittest.TestCase):
    def setUp(self) -> None:
        self.transport = object.__new__(MqttClient)
        self.client = MagicMock()
        self.client.want_write.return_value = False
        self.client.loop_read.return_value = mqtt.MQTT_ERR_SUCCESS
        self.client.loop_write.return_value = mqtt.MQTT_ERR_SUCCESS
        self.client.loop_misc.return_value = mqtt.MQTT_ERR_SUCCESS
        self.transport.client = self.client
        self.sock, self.peer = socket.socketpair()
        self.addCleanup(self.sock.close)
        self.addCleanup(self.peer.close)
        self.transport._wake_recv, self.transport._wake_send = socket.socketpair()
        self.transport._wake_recv.setblocking(False)
        self.transport._wake_send.setblocking(False)
        self.addCleanup(self.transport._wake_recv.close)
        self.addCleanup(self.transport._wake_send.close)
        self.client.socket.return_value = self.sock

    def test_high_fd_handles_connack_suback_publish_and_puback(self) -> None:
        """Process real MQTT packets on a socket beyond select()'s FD limit."""
        if selectors.DefaultSelector is selectors.SelectSelector:
            self.skipTest("This platform has no selector supporting high socket FDs")
        original_limit = resource.getrlimit(resource.RLIMIT_NOFILE)
        soft, hard = original_limit
        if soft <= 1024:
            if hard != resource.RLIM_INFINITY and hard <= 1024:
                self.skipTest("The hard file descriptor limit is too low")
            new_soft = 2048 if hard == resource.RLIM_INFINITY else min(2048, hard)
            resource.setrlimit(resource.RLIMIT_NOFILE, (new_soft, hard))
            self.addCleanup(resource.setrlimit, resource.RLIMIT_NOFILE, original_limit)

        fd = fcntl.fcntl(self.sock.fileno(), fcntl.F_DUPFD, 1024)
        with socket.socket(fileno=fd) as high_sock:
            high_sock.setblocking(False)
            self.peer.settimeout(1)
            client = mqtt.Client(CallbackAPIVersion.VERSION2, client_id="high-fd-test")
            client._sock = high_sock
            self.transport.client = client
            connected, subscribed, received = [], [], []
            client.on_connect = lambda *args: connected.append(args[3])
            client.on_subscribe = lambda *args: subscribed.append(args[2])
            client.on_message = lambda client, userdata, message: received.append(
                message.payload
            )

            self.assertGreaterEqual(high_sock.fileno(), 1024)
            self.peer.sendall(b"\x20\x02\x00\x00")
            self.assertEqual(self.transport._loop_client(0.1), mqtt.MQTT_ERR_SUCCESS)
            self.assertEqual(len(connected), 1)
            self.assertTrue(client.is_connected())

            result, mid = client.subscribe("diagnostic", qos=1)
            self.assertEqual(result, mqtt.MQTT_ERR_SUCCESS)
            self.peer.recv(1024)
            self.peer.sendall(b"\x90\x03" + mid.to_bytes(2, "big") + b"\x01")
            self.assertEqual(self.transport._loop_client(0.1), mqtt.MQTT_ERR_SUCCESS)
            self.assertEqual(subscribed, [mid])

            info = client.publish("diagnostic", b"outgoing", qos=1)
            self.peer.recv(1024)
            self.peer.sendall(b"\x40\x02" + info.mid.to_bytes(2, "big"))
            self.assertEqual(self.transport._loop_client(0.1), mqtt.MQTT_ERR_SUCCESS)
            self.assertTrue(info.is_published())

            payload = b"\x00\x0adiagnosticincoming"
            self.peer.sendall(b"\x30" + bytes([len(payload)]) + payload)
            self.assertEqual(self.transport._loop_client(0.1), mqtt.MQTT_ERR_SUCCESS)
            self.assertEqual(received, [b"incoming"])

    def test_idle_socket_still_runs_keepalive(self) -> None:
        self.assertEqual(self.transport._loop_client(0), mqtt.MQTT_ERR_SUCCESS)
        self.client.loop_read.assert_not_called()
        self.client.loop_write.assert_not_called()
        self.client.loop_misc.assert_called_once()

    def test_writable_socket_flushes_pending_packets(self) -> None:
        self.client.want_write.return_value = True
        self.assertEqual(self.transport._loop_client(0), mqtt.MQTT_ERR_SUCCESS)
        self.client.loop_write.assert_called_once()
        self.client.loop_read.assert_not_called()

    def test_tls_buffer_is_read_without_waiting_for_socket_readiness(self) -> None:
        tls_sock = MagicMock()
        tls_sock.fileno.return_value = self.sock.fileno()
        tls_sock.pending.return_value = 1
        self.client.socket.return_value = tls_sock
        with patch("frigate.comms.mqtt.selectors.DefaultSelector") as selector:
            selector.return_value.__enter__.return_value.select.return_value = []
            self.assertEqual(self.transport._loop_client(1), mqtt.MQTT_ERR_SUCCESS)
            selector.return_value.__enter__.return_value.select.assert_called_once_with(
                0.0
            )
        self.client.loop_read.assert_called_once()

    def test_read_failure_does_not_write_or_run_keepalive(self) -> None:
        self.peer.sendall(b"ready")
        self.client.want_write.return_value = True
        self.client.loop_read.return_value = mqtt.MQTT_ERR_CONN_LOST
        self.assertEqual(self.transport._loop_client(0), mqtt.MQTT_ERR_CONN_LOST)
        self.client.loop_write.assert_not_called()
        self.client.loop_misc.assert_not_called()

    def test_socket_closed_during_read_does_not_write(self) -> None:
        self.peer.sendall(b"ready")
        self.client.want_write.return_value = True
        self.client.socket.side_effect = [self.sock, None]
        self.transport._loop_client(0)
        self.client.loop_write.assert_not_called()
        self.client.loop_misc.assert_not_called()

    def test_write_failure_does_not_run_keepalive(self) -> None:
        self.client.want_write.return_value = True
        self.client.loop_write.return_value = mqtt.MQTT_ERR_CONN_LOST
        self.assertEqual(self.transport._loop_client(0), mqtt.MQTT_ERR_CONN_LOST)
        self.client.loop_misc.assert_not_called()

    def test_missing_socket_reports_no_connection(self) -> None:
        self.client.socket.return_value = None
        self.assertEqual(self.transport._loop_client(0), mqtt.MQTT_ERR_NO_CONN)

    def test_wake_interrupts_wait_and_is_consumed(self) -> None:
        self.transport._wake_worker()

        start = time.monotonic()
        self.assertEqual(self.transport._loop_client(5), mqtt.MQTT_ERR_SUCCESS)
        self.assertLess(time.monotonic() - start, 1)
        self.client.loop_read.assert_not_called()

        start = time.monotonic()
        self.transport._loop_client(0.2)
        self.assertGreater(time.monotonic() - start, 0.15)
