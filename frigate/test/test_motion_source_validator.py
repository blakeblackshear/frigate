"""Validator tests for `motion.source=onvif` interactions with
`onvif.events.enabled` and `motion.enabled`. Exercises `verify_motion_and_detect`
directly so we don't need the full FrigateConfig path (which mounts /config)."""

import unittest

from frigate.config.config import verify_motion_and_detect


class _Dummy:
    """Light shim for the nested config attributes the validator reads."""

    def __init__(self, **kw):
        for k, v in kw.items():
            setattr(self, k, v)


def _camera(*, name, detect, motion, onvif):
    return _Dummy(name=name, detect=detect, motion=motion, onvif=onvif)


class TestVerifyMotionAndDetect(unittest.TestCase):
    def test_internal_motion_with_detect_passes(self):
        cam = _camera(
            name="c",
            detect=_Dummy(enabled=True),
            motion=_Dummy(enabled=True, source="internal"),
            onvif=_Dummy(events=_Dummy(enabled=False)),
        )
        # No exception.
        self.assertIsNone(verify_motion_and_detect(cam))

    def test_detect_with_motion_disabled_rejected(self):
        cam = _camera(
            name="c",
            detect=_Dummy(enabled=True),
            motion=_Dummy(enabled=False, source="internal"),
            onvif=_Dummy(events=_Dummy(enabled=False)),
        )
        with self.assertRaisesRegex(ValueError, "object detection requires motion"):
            verify_motion_and_detect(cam)

    def test_source_onvif_requires_events_enabled(self):
        cam = _camera(
            name="c",
            detect=_Dummy(enabled=True),
            motion=_Dummy(enabled=False, source="onvif"),
            onvif=_Dummy(events=_Dummy(enabled=False)),
        )
        with self.assertRaisesRegex(ValueError, "onvif.events.enabled is false"):
            verify_motion_and_detect(cam)

    def test_source_onvif_with_events_passes_even_with_motion_disabled(self):
        cam = _camera(
            name="c",
            detect=_Dummy(enabled=True),
            motion=_Dummy(enabled=False, source="onvif"),
            onvif=_Dummy(events=_Dummy(enabled=True)),
        )
        self.assertIsNone(verify_motion_and_detect(cam))


if __name__ == "__main__":
    unittest.main()
