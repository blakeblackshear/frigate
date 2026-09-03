"""Config driven hardware usage collection for stats."""

import logging
import os
import time
from collections.abc import Callable
from concurrent.futures import Future, ThreadPoolExecutor, wait
from dataclasses import dataclass, field
from functools import cache, partial
from glob import glob
from typing import Any

from frigate.config import FrigateConfig
from frigate.config.camera.updater import (
    CameraConfigUpdateEnum,
    CameraConfigUpdateSubscriber,
)
from frigate.config.classification import SemanticSearchModelEnum
from frigate.const import FFMPEG_HWACCEL_AMF, FFMPEG_HWACCEL_VULKAN
from frigate.detectors.hardware import DEV_ROOT, hardware_prober
from frigate.util.services import (
    get_amd_gpu_stats,
    get_axcl_npu_stats,
    get_axelera_board_temp,
    get_cpu_stats,
    get_hailo_temps,
    get_intel_gpu_stats,
    get_jetson_stats,
    get_nvidia_gpu_stats,
    get_openvino_npu_stats,
    get_rockchip_gpu_stats,
    get_rockchip_npu_stats,
    is_vaapi_amd_driver,
)

logger = logging.getLogger(__name__)

HARDWARE_ERROR_COOLDOWN_SECONDS = 3600
POLL_TIMEOUT_SECONDS = 10

# hardware names polled here, in the order used to resolve a generic GPU demand
GPU_HARDWARE_KEYS = {
    "onnx:nvidia": "nvidia",
    "tensorrt": "jetson",
    "onnx:amd": "amd_gpu",
    "openvino:GPU": "intel_gpu",
    "rknn": "rockchip",
}


@dataclass
class HardwarePollResult:
    """Usage entries from one hardware poll, split by stats bucket."""

    gpu: dict[str, dict[str, Any]] = field(default_factory=dict)
    npu: dict[str, dict[str, Any]] = field(default_factory=dict)
    ok: bool = True


@cache
def _is_amd_vaapi() -> bool:
    """Cached vaapi driver check, the driver cannot change at runtime."""
    return is_vaapi_amd_driver()


def _present_hardware() -> set[str]:
    return {hardware.key for hardware in hardware_prober.probe()}


def _gpu_device_nodes_exist(name: str) -> bool:
    """Whether the GPU's device nodes are visible to this container.

    The prober reads /proc and /sys, which show the host kernel's hardware
    even when a device was not passed into the container, so a GPU is only
    usable when its device nodes exist too.
    """
    if name == "nvidia":
        return bool(glob(f"{DEV_ROOT}/nvidia*"))
    elif name in ("amd_gpu", "intel_gpu"):
        return bool(glob(f"{DEV_ROOT}/dri/*"))

    return True


def _present_gpu() -> str | None:
    """The hardware name of the first usable GPU found on this system, if any."""
    present = _present_hardware()

    for key, name in GPU_HARDWARE_KEYS.items():
        if key in present and _gpu_device_nodes_exist(name):
            return name

    return None


def _poll_nvidia(config: FrigateConfig) -> HardwarePollResult:
    nvidia_usage = get_nvidia_gpu_stats()

    if not nvidia_usage:
        return HardwarePollResult(
            gpu={"nvidia-gpu": {"vendor": "nvidia", "gpu": "", "mem": ""}}, ok=False
        )

    gpu: dict[str, dict[str, Any]] = {}

    for entry in nvidia_usage.values():
        gpu[entry["name"]] = {
            "vendor": "nvidia",
            "gpu": str(round(float(entry["gpu"]), 2)) + "%",
            "mem": str(round(float(entry["mem"]), 2)) + "%",
            "enc": str(round(float(entry["enc"]), 2)) + "%",
            "dec": str(round(float(entry["dec"]), 2)) + "%",
            "temp": str(entry["temp"]),
        }

    return HardwarePollResult(gpu=gpu)


def _poll_jetson(config: FrigateConfig) -> HardwarePollResult:
    jetson_usage = get_jetson_stats()

    if not jetson_usage:
        return HardwarePollResult(
            gpu={"jetson-gpu": {"vendor": "nvidia", "gpu": "", "mem": ""}}, ok=False
        )

    return HardwarePollResult(gpu={"jetson-gpu": {"vendor": "nvidia", **jetson_usage}})


