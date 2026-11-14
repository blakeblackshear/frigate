"""Tests for bandwidth stats privilege handling."""

import unittest
from unittest.mock import MagicMock, patch

from frigate.util import services


class TestBandwidthStatsPrivileges(unittest.TestCase):
    def setUp(self):
        services._bandwidth_warning_logged = False

    @patch("frigate.util.services.sp.run")
    @patch("frigate.util.services.os.geteuid", return_value=1000)
    def test_returns_empty_and_warns_once_without_root(self, _, sp_run):
        config = MagicMock()
        with self.assertLogs("frigate.util.services", level="WARNING") as logs:
            assert services.get_bandwidth_stats(config) == {}
            assert services.get_bandwidth_stats(config) == {}
        sp_run.assert_not_called()
        warnings = [m for m in logs.output if "require root" in m]
        assert len(warnings) == 1


if __name__ == "__main__":
    unittest.main()
