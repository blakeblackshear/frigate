"""Recommendation of an ffmpeg hwaccel preset from the hardware on the system.

Every check is a filesystem read, like the detection hardware probes, so this
is cheap enough to serve from the API process.
"""

import logging
import re

from pydantic import BaseModel, Field

from frigate.const import (
    FFMPEG_HWACCEL_NVIDIA,
    FFMPEG_HWACCEL_RKMPP,
    FFMPEG_HWACCEL_VAAPI,
)
from frigate.detectors.hardware import hardware_prober
from frigate.util.services import enumerate_drm_devices

logger = logging.getLogger(__name__)

# root the /proc reads use, so tests can point them at a fixture tree
PROC_ROOT = "/proc"

PRESET_JETSON = "preset-jetson-h264"
PRESET_INTEL_QSV = "preset-intel-qsv-h264"
PRESET_RPI = "preset-rpi-64-h264"

# marketing name of a newer Intel CPU, e.g. "13th Gen Intel(R) Core(TM) i5-13500"
INTEL_GEN_PATTERN = re.compile(r"(\d+)th Gen")

# per the hwaccel docs, gen13+ and Arc use qsv while older is safest on vaapi
INTEL_QSV_MIN_GEN = 13

# detection hardware whose GPU also decodes video, in recommendation priority
# order. None marks Intel, whose preset depends on the platform generation.
DECODE_PRESETS: dict[str, str | None] = {
    "onnx:nvidia": FFMPEG_HWACCEL_NVIDIA,
    "tensorrt": PRESET_JETSON,
    "rknn": FFMPEG_HWACCEL_RKMPP,
    "openvino:GPU": None,
    "onnx:amd": FFMPEG_HWACCEL_VAAPI,
}


class HwaccelRecommendation(BaseModel):
    """The hwaccel preset recommended for this system."""

    preset: str = Field(
        title="Recommended preset",
        description="The ffmpeg hwaccel preset that fits this system's hardware, or an empty string when none does.",
    )


def _read(path: str) -> str | None:
    """Read a small file, returning None if it cannot be read."""
    try:
        with open(path) as f:
            return f.read().strip()
    except OSError:
        return None


def _intel_preset() -> str:
    """Pick vaapi or qsv for an Intel GPU based on the platform generation."""
    # the xe driver only binds to the newest platforms (Arc and later iGPUs)
    if "xe" in enumerate_drm_devices().values():
        return PRESET_INTEL_QSV

    cpuinfo = _read(f"{PROC_ROOT}/cpuinfo") or ""

    for line in cpuinfo.splitlines():
        if line.startswith("model name"):
            match = INTEL_GEN_PATTERN.search(line)

            if match and int(match.group(1)) >= INTEL_QSV_MIN_GEN:
                return PRESET_INTEL_QSV

            # Core Ultra (Meteor Lake and later) dropped the "Nth Gen" prefix
            # but sits past the qsv cutoff
            if "Core(TM) Ultra" in line:
                return PRESET_INTEL_QSV

            break

    return FFMPEG_HWACCEL_VAAPI


def _is_raspberry_pi() -> bool:
    compatible = _read(f"{PROC_ROOT}/device-tree/compatible") or ""
    return "raspberrypi" in compatible


def recommend_hwaccel(detector_key: str | None = None) -> str:
    """Recommend an ffmpeg hwaccel preset for this system.

    Args:
        detector_key: Hardware key of the detection hardware in use, which
            biases the recommendation toward that hardware's GPU

    Returns:
        The name of the preset that fits, or an empty string when none does
    """
    present = {found.key for found in hardware_prober.probe()}

    candidates: list[str] = []

    if detector_key in DECODE_PRESETS and detector_key in present:
        candidates.append(detector_key)
    elif detector_key == "openvino:NPU" and "openvino:GPU" in present:
        # an Intel NPU decodes through the iGPU next to it
        candidates.append("openvino:GPU")

    candidates.extend(key for key in DECODE_PRESETS if key in present)

    if candidates:
        preset = DECODE_PRESETS[candidates[0]]
        return preset if preset is not None else _intel_preset()

    if _is_raspberry_pi():
        return PRESET_RPI

    return ""
