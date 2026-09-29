"""POST a report to the ingest endpoint."""

import logging
from enum import Enum

import requests

from frigate.version import VERSION

logger = logging.getLogger(__name__)

TIMEOUT_S = 30


class SendOutcome(Enum):
    accepted = "accepted"
    rejected = "rejected"
    rate_limited = "rate_limited"
    failed = "failed"


def send_report(url: str, body: str) -> SendOutcome:
    """Send one report. Never raises; the outcome says what happened."""
    try:
        # a redirect would turn the POST into a GET, so it counts as a failure
        response = requests.post(
            url,
            data=body.encode(),
            headers={
                "Content-Type": "application/json",
                "User-Agent": f"Frigate/{VERSION}",
            },
            timeout=TIMEOUT_S,
            allow_redirects=False,
        )
    except requests.RequestException as err:
        logger.warning("Unable to send the analytics report: %s", err)
        return SendOutcome.failed

    status = response.status_code

    if 200 <= status < 300:
        return SendOutcome.accepted

    if status == 400:
        logger.warning("The analytics report was rejected: %s", response.text[:200])
        return SendOutcome.rejected

    if status == 429:
        logger.debug("The analytics endpoint is rate limiting this install")
        return SendOutcome.rate_limited

    logger.warning("The analytics endpoint returned %s", status)
    return SendOutcome.failed
