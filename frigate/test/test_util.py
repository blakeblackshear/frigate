from unittest import TestCase
from frigate.util import get_mb_from_abbrev


class TestUtils(TestCase):
    def setUp(self):
        self.gb127 = "127G"
        self.mb228 = "228M"

    def test_mb_abbrev(self):
        assert get_mb_from_abbrev(self.gb127) == 127000
        assert get_mb_from_abbrev(self.mb228) == 228
