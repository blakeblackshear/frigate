"""Check that native retargeting never changes the kernel tuning payload."""

import unittest

from retarget_logic import retarget


class TestNativeLogic(unittest.TestCase):
    def test_only_the_architecture_header_changes(self):
        original = b"- {MinimumRequiredVersion: 4.0.0}\n- vega10\n- gfx900\n- [Vega 10]\n- ISA: [9, 0, 0]\n"
        expected = original.replace(b"- gfx900\n", b"- gfx90c\n")
        self.assertEqual(retarget(original), expected)

    def test_retargeting_is_idempotent(self):
        content = b"- version\n- vega10\n- gfx90c\n- tuning data\n"
        self.assertEqual(retarget(retarget(content)), content)

    def test_unexpected_sources_are_rejected(self):
        for content in (
            b"",
            b"- version\n- vega20\n- gfx906\n- data\n",
            b"- version\n- vega10\n- gfx90a\n- data\n",
        ):
            with self.subTest(content=content):
                with self.assertRaises(ValueError):
                    retarget(content)


if __name__ == "__main__":
    unittest.main()
