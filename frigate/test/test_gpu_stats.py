import unittest
from unittest.mock import MagicMock, patch

from frigate.util import get_amd_gpu_stats, get_intel_gpu_stats, get_nvidia_gpu_stats


class TestGpuStats(unittest.TestCase):
    def setUp(self):
        self.amd_results = "Unknown Radeon card. <= R500 won't work, new cards might.\nDumping to -, line limit 1.\n1664070990.607556: bus 10, gpu 4.17%, ee 0.00%, vgt 0.00%, ta 0.00%, tc 0.00%, sx 0.00%, sh 0.00%, spi 0.83%, smx 0.00%, cr 0.00%, sc 0.00%, pa 0.00%, db 0.00%, cb 0.00%, vram 60.37% 294.04mb, gtt 0.33% 52.21mb, mclk 100.00% 1.800ghz, sclk 26.65% 0.533ghz\n"
        self.intel_results = """{"period":{"duration":1.194033,"unit":"ms"},"frequency":{"requested":0.000000,"actual":0.000000,"unit":"MHz"},"interrupts":{"count":3349.991164,"unit":"irq/s"},"rc6":{"value":47.844741,"unit":"%"},"engines":{"Render/3D/0":{"busy":0.000000,"sema":0.000000,"wait":0.000000,"unit":"%"},"Blitter/0":{"busy":0.000000,"sema":0.000000,"wait":0.000000,"unit":"%"},"Video/0":{"busy":4.533124,"sema":0.000000,"wait":0.000000,"unit":"%"},"Video/1":{"busy":6.194385,"sema":0.000000,"wait":0.000000,"unit":"%"},"VideoEnhance/0":{"busy":0.000000,"sema":0.000000,"wait":0.000000,"unit":"%"}}},{"period":{"duration":1.189291,"unit":"ms"},"frequency":{"requested":0.000000,"actual":0.000000,"unit":"MHz"},"interrupts":{"count":0.000000,"unit":"irq/s"},"rc6":{"value":100.000000,"unit":"%"},"engines":{"Render/3D/0":{"busy":0.000000,"sema":0.000000,"wait":0.000000,"unit":"%"},"Blitter/0":{"busy":0.000000,"sema":0.000000,"wait":0.000000,"unit":"%"},"Video/0":{"busy":0.000000,"sema":0.000000,"wait":0.000000,"unit":"%"},"Video/1":{"busy":0.000000,"sema":0.000000,"wait":0.000000,"unit":"%"},"VideoEnhance/0":{"busy":0.000000,"sema":0.000000,"wait":0.000000,"unit":"%"}}}"""
        self.nvidia_results = "name, utilization.gpu [%], memory.used [MiB], memory.total [MiB]\nNVIDIA GeForce RTX 3050, 42 %, 5036 MiB, 8192 MiB\n"

    @patch("subprocess.run")
    def test_amd_gpu_stats(self, sp):
        process = MagicMock()
        process.returncode = 0
        process.stdout = self.amd_results
        sp.return_value = process
        amd_stats = get_amd_gpu_stats()
        assert amd_stats == {"gpu": "4.17 %", "mem": "60.37 %"}

    @patch("subprocess.run")
    def test_nvidia_gpu_stats(self, sp):
        process = MagicMock()
        process.returncode = 0
        process.stdout = self.nvidia_results
        sp.return_value = process
        nvidia_stats = get_nvidia_gpu_stats()
        assert nvidia_stats == {
            "name": "NVIDIA GeForce RTX 3050",
            "gpu": "42 %",
            "mem": "61.5 %",
        }

    @patch("subprocess.run")
    def test_intel_gpu_stats(self, sp):
        process = MagicMock()
        process.returncode = 124
        process.stdout = self.intel_results
        sp.return_value = process
        intel_stats = get_intel_gpu_stats()
        assert intel_stats == {
            "gpu": "1.34 %",
            "mem": "- %",
        }
