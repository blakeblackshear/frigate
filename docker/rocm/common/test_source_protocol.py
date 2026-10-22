"""Check the pinned HIPRTC helper protocol with no vendor runtime imports."""

import unittest

from source_checks import unpack_compile_reply


class TestCompileReply(unittest.TestCase):
    def test_binary_lengths_and_unmodified_payload(self):
        payload = bytes(range(256))
        for tag, width in ((0xC4, 1), (0xC5, 2), (0xC6, 4)):
            value = payload[:200] if width == 1 else payload
            wire = (
                b"\x81\xabcode_object\x91"
                + bytes([tag])
                + len(value).to_bytes(width, "big")
                + value
            )
            with self.subTest(tag=tag):
                self.assertEqual(unpack_compile_reply(wire), value)

    def test_rejects_missing_truncated_or_extra_data(self):
        for wire in (
            b"",
            b"\x81\xabcode_object\x91",
            b"\x81\xabcode_object\x91\xc5\x00",
            b"\x81\xabcode_object\x91\xc4\x02x",
            b"\x81\xabcode_object\x91\xc4\x01xy",
        ):
            with self.subTest(wire=wire):
                with self.assertRaises(ValueError):
                    unpack_compile_reply(wire)


if __name__ == "__main__":
    unittest.main()
