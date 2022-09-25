import unittest
from unittest.mock import MagicMock, patch

from frigate.util import get_amd_gpu_stats, get_nvidia_gpu_stats


class TestGpuStats(unittest.TestCase):
    def setUp(self):
        self.nvidia_results = "name, utilization.gpu [%], memory.used [MiB], memory.total [MiB]\nNVIDIA GeForce RTX 3050, 42 %, 5036 MiB, 8192 MiB\n"
        self.amd_results = "Unknown Radeon card. <= R500 won't work, new cards might.\nDumping to -, line limit 1.\n1664070990.607556: bus 10, gpu 4.17%, ee 0.00%, vgt 0.00%, ta 0.00%, tc 0.00%, sx 0.00%, sh 0.00%, spi 0.83%, smx 0.00%, cr 0.00%, sc 0.00%, pa 0.00%, db 0.00%, cb 0.00%, vram 60.37% 294.04mb, gtt 0.33% 52.21mb, mclk 100.00% 1.800ghz, sclk 26.65% 0.533ghz\n"

    @patch("subprocess.run")
    def test_amd_gpu_stats(self, sp):
        process = MagicMock()
        process.returncode = 0
        process.stdout = self.amd_results
        sp.return_value = process
        amd_stats = get_amd_gpu_stats()
        assert amd_stats == {"gpu_usage": "4.17 %", "memory_usage": "60.37 %"}

    @patch("subprocess.run")
    def test_amd_gpu_stats(self, sp):
        process = MagicMock()
        process.returncode = 0
        process.stdout = self.nvidia_results
        sp.return_value = process
        nvidia_stats = get_nvidia_gpu_stats()
        assert nvidia_stats == {
            "name": "NVIDIA GeForce RTX 3050",
            "gpu_usage": "42 %",
            "memory_usage": "61.5 %",
        }
