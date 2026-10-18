"""Tests for restarting frigate under s6."""

import signal
import unittest
from unittest.mock import MagicMock, patch

import psutil

from frigate.util.services import restart_frigate


class TestRestartFrigate(unittest.TestCase):
    def _s6_process(self) -> MagicMock:
        proc = MagicMock()
        proc.name.return_value = "s6-svscan"
        return proc

    @patch("frigate.util.services.os.kill")
    @patch("frigate.util.services.psutil.Process")
    def test_terminates_s6_when_permitted(self, mock_process, mock_kill):
        proc = self._s6_process()
        mock_process.return_value = proc

        restart_frigate()

        proc.terminate.assert_called_once()
        mock_kill.assert_not_called()

    @patch("frigate.util.services.os.getpid", return_value=99)
    @patch("frigate.util.services.os.kill")
    @patch("frigate.util.services.psutil.Process")
    def test_exits_self_when_s6_signal_is_denied(
        self, mock_process, mock_kill, _mock_getpid
    ):
        """Running unprivileged, frigate cannot signal root's s6-svscan."""
        proc = self._s6_process()
        proc.terminate.side_effect = psutil.AccessDenied(pid=1, name="s6-svscan")
        mock_process.return_value = proc

        restart_frigate()

        mock_kill.assert_called_once_with(99, signal.SIGINT)

    @patch("frigate.util.services.os.getpid", return_value=99)
    @patch("frigate.util.services.os.kill")
    @patch("frigate.util.services.psutil.Process")
    def test_exits_self_without_s6(self, mock_process, mock_kill, _mock_getpid):
        proc = MagicMock()
        proc.name.return_value = "init"
        mock_process.return_value = proc

        restart_frigate()

        proc.terminate.assert_not_called()
        mock_kill.assert_called_once_with(99, signal.SIGINT)
