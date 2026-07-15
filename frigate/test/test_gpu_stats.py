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

    @patch("frigate.stats.intel_gpu_info.intel_gpu_name_resolver.get_names")
    @patch("frigate.util.services.time.sleep")
    @patch("frigate.util.services.time.monotonic")
    @patch("frigate.util.services._read_intel_drm_fdinfo")
    @patch("frigate.util.services._enumerate_drm_devices")
    def test_intel_gpu_stats_fdinfo(
        self, drm_devices, read_fdinfo, monotonic, sleep, get_names
    ):
        # 1 second of wall clock between snapshots
        drm_devices.return_value = {"0000:00:02.0": "i915"}
        monotonic.side_effect = [0.0, 1.0]
        get_names.return_value = {"0000:00:02.0": "Intel Graphics"}

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
                    "render": (1_000_000_000, 0, 1),
                    "video": (5_000_000_000, 0, 1),
                    "video-enhance": (200_000_000, 0, 1),
                    "compute": (0, 0, 1),
                },
            },
            ("0000:00:02.0", "2", "200"): {
                "driver": "i915",
                "pid": "200",
                "engines": {
                    "render": (0, 0, 1),
                    "compute": (2_000_000_000, 0, 1),
                },
            },
        }
        snapshot_b = {
            ("0000:00:02.0", "1", "100"): {
                "driver": "i915",
                "pid": "100",
                "engines": {
                    "render": (1_200_000_000, 0, 1),
                    "video": (5_500_000_000, 0, 1),
                    "video-enhance": (300_000_000, 0, 1),
                    "compute": (0, 0, 1),
                },
            },
            ("0000:00:02.0", "2", "200"): {
                "driver": "i915",
                "pid": "200",
                "engines": {
                    "render": (0, 0, 1),
                    "compute": (2_100_000_000, 0, 1),
                },
            },
        }
        read_fdinfo.side_effect = [snapshot_a, snapshot_b]

        intel_stats = get_intel_gpu_stats(None)

        sleep.assert_called_once()
        assert intel_stats == {
            "0000:00:02.0": {
                "name": "Intel Graphics",
                "vendor": "intel",
                "gpu": "90.0%",
                "mem": "-%",
                "compute": "30.0%",
                "dec": "60.0%",
                "clients": {"100": "80.0%", "200": "10.0%"},
            },
        }

    @patch("frigate.stats.intel_gpu_info.intel_gpu_name_resolver.get_names")
    @patch("frigate.util.services.time.sleep")
    @patch("frigate.util.services.time.monotonic")
    @patch("frigate.util.services._read_intel_drm_fdinfo")
    @patch("frigate.util.services._enumerate_drm_devices")
    def test_intel_gpu_stats_xe_capacity(
        self, drm_devices, read_fdinfo, monotonic, sleep, get_names
    ):
        # Xe engines report cumulative cycles paired with total cycles, plus a
        # per-class capacity. drm-cycles-* is summed across every instance of a
        # class, so on Battlemage (capacity 2 for vcs/vecs) busy/total must be
        # divided by capacity to land in 0-100%.
        drm_devices.return_value = {"0000:03:00.0": "xe"}
        monotonic.side_effect = [0.0, 1.0]
        get_names.return_value = {"0000:03:00.0": "Intel Arc"}

        # Deltas over the window (busy, total): render 200/1000 cap 1 = 20%,
        # video 800/1000 cap 2 = 40%, video-enhance 400/1000 cap 2 = 20%,
        # compute 100/1000 cap 1 = 10%. Without the capacity divisor video/
        # video-enhance would read 80%/40% and dec would clamp at 100%.
        snapshot_a = {
            ("0000:03:00.0", "1", "300"): {
                "driver": "xe",
                "pid": "300",
                "engines": {
                    "render": (0, 0, 1),
                    "video": (0, 0, 2),
                    "video-enhance": (0, 0, 2),
                    "compute": (0, 0, 1),
                },
            },
        }
        snapshot_b = {
            ("0000:03:00.0", "1", "300"): {
                "driver": "xe",
                "pid": "300",
                "engines": {
                    "render": (200, 1000, 1),
                    "video": (800, 1000, 2),
                    "video-enhance": (400, 1000, 2),
                    "compute": (100, 1000, 1),
                },
            },
        }
        read_fdinfo.side_effect = [snapshot_a, snapshot_b]

        intel_stats = get_intel_gpu_stats(None)

        assert intel_stats == {
            "0000:03:00.0": {
                "name": "Intel Arc",
                "vendor": "intel",
                "gpu": "90.0%",
                "mem": "-%",
                "compute": "30.0%",
                "dec": "60.0%",
                "clients": {"300": "90.0%"},
            },
        }

    @patch("frigate.stats.intel_gpu_info.intel_gpu_name_resolver.get_names")
    @patch("frigate.util.services.time.sleep")
    @patch("frigate.util.services._read_intel_drm_fdinfo")
    @patch("frigate.util.services._enumerate_drm_devices")
    def test_intel_gpu_stats_no_clients_reports_idle(
        self, drm_devices, read_fdinfo, sleep, get_names
    ):
        # The device exists but nothing holds it open, e.g. while camera
        # processes are restarting. This is an idle state, not an error:
        # returning None here would latch the hwaccel error cooldown and
        # blank GPU stats for an hour over a momentary gap.
        drm_devices.return_value = {"0000:00:02.0": "i915"}
        read_fdinfo.return_value = {}
        get_names.return_value = {"0000:00:02.0": "Intel Graphics"}

        assert get_intel_gpu_stats(None) == {
            "0000:00:02.0": {
                "name": "Intel Graphics",
                "vendor": "intel",
                "gpu": "0.0%",
                "mem": "-%",
                "compute": "0.0%",
                "dec": "0.0%",
            },
        }
        # Idle short-circuits before spending the sample window
        sleep.assert_not_called()
        read_fdinfo.assert_called_once()

    @patch("frigate.util.services.time.sleep")
    @patch("frigate.util.services._read_intel_drm_fdinfo")
    @patch("frigate.util.services._enumerate_drm_devices")
    def test_intel_gpu_stats_clients_without_engine_counters(
        self, drm_devices, read_fdinfo, sleep
    ):
        # i915 publishes drm-driver/drm-pdev/drm-client-id but no drm-engine-*
        # lines while GuC submission is active on kernels older than 6.5, so
        # clients are found with nothing to sample. Reporting idle here would
        # be a lie, and sampling a second time cannot help.
        drm_devices.return_value = {"0000:00:02.0": "i915"}
        read_fdinfo.return_value = {
            ("0000:00:02.0", "48", "1109"): {
                "driver": "i915",
                "pid": "1109",
                "engines": {},
            },
            ("0000:00:02.0", "51", "1258"): {
                "driver": "i915",
                "pid": "1258",
                "engines": {},
            },
        }

        assert get_intel_gpu_stats(None) is None
        sleep.assert_not_called()
        read_fdinfo.assert_called_once()

    @patch("frigate.util.services._read_intel_drm_fdinfo")
    @patch("frigate.util.services._enumerate_drm_devices")
    def test_intel_gpu_stats_no_intel_device(self, drm_devices, read_fdinfo):
        # Only a non-Intel GPU is visible in sysfs; /proc is never scanned
        drm_devices.return_value = {"0000:01:00.0": "nvidia"}

        assert get_intel_gpu_stats(None) is None
        read_fdinfo.assert_not_called()

    @patch("frigate.util.services._read_intel_drm_fdinfo")
    @patch("frigate.util.services._enumerate_drm_devices")
    @patch("frigate.util.services._resolve_intel_gpu_pdev")
    def test_intel_gpu_stats_unresolvable_device_hint(
        self, resolve_pdev, drm_devices, read_fdinfo
    ):
        # A configured intel_gpu_device that cannot be resolved is a config
        # error, not a reason to silently fall back to reporting all GPUs
        resolve_pdev.return_value = None

        assert get_intel_gpu_stats("/dev/dri/renderD999") is None
        drm_devices.assert_not_called()
        read_fdinfo.assert_not_called()

    @patch("frigate.util.services._read_intel_drm_fdinfo")
    @patch("frigate.util.services._enumerate_drm_devices")
    @patch("frigate.util.services._resolve_intel_gpu_pdev")
    def test_intel_gpu_stats_hint_resolves_to_non_intel_gpu(
        self, resolve_pdev, drm_devices, read_fdinfo
    ):
        # card numbering can reorder across reboots on multi-GPU hosts, so a
        # configured hint may point at another vendor's card; call it out
        # instead of reporting nothing
        resolve_pdev.return_value = "0000:01:00.0"
        drm_devices.return_value = {
            "0000:00:02.0": "i915",
            "0000:01:00.0": "nvidia",
        }

        assert get_intel_gpu_stats("/dev/dri/card0") is None
        read_fdinfo.assert_not_called()

    @patch("frigate.util.services._read_intel_drm_fdinfo")
    @patch("frigate.util.services._enumerate_drm_devices")
    def test_intel_gpu_stats_unreadable_proc(self, drm_devices, read_fdinfo):
        # A scan failure (None) is a different condition than a scan that
        # finds no clients ({}) and must not report idle
        drm_devices.return_value = {"0000:00:02.0": "i915"}
        read_fdinfo.return_value = None

        assert get_intel_gpu_stats(None) is None

    @patch("frigate.stats.intel_gpu_info.intel_gpu_name_resolver.get_names")
    @patch("frigate.util.services.time.sleep")
    @patch("frigate.util.services.time.monotonic")
    @patch("frigate.util.services._read_intel_drm_fdinfo")
    @patch("frigate.util.services._enumerate_drm_devices")
    def test_intel_gpu_stats_clients_lost_between_samples(
        self, drm_devices, read_fdinfo, monotonic, sleep, get_names
    ):
        # Clients disappearing during the sample window is transient process
        # churn, so report idle rather than latching an error
        drm_devices.return_value = {"0000:00:02.0": "i915"}
        monotonic.side_effect = [0.0, 1.0]
        get_names.return_value = {"0000:00:02.0": "Intel Graphics"}
        read_fdinfo.side_effect = [
            {
                ("0000:00:02.0", "1", "100"): {
                    "driver": "i915",
                    "pid": "100",
                    "engines": {"video": (5_000_000_000, 0, 1)},
                },
            },
            {},
        ]

        assert get_intel_gpu_stats(None) == {
            "0000:00:02.0": {
                "name": "Intel Graphics",
                "vendor": "intel",
                "gpu": "0.0%",
                "mem": "-%",
                "compute": "0.0%",
                "dec": "0.0%",
            },
        }
