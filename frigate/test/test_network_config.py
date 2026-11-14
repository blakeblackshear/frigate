"""Tests for networking config validation."""

import unittest

from pydantic import ValidationError

from frigate.config.network import ListenConfig


class TestListenConfig(unittest.TestCase):
    def test_defaults_are_distinct(self):
        listen = ListenConfig()

        self.assertEqual(listen.internal_port, 5000)
        self.assertEqual(listen.external_port, 8971)

    def test_address_and_port_string_is_parsed(self):
        listen = ListenConfig(internal="127.0.0.1:5000", external="0.0.0.0:8971")

        self.assertEqual(listen.internal_port, 5000)
        self.assertEqual(listen.external_port, 8971)

    def test_identical_ports_rejected(self):
        with self.assertRaises(ValidationError):
            ListenConfig(internal=8971, external=8971)

    def test_same_port_on_different_addresses_rejected(self):
        # nginx would accept these as distinct listeners, but /auth decides on
        # the port alone, so the external one would inherit anonymous admin
        with self.assertRaises(ValidationError):
            ListenConfig(internal="127.0.0.1:8971", external="0.0.0.0:8971")

    def test_distinct_ports_accepted(self):
        listen = ListenConfig(internal=5001, external="0.0.0.0:8971")

        self.assertEqual(listen.internal_port, 5001)
        self.assertEqual(listen.external_port, 8971)

    def test_valid_listen_values_are_rebuilt(self):
        cases = {
            5000: 5000,
            "5000": 5000,
            "127.0.0.1:5000": "127.0.0.1:5000",
            "0.0.0.0:5000": "0.0.0.0:5000",
            "[::1]:5000": "[::1]:5000",
            "[::]:5000": "[::]:5000",
            "[2001:DB8:0:0::1]:5000": "[2001:db8::1]:5000",
            " 5000 ": 5000,
            "5000\n": 5000,
            " 127.0.0.1:5000 ": "127.0.0.1:5000",
            "localhost:5000": "localhost:5000",
            "frigate-host.lan:5000": "frigate-host.lan:5000",
            "*:5000": "*:5000",
        }

        for value, expected in cases.items():
            with self.subTest(value=value):
                listen = ListenConfig(internal=value)

                self.assertEqual(listen.internal, expected)
                self.assertEqual(listen.internal_port, 5000)

    def test_invalid_listen_values_rejected(self):
        cases = [
            "5000; location /x/ { alias /; autoindex on; } #:5000",
            "127.0.0.1:5000; include /etc/passwd",
            "5000 ssl",
            "5000;",
            "::1:5000",
            "[127.0.0.1]:5000",
            "[fe80::1%eth0]:5000",
            "local host:5000",
            "localhost;:5000",
            "local{host}:5000",
            "host#:5000",
            "'localhost':5000",
            '"localhost":5000',
            "-host:5000",
            "host-:5000",
            "host..lan:5000",
            "**:5000",
            "*.lan:5000",
            "unix:/tmp/sock:5000",
            "5000 5001",
            ":5000",
            "127.0.0.1:",
            "127.0.0.1:+5000",
            0,
            65536,
            -1,
        ]

        for value in cases:
            with self.subTest(value=value):
                with self.assertRaises(ValidationError):
                    ListenConfig(internal=value)

    def test_bool_listen_value_rejected(self):
        # get_nginx_settings.py sees the raw bool and falls back to the default,
        # so accepting it as port 1 would split nginx and the auth port check
        for value in (True, False):
            with self.subTest(value=value):
                with self.assertRaises(ValidationError):
                    ListenConfig(internal=value)


if __name__ == "__main__":
    unittest.main(verbosity=2)
