"""Exercise the native code-object guard without exposing GPU devices."""

import tempfile
import unittest
from pathlib import Path

from assemble_runtime import inspect_gfx90c_code


class TestNativeCodeIdentity(unittest.TestCase):
    def test_rejects_host_code_gfx900_and_truncated_elf(self):
        with tempfile.TemporaryDirectory() as temporary:
            path = Path(temporary) / "kernel-gfx90c.hsaco"
            for machine, flags, length, accepted in (
                (224, 0x32, 64, True),
                (224, 0x732, 64, True),
                (224, 0x2C, 64, False),
                (62, 0x32, 64, False),
                (224, 0x32, 20, False),
            ):
                data = bytearray(64)
                data[:6] = b"\x7fELF\x02\x01"
                data[18:20] = machine.to_bytes(2, "little")
                data[48:52] = flags.to_bytes(4, "little")
                path.write_bytes(data[:length])
                with self.subTest(machine=machine, flags=flags, length=length):
                    if accepted:
                        self.assertEqual(inspect_gfx90c_code(path)["flags"], flags)
                    else:
                        with self.assertRaises(AssertionError):
                            inspect_gfx90c_code(path)


if __name__ == "__main__":
    unittest.main()
