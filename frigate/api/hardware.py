"""Hardware discovery APIs."""

import logging

from fastapi import APIRouter, Depends

from frigate.api.auth import require_role
from frigate.api.defs.tags import Tags
from frigate.detectors.hardware import DetectionHardware, hardware_prober

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
