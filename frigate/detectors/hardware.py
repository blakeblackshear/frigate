"""Discovery of object detection hardware attached to the system.

Every probe here is a filesystem read. Nothing shells out, initializes a
runtime, or opens a device, so this is cheap enough to run from the API process
while detector children hold the hardware.

Hardware is reported whether or not this image ships a detector that can drive
it. Matching hardware to an image is a separate concern.
"""

import logging
import os
from glob import glob

from pydantic import BaseModel, Field

from frigate.const import SUPPORTED_RK_SOCS
from frigate.detectors.detector_types import config_types
from frigate.util.services import enumerate_drm_devices

logger = logging.getLogger(__name__)

# roots the probes read from, so tests can point them at a fixture tree
SYS_ROOT = "/sys"
DEV_ROOT = "/dev"
PROC_ROOT = "/proc"
ETC_ROOT = "/etc"

# a Coral reports as Global Unichip until its firmware is loaded, then as Google
CORAL_USB_IDS = {("1a6e", "089a"), ("18d1", "9302")}

INTEL_DRM_DRIVERS = ("i915", "xe")
AMD_DRM_DRIVERS = ("amdgpu",)


class HardwareUnit(BaseModel):
    """One physical piece of hardware."""

    device: str = Field(
        title="Device string",
        description="The value to put in a model's devices list, for example 'edgetpu:pci:1'.",
    )
    label: str = Field(
        title="Unit label",
        description="How to identify this unit among others of the same kind, for example 'PCIe 1'.",
    )


class DetectionHardware(BaseModel):
    """A kind of detection hardware, and every unit of it that was found."""

    key: str = Field(
        title="Hardware key",
        description="Stable identifier for this kind of hardware.",
    )
    detector: str = Field(
        title="Detector type",
        description="The detector that drives this hardware.",
    )
    name: str = Field(
        title="Hardware name",
        description="Human readable name for this kind of hardware.",
    )
    units: list[HardwareUnit] = Field(
        title="Units",
        description="Each physical piece of this hardware that was found.",
    )
    count: int = Field(
        title="Unit count",
        description="How many units were found.",
    )
    unlimited: bool = Field(
        title="Unlimited detectors",
        description="Whether this hardware can run more inference processes than there are units.",
    )


def _read(path: str) -> str | None:
    """Read a small file, returning None if it cannot be read."""
    try:
        with open(path) as f:
            return f.read().strip()
    except OSError:
        return None


def _is_shareable(detector: str) -> bool:
    """Whether a detector lets the same device run more than one process."""
    config_class = config_types.get(detector)

    # a detector missing from this image is assumed to behave like most of them
    return config_class.shareable if config_class else True


def _hardware(
    key: str, detector: str, name: str, units: list[HardwareUnit]
) -> DetectionHardware:
    return DetectionHardware(
        key=key,
        detector=detector,
        name=name,
        units=units,
        count=len(units),
        unlimited=_is_shareable(detector),
    )


def detect_coral_pci() -> DetectionHardware | None:
    """Find PCIe and M.2 Coral accelerators, which register as apex devices."""
    names = sorted(
        os.path.basename(path) for path in glob(f"{SYS_ROOT}/class/apex/apex_*")
    )

    if not names:
        return None

    units = [
        HardwareUnit(device=f"edgetpu:pci:{index}", label=f"PCIe {index}")
        for index in range(len(names))
    ]
    return _hardware("edgetpu:pci", "edgetpu", "Coral EdgeTPU (PCIe)", units)


def detect_coral_usb() -> DetectionHardware | None:
    """Find USB Coral accelerators by their USB vendor and product ids."""
    found = 0

    for device_dir in sorted(glob(f"{SYS_ROOT}/bus/usb/devices/*")):
        vendor = _read(os.path.join(device_dir, "idVendor"))
        product = _read(os.path.join(device_dir, "idProduct"))

        if vendor and product and (vendor.lower(), product.lower()) in CORAL_USB_IDS:
            found += 1

    if not found:
        return None

    units = [
        HardwareUnit(device=f"edgetpu:usb:{index}", label=f"USB {index}")
        for index in range(found)
    ]
    return _hardware("edgetpu:usb", "edgetpu", "Coral EdgeTPU (USB)", units)


def _drm_devices(drivers: tuple[str, ...]) -> list[str]:
    """PCI addresses of DRM devices bound to one of the given drivers."""
    return sorted(
        pdev for pdev, driver in enumerate_drm_devices().items() if driver in drivers
    )


def detect_intel_gpu() -> DetectionHardware | None:
    """Find Intel GPUs through their DRM driver."""
    pdevs = _drm_devices(INTEL_DRM_DRIVERS)

    if not pdevs:
        return None

    # OpenVINO reports a lone GPU as "GPU" and enumerates them as GPU.0, GPU.1
    # only when there is more than one
    if len(pdevs) == 1:
        units = [HardwareUnit(device="openvino:GPU", label=pdevs[0])]
    else:
        units = [
            HardwareUnit(device=f"openvino:GPU.{index}", label=pdev)
            for index, pdev in enumerate(pdevs)
        ]

    return _hardware("openvino:GPU", "openvino", "Intel GPU", units)


def detect_intel_npu() -> DetectionHardware | None:
    """Find Intel NPUs, which register as accel devices bound to intel_vpu."""
    units = []

    for accel_path in sorted(glob(f"{SYS_ROOT}/class/accel/accel*")):
        try:
            driver = os.path.basename(os.readlink(f"{accel_path}/device/driver"))
        except OSError:
            continue

        if driver != "intel_vpu":
            continue

        units.append(
            HardwareUnit(device="openvino:NPU", label=os.path.basename(accel_path))
        )

    if not units:
        return None

    # OpenVINO has no way to address a specific NPU, so only the first is usable
    return _hardware("openvino:NPU", "openvino", "Intel NPU", units[:1])


