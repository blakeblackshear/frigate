import unittest
from unittest.mock import AsyncMock, MagicMock, patch

from zeep.exceptions import Fault, TransportError
from zeep.transports import AsyncTransport

from frigate.api.camera import _build_digest_transport, _connect_onvif_camera


def _make_camera(update_side_effect=None):
    """Build a mock ONVIFCamera whose update_xaddrs can raise or succeed."""
    camera = MagicMock()
    camera.update_xaddrs = AsyncMock(side_effect=update_side_effect)
    return camera


class TestConnectOnvifCamera(unittest.IsolatedAsyncioTestCase):
    async def test_password_digest_succeeds_first(self):
        # Cameras that accept PasswordDigest authenticate on the first attempt
        # and should never trigger the PasswordText fallback.
        camera = _make_camera()

        with patch("frigate.api.camera.ONVIFCamera", return_value=camera) as mock_cls:
            result = await _connect_onvif_camera(
                "cam.local", 80, "user", "pass", None, "basic"
            )

        self.assertIs(result, camera)
        mock_cls.assert_called_once()
        self.assertTrue(mock_cls.call_args.kwargs["encrypt"])

    async def test_falls_back_to_password_text(self):
        # A PasswordDigest rejection should retry once with PasswordText.
        camera_digest = _make_camera(update_side_effect=Fault("token rejected"))
        camera_text = _make_camera()

        with patch(
            "frigate.api.camera.ONVIFCamera",
            side_effect=[camera_digest, camera_text],
        ) as mock_cls:
            result = await _connect_onvif_camera(
                "cam.local", 80, "user", "pass", None, "basic"
            )

        self.assertIs(result, camera_text)
        self.assertEqual(mock_cls.call_count, 2)
        self.assertTrue(mock_cls.call_args_list[0].kwargs["encrypt"])
        self.assertFalse(mock_cls.call_args_list[1].kwargs["encrypt"])

    async def test_both_encodings_fail_raises_first_fault(self):
        # When both encodings fault, the original (PasswordDigest) fault is
        # surfaced so the caller's existing Fault handler reports it.
        first_fault = Fault("digest rejected")
        camera_digest = _make_camera(update_side_effect=first_fault)
        camera_text = _make_camera(update_side_effect=Fault("text rejected"))

        with patch(
            "frigate.api.camera.ONVIFCamera",
            side_effect=[camera_digest, camera_text],
        ) as mock_cls:
            with self.assertRaises(Fault) as ctx:
                await _connect_onvif_camera(
                    "cam.local", 80, "user", "pass", None, "basic"
                )

        self.assertIs(ctx.exception, first_fault)
        self.assertEqual(mock_cls.call_count, 2)

    async def test_transport_error_is_not_retried(self):
        # Connection-level errors (timeout, refused, unreachable) should
        # propagate immediately without doubling latency on a second encoding.
        camera = _make_camera(update_side_effect=TransportError("unreachable"))

        with patch("frigate.api.camera.ONVIFCamera", side_effect=[camera]) as mock_cls:
            with self.assertRaises(TransportError):
                await _connect_onvif_camera(
                    "cam.local", 80, "user", "pass", None, "basic"
                )

        mock_cls.assert_called_once()

    async def test_digest_auth_replaces_service_transports(self):
        # auth_type "digest" wires an HTTP digest transport onto each service,
        # independently of the WS-Security encoding.
        camera = _make_camera()

        with (
            patch("frigate.api.camera.ONVIFCamera", return_value=camera),
            patch(
                "frigate.api.camera._build_digest_transport",
                return_value="TRANSPORT",
            ) as mock_transport,
        ):
            result = await _connect_onvif_camera(
                "cam.local", 80, "user", "pass", None, "digest"
            )

        self.assertIs(result, camera)
        mock_transport.assert_called_once_with("user", "pass")
        self.assertEqual(camera.devicemgmt.zeep_client.transport, "TRANSPORT")
        self.assertEqual(camera.media.zeep_client.transport, "TRANSPORT")
        self.assertEqual(camera.ptz.zeep_client.transport, "TRANSPORT")

    async def test_basic_auth_does_not_replace_transports(self):
        # Without digest auth, no transport override is built.
        camera = _make_camera()

        with (
            patch("frigate.api.camera.ONVIFCamera", return_value=camera),
            patch("frigate.api.camera._build_digest_transport") as mock_transport,
        ):
            await _connect_onvif_camera("cam.local", 80, "user", "pass", None, "basic")

        mock_transport.assert_not_called()


class TestBuildDigestTransport(unittest.TestCase):
    def test_returns_async_transport(self):
        transport = _build_digest_transport("user", "pass")
        self.assertIsInstance(transport, AsyncTransport)


if __name__ == "__main__":
    unittest.main()
