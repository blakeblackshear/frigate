import unittest
from unittest.mock import MagicMock, patch

from frigate.util.services import get_amd_gpu_stats, get_intel_gpu_stats


class TestGpuStats(unittest.TestCase):
    def setUp(self):
        self.amd_results = "Unknown Radeon card. <= R500 won't work, new cards might.\nDumping to -, line limit 1.\n1664070990.607556: bus 10, gpu 4.17%, ee 0.00%, vgt 0.00%, ta 0.00%, tc 0.00%, sx 0.00%, sh 0.00%, spi 0.83%, smx 0.00%, cr 0.00%, sc 0.00%, pa 0.00%, db 0.00%, cb 0.00%, vram 60.37% 294.04mb, gtt 0.33% 52.21mb, mclk 100.00% 1.800ghz, sclk 26.65% 0.533ghz\n"

    @patch("subprocess.run")
    def test_amd_gpu_stats(self, sp):
        process = MagicMock()
        process.returncode = 0
        process.stdout = self.amd_results
        sp.return_value = process
        amd_stats = get_amd_gpu_stats()
        assert amd_stats == {"gpu": "4.17%", "mem": "60.37%"}

    @patch("frigate.util.services.time.sleep")
    @patch("frigate.util.services.time.monotonic")
    @patch("frigate.util.services._read_intel_drm_fdinfo")
    def test_intel_gpu_stats_fdinfo(self, read_fdinfo, monotonic, sleep):
        # 1 second of wall clock between snapshots
        monotonic.side_effect = [0.0, 1.0]

        # Two i915 clients on the same iGPU. Engine values are cumulative ns.
        # Deltas over the 1s window:
        #   client A (pid 100): render +200_000_000 (20%), video +500_000_000 (50%),
        #                       video-enhance +100_000_000 (10%)
        #   client B (pid 200): compute +100_000_000 (10%)
        # Engine totals → render 20, video 50, video-enhance 10, compute 10
        # → compute = render + compute = 30
        # → dec = video + video-enhance = 60
        # → gpu = compute + dec = 90
        snapshot_a = {
            ("0000:00:02.0", "1", "100"): {
                "driver": "i915",
                "pid": "100",
                "engines": {
                    "render": (1_000_000_000, 0),
                    "video": (5_000_000_000, 0),
                    "video-enhance": (200_000_000, 0),
                    "compute": (0, 0),
                },
            },
            ("0000:00:02.0", "2", "200"): {
                "driver": "i915",
                "pid": "200",
                "engines": {
                    "render": (0, 0),
                    "compute": (2_000_000_000, 0),
                },
            },
        }
        snapshot_b = {
            ("0000:00:02.0", "1", "100"): {
                "driver": "i915",
                "pid": "100",
                "engines": {
                    "render": (1_200_000_000, 0),
                    "video": (5_500_000_000, 0),
                    "video-enhance": (300_000_000, 0),
                    "compute": (0, 0),
                },
            },
            ("0000:00:02.0", "2", "200"): {
                "driver": "i915",
                "pid": "200",
                "engines": {
                    "render": (0, 0),
                    "compute": (2_100_000_000, 0),
                },
            },
        }
        read_fdinfo.side_effect = [snapshot_a, snapshot_b]

        intel_stats = get_intel_gpu_stats(None)

        sleep.assert_called_once()
        assert intel_stats == {
            "gpu": "90.0%",
            "mem": "-%",
            "compute": "30.0%",
            "dec": "60.0%",
            "clients": {"100": "80.0%", "200": "10.0%"},
        }

    @patch("frigate.util.services._read_intel_drm_fdinfo")
    def test_intel_gpu_stats_no_clients(self, read_fdinfo):
        read_fdinfo.return_value = {}
        assert get_intel_gpu_stats(None) is None