def detect_amd_gpu() -> DetectionHardware | None:
    """Find AMD GPUs through their DRM driver."""
    pdevs = _drm_devices(AMD_DRM_DRIVERS)

    if not pdevs:
        return None

    # ROCm runs through onnx, whose MIGraphX provider takes no device index, so
    # only one is addressable
    units = [HardwareUnit(device="onnx", label=pdevs[0])]
    return _hardware("onnx:amd", "onnx", "AMD GPU", units)


def detect_nvidia_gpu() -> DetectionHardware | None:
    """Find discrete Nvidia GPUs through the nvidia driver's proc entries."""
    units = []

    for index, gpu_dir in enumerate(sorted(glob(f"{PROC_ROOT}/driver/nvidia/gpus/*"))):
        information = _read(os.path.join(gpu_dir, "information")) or ""
        name = f"GPU {index}"

        for line in information.splitlines():
            if line.startswith("Model:"):
                name = line.split(":", 1)[1].strip()
                break

        units.append(HardwareUnit(device=f"onnx:{index}", label=name))

    if not units:
        return None

    # the model name is more useful as the hardware name when there is only one
    name = units[0].label if len(units) == 1 else "NVIDIA GPU"
    return _hardware("onnx:nvidia", "onnx", name, units)


def detect_jetson() -> DetectionHardware | None:
    """Find an Nvidia Jetson, whose integrated GPU runs through tensorrt."""
    is_jetson = os.path.isfile(f"{ETC_ROOT}/nv_tegra_release") or os.path.exists(
        f"{SYS_ROOT}/devices/gpu.0/load"
    )

    if not is_jetson:
        return None

    units = [HardwareUnit(device="tensorrt:0", label="Integrated GPU")]
    return _hardware("tensorrt", "tensorrt", "NVIDIA Jetson", units)


def _dev_units(pattern: str, device: str, label: str) -> list[HardwareUnit]:
    """Build units from device nodes matching a glob."""
    return [
        HardwareUnit(device=device.format(index=index), label=f"{label} {index}")
        for index in range(len(glob(f"{DEV_ROOT}/{pattern}")))
    ]


def detect_hailo() -> DetectionHardware | None:
    """Find Hailo accelerators by their device nodes."""
    nodes = sorted(glob(f"{DEV_ROOT}/hailo*"))

    if not nodes:
        return None

    # the hailo runtime schedules across every attached device itself, so there
    # is nothing to address individually
    units = [HardwareUnit(device="hailo8l:PCIe", label=os.path.basename(nodes[0]))]
    return _hardware("hailo8l", "hailo8l", "Hailo", units)


def detect_memryx() -> DetectionHardware | None:
    """Find MemryX accelerators by their device nodes."""
    units = _dev_units("memx*", "memryx:PCIe:{index}", "PCIe")

    if not units:
        return None

    return _hardware("memryx", "memryx", "MemryX MX3", units)


def detect_rockchip() -> DetectionHardware | None:
    """Find a Rockchip NPU by reading the SoC from the device tree."""
    compatible = _read(f"{PROC_ROOT}/device-tree/compatible")

    if not compatible:
        return None

    soc = compatible.split(",")[-1].strip("\x00")

    if soc not in SUPPORTED_RK_SOCS:
        return None

    units = [HardwareUnit(device="rknn", label=soc.upper())]
    return _hardware("rknn", "rknn", f"Rockchip NPU ({soc.upper()})", units)


def detect_axengine() -> DetectionHardware | None:
    """Find an AXERA accelerator by its control device node."""
    if not os.path.exists(f"{DEV_ROOT}/axcl_host"):
        return None

    units = [HardwareUnit(device="axengine", label="AXERA")]
    return _hardware("axengine", "axengine", "AXERA NPU", units)


def detect_synaptics() -> DetectionHardware | None:
    """Find a Synaptics NPU by its device node."""
    if not os.path.exists(f"{DEV_ROOT}/synap"):
        return None

    units = [HardwareUnit(device="synaptics", label="Synaptics")]
    return _hardware("synaptics", "synaptics", "Synaptics NPU", units)


def detect_cpu() -> DetectionHardware:
    """The CPU, which is always available."""
    units = [HardwareUnit(device="cpu", label="CPU")]
    return _hardware("cpu", "cpu", "CPU", units)


# ordered so accelerators are offered ahead of the CPU fallback
PROBES = (
    detect_coral_pci,
    detect_coral_usb,
    detect_hailo,
    detect_memryx,
    detect_intel_npu,
    detect_intel_gpu,
    detect_nvidia_gpu,
    detect_jetson,
    detect_amd_gpu,
    detect_rockchip,
    detect_axengine,
    detect_synaptics,
    detect_cpu,
)


class HardwareProber:
    """Probes for detection hardware, caching the result for the process."""

    _hardware: list[DetectionHardware] | None = None

    def probe(self, refresh: bool = False) -> list[DetectionHardware]:
        """Get the detection hardware attached to this system.

        Args:
            refresh: Probe again instead of using the cached result

        Returns:
            Every kind of detection hardware that was found
        """
        if self._hardware is not None and not refresh:
            return self._hardware

        found = []

        for probe in PROBES:
            try:
                hardware = probe()
            except Exception:
                logger.warning("Failed to probe for %s", probe.__name__, exc_info=True)
                continue

            if hardware is not None:
                found.append(hardware)

        logger.debug("Detected hardware: %s", [h.key for h in found])
        self._hardware = found
        return found


hardware_prober = HardwareProber()
