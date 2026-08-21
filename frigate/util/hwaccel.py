"""Recommendation of ffmpeg hwaccel presets from the hardware on the system.

Every check is a filesystem read, like the detection hardware probes, so this
is cheap enough to serve from the API process.

Presets are grouped into families because some of them only decode the codec
they name. A family hides that: callers pick the family their hardware needs
and resolve it per camera against that camera's detect stream.
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

ANY_CODEC = "any"

# a Raspberry Pi has no detection hardware of its own, so it gets a key here
RASPBERRY_PI = "raspberrypi"

# ffprobe names h265 streams hevc
CODEC_ALIASES = {"hevc": "h265"}

# e.g. "13th Gen Intel(R) Core(TM) i5-13500"
INTEL_GEN_PATTERN = re.compile(r"(\d+)th Gen")
# Core Ultra dropped the generation prefix and is newer than all of them
INTEL_ULTRA_PATTERN = re.compile(r"Core\(TM\) Ultra")
INTEL_GEN_LATEST = 99

# per the hwaccel docs, gen13+ and Arc prefer qsv while older is safest on
# vaapi, and qsv is not supported at all before gen8
INTEL_QSV_MIN_GEN = 13
INTEL_QSV_SUPPORTED_GEN = 8

# decode capable detection hardware, in recommendation priority order
DECODE_HARDWARE = (
    "onnx:nvidia",
    "tensorrt",
    "rknn",
    "openvino:GPU",
    "onnx:amd",
    RASPBERRY_PI,
)


class HwaccelFamily(BaseModel):
    """A kind of hardware decoding, and the presets that drive it."""

    key: str = Field(
        title="Family key",
        description="Stable identifier for this kind of hardware decoding.",
    )
    presets: dict[str, str] = Field(
        title="Presets",
        description="The ffmpeg preset for each codec this family decodes, or a single 'any' preset when it decodes every codec.",
    )


class HwaccelRecommendation(BaseModel):
    """The hardware decoding this system can do."""

    recommended: str = Field(
        title="Recommended family",
        description="Key of the family that fits this system best, or an empty string when none does.",
    )
    available: list[HwaccelFamily] = Field(
        default_factory=list,
        title="Available families",
        description="Every family this system's hardware can use, best first.",
    )


FAMILY_NVIDIA = HwaccelFamily(key="nvidia", presets={ANY_CODEC: FFMPEG_HWACCEL_NVIDIA})
FAMILY_VAAPI = HwaccelFamily(key="vaapi", presets={ANY_CODEC: FFMPEG_HWACCEL_VAAPI})
FAMILY_RKMPP = HwaccelFamily(key="rkmpp", presets={ANY_CODEC: FFMPEG_HWACCEL_RKMPP})
FAMILY_QSV = HwaccelFamily(
    key="intel-qsv",
    presets={"h264": "preset-intel-qsv-h264", "h265": "preset-intel-qsv-h265"},
)
FAMILY_JETSON = HwaccelFamily(
    key="jetson",
    presets={"h264": "preset-jetson-h264", "h265": "preset-jetson-h265"},
)
FAMILY_RPI = HwaccelFamily(
    key="rpi",
    presets={"h264": "preset-rpi-64-h264", "h265": "preset-rpi-64-h265"},
)


def _read(path: str) -> str | None:
    """Read a small file, returning None if it cannot be read."""
    try:
        with open(path) as f:
            return f.read().strip()
    except OSError:
        return None


def _intel_generation() -> int | None:
    """The Intel platform generation, or None when it cannot be determined."""
    # the xe driver only binds to the newest platforms (Arc and later iGPUs)
    if "xe" in enumerate_drm_devices().values():
        return INTEL_GEN_LATEST

    cpuinfo = _read(f"{PROC_ROOT}/cpuinfo") or ""

    for line in cpuinfo.splitlines():
        if not line.startswith("model name"):
            continue

        match = INTEL_GEN_PATTERN.search(line)

        if match:
            return int(match.group(1))

        if INTEL_ULTRA_PATTERN.search(line):
            return INTEL_GEN_LATEST

        break

    return None


def _is_raspberry_pi() -> bool:
    compatible = _read(f"{PROC_ROOT}/device-tree/compatible") or ""
    return "raspberrypi" in compatible


def _intel_families(generation: int | None) -> list[HwaccelFamily]:
    """vaapi drives every Intel GPU, qsv only those from gen8 on."""
    if generation is not None and generation < INTEL_QSV_SUPPORTED_GEN:
        return [FAMILY_VAAPI]

    if generation is not None and generation >= INTEL_QSV_MIN_GEN:
        return [FAMILY_QSV, FAMILY_VAAPI]

    return [FAMILY_VAAPI, FAMILY_QSV]


def _families(key: str, generation: int | None) -> list[HwaccelFamily]:
    """Every family that can decode on this hardware, best first."""
    if key == "onnx:nvidia":
        return [FAMILY_NVIDIA]

    if key == "tensorrt":
        return [FAMILY_JETSON]

    if key == "rknn":
        return [FAMILY_RKMPP]

    if key == "onnx:amd":
        return [FAMILY_VAAPI]

    if key == RASPBERRY_PI:
        return [FAMILY_RPI]

    if key == "openvino:GPU":
        return _intel_families(generation)

    return []


def _decodes(family: HwaccelFamily, codecs: set[str]) -> bool:
    """Whether a family can decode every codec that is in use."""
    if ANY_CODEC in family.presets:
        return True

    return all(codec in family.presets for codec in codecs)


def _decode_hardware(detector_key: str | None) -> list[str]:
    """Decode capable hardware on this system, best first.

    Args:
        detector_key: Hardware key of the detection hardware in use, whose GPU
            is preferred over any other

    Returns:
        The hardware keys that can decode video, in recommendation order
    """
    present = {found.key for found in hardware_prober.probe()}

    if _is_raspberry_pi():
        present.add(RASPBERRY_PI)

    # an Intel NPU decodes through the iGPU next to it
    if detector_key == "openvino:NPU":
        detector_key = "openvino:GPU"

    ordered = [key for key in DECODE_HARDWARE if key in present]

    if detector_key in ordered:
        ordered.remove(detector_key)
        ordered.insert(0, detector_key)

    return ordered


def hwaccel_options(
    detector_key: str | None = None, codecs: set[str] | None = None
) -> tuple[str, list[HwaccelFamily]]:
    """Get the hardware decoding this system can do.

    Args:
        detector_key: Hardware key of the detection hardware in use, which
            biases the recommendation toward that hardware's GPU
        codecs: Codecs of the streams that will be decoded, used to drop
            families that cannot decode one of them

    Returns:
        The recommended family key (empty when none fits) and every usable
        family, best first
    """
    wanted = {CODEC_ALIASES.get(codec, codec) for codec in codecs or set()}
    hardware = _decode_hardware(detector_key)
    generation = _intel_generation() if "openvino:GPU" in hardware else None

    available: list[HwaccelFamily] = []
    recommended = ""

    for key in hardware:
        usable = [
            family for family in _families(key, generation) if _decodes(family, wanted)
        ]

        if usable and not recommended:
            recommended = _recommend(usable, bool(wanted))

        for family in usable:
            if family.key not in {entry.key for entry in available}:
                available.append(family)

    return recommended, available


def _recommend(families: list[HwaccelFamily], codecs_known: bool) -> str:
    """Pick the family to default to out of the ones this hardware can use."""
    if not codecs_known:
        # a codec specific family would have to guess a codec for cameras
        # that do not exist yet
        for family in families:
            if ANY_CODEC in family.presets:
                return family.key

    return families[0].key


def recommend_hwaccel(
    detector_key: str | None = None, codecs: set[str] | None = None
) -> str:
    """Recommend a hardware decoding family for this system.

    Args:
        detector_key: Hardware key of the detection hardware in use
        codecs: Codecs of the streams that will be decoded

    Returns:
        The key of the family that fits, or an empty string when none does
    """
    return hwaccel_options(detector_key, codecs)[0]
