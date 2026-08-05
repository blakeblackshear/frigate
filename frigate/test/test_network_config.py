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


if __name__ == "__main__":
    unittest.main(verbosity=2)