def _poll_intel_gpu(config: FrigateConfig) -> HardwarePollResult:
    intel_usage = get_intel_gpu_stats(config.telemetry.stats.intel_gpu_device)

    if not intel_usage:
        return HardwarePollResult(
            gpu={"intel-gpu": {"vendor": "intel", "gpu": "", "mem": ""}}, ok=False
        )

    gpu: dict[str, dict[str, Any]] = {}

    for entry in intel_usage.values():
        name = entry.pop("name")
        gpu[name] = entry

    return HardwarePollResult(gpu=gpu)


def _poll_amd_gpu(config: FrigateConfig) -> HardwarePollResult:
    amd_usage = get_amd_gpu_stats()

    if not amd_usage:
        return HardwarePollResult(
            gpu={"amd-vaapi": {"vendor": "amd", "gpu": "", "mem": ""}}, ok=False
        )

    return HardwarePollResult(gpu={"amd-vaapi": {"vendor": "amd", **amd_usage}})


def _poll_rockchip(config: FrigateConfig) -> HardwarePollResult:
    result = HardwarePollResult()
    rga_usage = get_rockchip_gpu_stats()

    if rga_usage:
        result.gpu["rockchip"] = {"vendor": "rockchip", **rga_usage}

    npu_usage = get_rockchip_npu_stats()

    if npu_usage:
        result.npu["rockchip"] = npu_usage

    result.ok = bool(rga_usage or npu_usage)
    return result


def _poll_rpi(config: FrigateConfig) -> HardwarePollResult:
    # RPi v4l2m2m is currently not able to get usage stats
    return HardwarePollResult(
        gpu={"rpi-v4l2m2m": {"vendor": "rpi", "gpu": "", "mem": ""}}
    )


def _poll_intel_npu(config: FrigateConfig) -> HardwarePollResult:
    npu_usage = get_openvino_npu_stats()

    if not npu_usage:
        return HardwarePollResult(ok=False)

    return HardwarePollResult(npu={"openvino": npu_usage})


def _poll_axengine(config: FrigateConfig) -> HardwarePollResult:
    npu_usage = get_axcl_npu_stats()

    if not npu_usage:
        return HardwarePollResult(ok=False)

    return HardwarePollResult(npu={"axengine": npu_usage})


def _axelera_board_utilization() -> float | None:
    """Duty-cycle of the AIPU published by the detector process.

    The detector times each blocking ModelInstance.run and writes
    busy/wall for the last window to a small file; a stale file means the
    detector has not run inference recently and no number is reported.
    """
    try:
        from frigate.detectors.plugins.axelera import AXELERA_USAGE_PATH

        with open(AXELERA_USAGE_PATH) as f:
            pct, stamp = f.read().split()
        if time.time() - float(stamp) > 10:
            return None
        return max(0.0, float(pct))
    except (OSError, ValueError, ImportError):
        return None


def _poll_axelera(config: FrigateConfig) -> HardwarePollResult:
    # the runtime exposes no device-side usage counter; the board
    # controller temperature and the detector process's run-time duty cycle
    # are the two honest readouts
    board_temp = get_axelera_board_temp()

    if board_temp is None:
        return HardwarePollResult(ok=False)

    entry: dict[str, Any] = {"mem": "-%", "temp": board_temp}
    util = _axelera_board_utilization()

    if util is not None:
        entry["npu"] = util

    return HardwarePollResult(npu={"axelera": entry})


POLLERS: dict[str, Callable[[FrigateConfig], HardwarePollResult]] = {
    "nvidia": _poll_nvidia,
    "jetson": _poll_jetson,
    "intel_gpu": _poll_intel_gpu,
    "amd_gpu": _poll_amd_gpu,
    "rockchip": _poll_rockchip,
    "rpi": _poll_rpi,
    "intel_npu": _poll_intel_npu,
    "axengine": _poll_axengine,
    "axelera": _poll_axelera,
}


