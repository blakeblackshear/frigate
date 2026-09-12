"""Hardware discovery APIs."""

import logging

from fastapi import APIRouter, Depends

from frigate.api.auth import require_role
from frigate.api.defs.tags import Tags
from frigate.detectors.hardware import DetectionHardware, hardware_prober
from frigate.util.hwaccel import HwaccelRecommendation, hwaccel_options

logger = logging.getLogger(__name__)

router = APIRouter(tags=[Tags.hardware])


@router.get(
    "/hardware/probe",
    response_model=list[DetectionHardware],
    dependencies=[Depends(require_role(["admin"]))],
)
def probe_hardware(refresh: bool = False) -> list[DetectionHardware]:
    """Get the object detection hardware attached to this system.

    Args:
        refresh: Probe again instead of returning the cached result

    Returns:
        Every kind of detection hardware that was found
    """
    return hardware_prober.probe(refresh=refresh)


@router.get(
    "/hardware/hwaccel",
    response_model=HwaccelRecommendation,
    dependencies=[Depends(require_role(["admin"]))],
)
def hwaccel_recommendation(
    detector: str | None = None, codecs: str | None = None
) -> HwaccelRecommendation:
    """Get the hardware decoding this system can do.

    Args:
        detector: Hardware key of the detection hardware in use, which biases
            the recommendation toward that hardware's GPU
        codecs: Comma separated codecs of the streams that will be decoded,
            used to drop families that cannot decode one of them

    Returns:
        The recommended family (empty when none fits) and every usable family
    """
    wanted = {
        codec.strip().lower() for codec in (codecs or "").split(",") if codec.strip()
    }
    recommended, available = hwaccel_options(detector, wanted)
    return HwaccelRecommendation(recommended=recommended, available=available)
