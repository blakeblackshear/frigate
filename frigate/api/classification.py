"""Object classification APIs."""

import logging

from fastapi import APIRouter

from frigate.api.defs.tags import Tags

logger = logging.getLogger(__name__)

router = APIRouter(tags=[Tags.events])


@router.get("/faces")
def get_faces() -> None:
    return None