def _hwaccel_hardware(args: str) -> str | None:
    """Map an ffmpeg hwaccel arg string (preset or raw args) to a hardware name."""
    if "cuvid" in args or "nvidia" in args:
        return "nvidia"
    elif "nvmpi" in args or "jetson" in args:
        return "jetson"
    elif "qsv" in args:
        return "intel_gpu"
    elif FFMPEG_HWACCEL_AMF in args or "amf" in args:
        return "amd_gpu"
    elif "vaapi" in args:
        return "amd_gpu" if _is_amd_vaapi() else "intel_gpu"
    elif "preset-rk" in args or "rkmpp" in args:
        return "rockchip"
    elif "v4l2m2m" in args or "rpi" in args:
        return "rpi"
    elif FFMPEG_HWACCEL_VULKAN in args or "vulkan" in args:
        # vulkan is vendor neutral, attribute it to whichever GPU is present
        return _present_gpu()

    return None


class HardwareStats:
    """Catalogs and polls all hardware relevant to the config."""

    def __init__(self, config: FrigateConfig) -> None:
        self.config = config
        # hardware name -> bound poll function; the catalog of what to monitor
        self._monitored: dict[str, Callable[[], HardwarePollResult]] = {}
        self._errors: dict[str, float] = {}
        self._executor = ThreadPoolExecutor(
            max_workers=8, thread_name_prefix="hw_stats"
        )
        self._config_subscriber = CameraConfigUpdateSubscriber(
            config,
            config.cameras,
            [
                CameraConfigUpdateEnum.add,
                CameraConfigUpdateEnum.remove,
                CameraConfigUpdateEnum.ffmpeg,
                CameraConfigUpdateEnum.audio_transcription,
                CameraConfigUpdateEnum.semantic_search,
                CameraConfigUpdateEnum.face_recognition,
                CameraConfigUpdateEnum.lpr,
            ],
        )
        self.update_config()

    def update_config(self) -> None:
        """Recalculate all hardware that needs to be monitored from the config."""
        names = self._scan_ffmpeg() | self._scan_detectors() | self._scan_enrichments()
        monitored: dict[str, Callable[[], HardwarePollResult]] = {}

        for name in sorted(names):
            if name == "intel_gpu" and not self.config.telemetry.stats.intel_gpu_stats:
                continue

            if name == "amd_gpu" and not self.config.telemetry.stats.amd_gpu_stats:
                continue

            monitored[name] = partial(POLLERS[name], self.config)

        self._monitored = monitored
        logger.debug("Monitoring hardware for stats: %s", list(monitored))

    def update_stats(self, all_stats: dict[str, Any]) -> None:
        """Poll the monitored hardware concurrently and fill usage stats."""
        if self._config_subscriber.check_for_updates():
            self.update_config()

        now = time.monotonic()
        hardware_futures: dict[Future[HardwarePollResult], str] = {}

        for name, poll in self._monitored.items():
            last_error = self._errors.get(name)

            if last_error is not None:
                if now - last_error < HARDWARE_ERROR_COOLDOWN_SECONDS:
                    continue

                self._errors.pop(name, None)

            hardware_futures[self._executor.submit(poll)] = name

        cpu_future = self._executor.submit(get_cpu_stats)
        futures: list[Future[Any]] = [*hardware_futures, cpu_future]
        done, _ = wait(futures, timeout=POLL_TIMEOUT_SECONDS)

        gpu_usages: dict[str, dict[str, Any]] = {}
        npu_usages: dict[str, dict[str, Any]] = {}

        for future, name in hardware_futures.items():
            if future not in done:
                logger.warning("Timed out collecting %s stats", name)
                self._errors[name] = time.monotonic()
                continue

            try:
                result = future.result()
            except Exception:
                logger.exception("Failed to collect %s stats", name)
                self._errors[name] = time.monotonic()
                continue

            gpu_usages.update(result.gpu)
            npu_usages.update(result.npu)

            if not result.ok:
                self._errors[name] = time.monotonic()

        if gpu_usages:
            all_stats["gpu_usages"] = gpu_usages

        if npu_usages:
            all_stats["npu_usages"] = npu_usages

        if cpu_future in done:
            try:
                cpu_stats = cpu_future.result()
            except Exception:
                logger.exception("Failed to collect cpu stats")
            else:
                if cpu_stats:
                    all_stats["cpu_usages"] = cpu_stats

    def stop(self) -> None:
        self._config_subscriber.stop()
        self._executor.shutdown(wait=False, cancel_futures=True)

    def _scan_ffmpeg(self) -> set[str]:
        """Hardware used by camera hwaccel args (presets or raw ffmpeg args)."""
        hwaccel_args: list[str] = []

        for camera in self.config.cameras.values():
            args = camera.ffmpeg.hwaccel_args

            if isinstance(args, list):
                args = " ".join(args)

            if args and args not in hwaccel_args:
                hwaccel_args.append(args)

            for stream_input in camera.ffmpeg.inputs:
                args = stream_input.hwaccel_args

                if isinstance(args, list):
                    args = " ".join(args)

                if args and args not in hwaccel_args:
                    hwaccel_args.append(args)

        names: set[str] = set()

        for args in hwaccel_args:
            name = _hwaccel_hardware(args)

            if name is not None:
                names.add(name)

        return names

    def _scan_detectors(self) -> set[str]:
        """Hardware used by the configured detection models."""
        names: set[str] = set()

        for model in self.config.models:
            for spec in self.config.devices_for_model(model):
                if spec.detector == "rknn":
                    names.add("rockchip")
                elif spec.detector == "axengine":
                    names.add("axengine")
                elif spec.detector == "axelera":
                    names.add("axelera")
                elif spec.detector == "tensorrt":
                    names.add("jetson")
                elif spec.detector == "openvino":
                    if spec.device == "NPU":
                        names.add("intel_npu")
                    elif spec.device is None or spec.device.startswith("GPU"):
                        names.add("intel_gpu")
                elif spec.detector == "onnx":
                    gpu = _present_gpu()

                    if gpu is not None:
                        names.add(gpu)

        return names

    def _scan_enrichments(self) -> set[str]:
        """Hardware used by enabled enrichments, resolved to the present GPU."""
        config = self.config
        names: set[str] = set()
        gpu = _present_gpu()

        if gpu is not None:
            semantic = config.semantic_search

            if (
                semantic.enabled
                # GenAI providers run remotely and use no local hardware
                and (
                    semantic.model is None
                    or isinstance(semantic.model, SemanticSearchModelEnum)
                )
                and (
                    semantic.device
                    or ("GPU" if semantic.model_size == "large" else "CPU")
                )
                != "CPU"
            ):
                names.add(gpu)

            if (
                config.face_recognition.enabled
                and (config.face_recognition.device or "GPU") != "CPU"
            ):
                names.add(gpu)

            if config.lpr.enabled and (config.lpr.device or "AUTO") != "CPU":
                names.add(gpu)

        # audio transcription runs on CUDA only
        transcription_configs = [config.audio_transcription] + [
            camera.audio_transcription for camera in config.cameras.values()
        ]

        if (
            any(c.enabled and c.device == "GPU" for c in transcription_configs)
            and "onnx:nvidia" in _present_hardware()
            and _gpu_device_nodes_exist("nvidia")
        ):
            names.add("nvidia")

        return names


def read_temperature(path: str) -> float | None:
    """Read a sysfs temperature file, converting millidegrees to degrees.

    Returns None when the file does not exist.
    """
    if os.path.isfile(path):
        with open(path) as f:
            line = f.readline().strip()
            return int(line) / 1000
    return None


def get_hardware_temperatures(detector_type: str) -> list[float | None]:
    """Per unit temperatures for a detector type, in stable device order."""
    if detector_type == "edgetpu":
        # PCIe Corals expose a temperature through the apex driver
        base = "/sys/class/apex/"

        if os.path.isdir(base):
            return [
                read_temperature(os.path.join(base, apex, "temp"))
                for apex in sorted(os.listdir(base))
            ]
    elif detector_type == "hailo8l":
        hailo_temps = get_hailo_temps()
        return [hailo_temps[name] for name in sorted(hailo_temps.keys())]

    return []
