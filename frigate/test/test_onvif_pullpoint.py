"""Unit tests for the ONVIF PullPoint motion-state parser."""

import unittest
from xml.etree import ElementTree as ET

from frigate.ptz.onvif_events import _parse_motion_state


class FakeMessage:
    """Mimic the zeep NotificationMessage shape: a Message attribute holding
    an object whose `_value_1` is an lxml/etree element."""

    class _Body:
        def __init__(self, element):
            self._value_1 = element

    def __init__(self, xml: str):
        self.Message = self._Body(ET.fromstring(xml))


_NS = 'xmlns:tt="http://www.onvif.org/ver10/schema"'


def _build_msg(name: str, value: str) -> FakeMessage:
    xml = (
        f"<tt:Message {_NS}>"
        "<tt:Source>"
        '<tt:SimpleItem Name="Source" Value="VideoSourceToken"/>'
        "</tt:Source>"
        "<tt:Data>"
        f'<tt:SimpleItem Name="{name}" Value="{value}"/>'
        "</tt:Data>"
        "</tt:Message>"
    )
    return FakeMessage(xml)


class TestParseMotionState(unittest.TestCase):
    def test_is_motion_true(self):
        self.assertTrue(_parse_motion_state(_build_msg("IsMotion", "true")))

    def test_is_motion_false(self):
        self.assertFalse(_parse_motion_state(_build_msg("IsMotion", "false")))

    def test_legacy_state_topic_name(self):
        # The legacy tns1:VideoSource/MotionAlarm payload uses "State" instead
        # of the spec-compliant "IsMotion"; we accept either.
        self.assertTrue(_parse_motion_state(_build_msg("State", "true")))
        self.assertFalse(_parse_motion_state(_build_msg("State", "false")))

    def test_boolean_aliases(self):
        self.assertTrue(_parse_motion_state(_build_msg("IsMotion", "1")))
        self.assertFalse(_parse_motion_state(_build_msg("IsMotion", "0")))

    def test_no_state_returns_none(self):
        # Missing the State/IsMotion SimpleItem.
        xml = (
            f"<tt:Message {_NS}>"
            '<tt:Data><tt:SimpleItem Name="Other" Value="yes"/></tt:Data>'
            "</tt:Message>"
        )
        self.assertIsNone(_parse_motion_state(FakeMessage(xml)))

    def test_no_message_returns_none(self):
        class Empty:
            pass

        self.assertIsNone(_parse_motion_state(Empty()))


if __name__ == "__main__":
    unittest.main()
