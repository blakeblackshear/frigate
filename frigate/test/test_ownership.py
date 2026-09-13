"""Tests for runtime ownership helpers."""

import unittest
from unittest.mock import patch

from frigate.util import ownership


class FakePwEntry:
    pw_uid = 1500
    pw_gid = 1500


# The devcontainer image exports FRIGATE_RUN_AS_ROOT, so any test that has to
# reach past the escape-hatch check pins the variable instead of inheriting it.
class TestGetRuntimeIds(unittest.TestCase):
    def setUp(self) -> None:
        ownership.get_runtime_ids.cache_clear()
        # a value cached under this test's patches must not leak into later modules
        self.addCleanup(ownership.get_runtime_ids.cache_clear)

    @patch("frigate.util.ownership.os.geteuid", return_value=1000)
    def test_returns_none_when_not_root(self, _):
        assert ownership.get_runtime_ids() is None

    @patch.dict("os.environ", {"FRIGATE_RUN_AS_ROOT": "true"})
    @patch("frigate.util.ownership.os.geteuid", return_value=0)
    def test_returns_none_with_escape_hatch(self, _):
        assert ownership.get_runtime_ids() is None

    @patch.dict("os.environ", {"FRIGATE_RUN_AS_ROOT": "false"})
    @patch("frigate.util.ownership.pwd.getpwnam", side_effect=KeyError)
    @patch("frigate.util.ownership.os.geteuid", return_value=0)
    def test_returns_none_outside_frigate_image(self, *_):
        assert ownership.get_runtime_ids() is None

    @patch.dict("os.environ", {"FRIGATE_RUN_AS_ROOT": "false"})
    @patch("frigate.util.ownership.pwd.getpwnam", return_value=FakePwEntry())
    @patch("frigate.util.ownership.os.geteuid", return_value=0)
    def test_returns_frigate_ids_as_root(self, *_):
        assert ownership.get_runtime_ids() == (1500, 1500)

    @patch.dict("os.environ", {"FRIGATE_RUN_AS_ROOT": "false"})
    @patch("frigate.util.ownership.pwd.getpwnam", return_value=FakePwEntry())
    @patch("frigate.util.ownership.os.geteuid", return_value=0)
    def test_caches_lookup(self, _geteuid, getpwnam):
        assert ownership.get_runtime_ids() == (1500, 1500)
        assert ownership.get_runtime_ids() == (1500, 1500)
        getpwnam.assert_called_once()


class TestChownToRuntime(unittest.TestCase):
    def setUp(self) -> None:
        ownership.get_runtime_ids.cache_clear()
        # a value cached under this test's patches must not leak into later modules
        self.addCleanup(ownership.get_runtime_ids.cache_clear)

    @patch("frigate.util.ownership.os.chown")
    @patch("frigate.util.ownership.get_runtime_ids", return_value=None)
    def test_noop_when_no_runtime_ids(self, _, chown):
        ownership.chown_to_runtime("/config/test")
        chown.assert_not_called()

    @patch("frigate.util.ownership.os.chown")
    @patch("frigate.util.ownership.get_runtime_ids", return_value=(1500, 1500))
    def test_chowns_to_runtime_ids(self, _, chown):
        ownership.chown_to_runtime("/config/test")
        chown.assert_called_once_with("/config/test", 1500, 1500)

    @patch("frigate.util.ownership.os.chown", side_effect=OSError("ro fs"))
    @patch("frigate.util.ownership.get_runtime_ids", return_value=(1500, 1500))
    def test_swallows_oserror(self, *_):
        ownership.chown_to_runtime("/config/test")  # must not raise


if __name__ == "__main__":
    unittest.main()
