"""Tests for manual event severity categorization.

Regression coverage for manual events created via the events API being
categorized as detections when their label appears in both the alerts and
detections label lists. Alert labels must win, matching how tracked objects
are categorized, and labels in neither list must default to alerts so the
historical behavior of the API is preserved.
"""

import unittest

from frigate.config import FrigateConfig
from frigate.review.maintainer import ReviewSegmentMaintainer
from frigate.review.types import SeverityEnum

BASE_CONFIG = """
mqtt:
  enabled: False
cameras:
  front_door:
    ffmpeg:
      inputs:
        - path: rtsp://10.0.0.1:554/video
          roles:
            - detect
    detect:
      width: 1920
      height: 1080
      fps: 5
%s
"""


class TestManualEventSeverity(unittest.TestCase):
    def _make_maintainer(self, review_config: str = "") -> ReviewSegmentMaintainer:
        """Build a maintainer without invoking __init__ (avoids needing ZMQ
        sockets, shared memory, and clip dirs). Only the config is read when
        categorizing a manual event label."""
        maintainer = ReviewSegmentMaintainer.__new__(ReviewSegmentMaintainer)
        maintainer.config = FrigateConfig.parse_yaml(BASE_CONFIG % review_config)
        return maintainer

    def test_defaults_to_alert(self) -> None:
        maintainer = self._make_maintainer()

        self.assertEqual(
            maintainer.get_manual_event_severity("front_door", "person"),
            SeverityEnum.alert,
        )

    def test_unlisted_label_defaults_to_alert(self) -> None:
        maintainer = self._make_maintainer(
            """
    review:
      detections:
        labels:
          - dog
"""
        )

        self.assertEqual(
            maintainer.get_manual_event_severity("front_door", "pir_sensor"),
            SeverityEnum.alert,
        )

    def test_detection_label_is_detection(self) -> None:
        maintainer = self._make_maintainer(
            """
    review:
      alerts:
        labels:
          - person
      detections:
        labels:
          - pir_sensor
"""
        )

        self.assertEqual(
            maintainer.get_manual_event_severity("front_door", "pir_sensor"),
            SeverityEnum.detection,
        )

    def test_alert_label_wins_over_detection_label(self) -> None:
        maintainer = self._make_maintainer(
            """
    review:
      alerts:
        labels:
          - person
      detections:
        labels:
          - person
          - dog
"""
        )

        self.assertEqual(
            maintainer.get_manual_event_severity("front_door", "person"),
            SeverityEnum.alert,
        )

    def test_sub_label_is_stripped_before_categorizing(self) -> None:
        maintainer = self._make_maintainer(
            """
    review:
      alerts:
        labels:
          - person
      detections:
        labels:
          - person
"""
        )

        self.assertEqual(
            maintainer.get_manual_event_severity("front_door", "person: Bob"),
            SeverityEnum.alert,
        )

    def test_alert_label_is_detection_when_alerts_disabled(self) -> None:
        maintainer = self._make_maintainer(
            """
    review:
      alerts:
        enabled: False
        labels:
          - person
      detections:
        labels:
          - person
"""
        )

        self.assertEqual(
            maintainer.get_manual_event_severity("front_door", "person"),
            SeverityEnum.detection,
        )

    def test_no_severity_when_alerts_disabled_and_label_not_a_detection(self) -> None:
        maintainer = self._make_maintainer(
            """
    review:
      alerts:
        enabled: False
      detections:
        labels:
          - dog
"""
        )

        self.assertIsNone(
            maintainer.get_manual_event_severity("front_door", "pir_sensor")
        )
