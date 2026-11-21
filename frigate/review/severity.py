"""Rules for which review severity a tracked object qualifies for."""

from typing import cast

from frigate.config import CameraConfig
from frigate.review.types import SeverityEnum


def get_review_severity(
    camera_config: CameraConfig,
    *,
    label: str,
    current_zones: list[str],
    false_positive: bool,
    detected: bool,
    position_changes: int,
    motionless_count: int,
    pending_loitering: bool,
) -> SeverityEnum | None:
    """Get the review severity a tracked object qualifies for on the current frame.

    Review segments and a tracked object's max_severity both use this, so an
    object is only reported as an alert or detection when it could actually
    create or extend a review segment of that severity.

    Args:
        camera_config: Config for the camera the object is on
        label: The object's label
        current_zones: Zones the object is in on the current frame
        false_positive: Whether the object is still considered a false positive
        detected: Whether the object was detected on the current frame
        position_changes: Number of times the object has changed position
        motionless_count: Number of frames the object has not moved
        pending_loitering: Whether the object is in a loitering zone but has
            not met the loitering time yet

    Returns:
        The severity the object qualifies for, or None if it does not qualify
    """
    # always populated from detect fps when the config is loaded
    stationary_threshold = cast(int, camera_config.detect.stationary.threshold)

    # stationary objects don't count unless they are loitering
    if motionless_count >= stationary_threshold and not pending_loitering:
        return None

    # object must have moved at least once
    if position_changes == 0:
        return None

    if not detected or false_positive:
        return None

    review_config = camera_config.review
    zones = set(current_zones)

    if (
        review_config.alerts.enabled
        and label in review_config.alerts.labels
        and (
            not review_config.alerts.required_zones
            or zones & set(review_config.alerts.required_zones)
        )
    ):
        return SeverityEnum.alert

    if (
        review_config.detections.enabled
        and (
            review_config.detections.labels is None
            or label in review_config.detections.labels
        )
        and (
            not review_config.detections.required_zones
            or zones & set(review_config.detections.required_zones)
        )
    ):
        return SeverityEnum.detection

    return None
