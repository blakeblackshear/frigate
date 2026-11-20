"""Tests for Frigate+ model metadata."""

import asyncio
import json
import os
import tempfile
import unittest
from unittest.mock import MagicMock, patch

import aiohttp
from aiohttp import web
from aiohttp.test_utils import TestServer

from frigate.plus import PlusApi, PlusKeyStatus, load_plus_model_info


class TestHailoAlias(unittest.TestCase):
    """Frigate+ reports Hailo models by the detector's pre-rename key.

    Both the model list and a cached info file have to carry the current key,
    or every Hailo model reads as unsupported.
    """

    def _get_models(self, models: list[dict]) -> list[dict]:
        api = PlusApi.__new__(PlusApi)
        response = MagicMock(ok=True, json=lambda: {"list": models})

        with patch.object(PlusApi, "_get", return_value=response):
            return api.get_models()["list"]

    def test_the_model_list_gains_the_current_key(self):
        models = self._get_models([{"supportedDetectors": ["hailo8l"]}])

        self.assertEqual(models[0]["supportedDetectors"], ["hailo8l", "hailo"])

    def test_the_old_key_is_kept_for_older_versions(self):
        models = self._get_models([{"supportedDetectors": ["hailo8l"]}])

        self.assertIn("hailo8l", models[0]["supportedDetectors"])

    def test_other_detectors_are_untouched(self):
        models = self._get_models([{"supportedDetectors": ["openvino", "onnx"]}])

        self.assertEqual(models[0]["supportedDetectors"], ["openvino", "onnx"])

    def test_a_model_already_naming_both_is_unchanged(self):
        models = self._get_models([{"supportedDetectors": ["hailo8l", "hailo"]}])

        self.assertEqual(models[0]["supportedDetectors"], ["hailo8l", "hailo"])

    def test_an_empty_list(self):
        self.assertEqual(self._get_models([]), [])


class TestLoadPlusModelInfo(unittest.TestCase):
    def setUp(self):
        self.cache = tempfile.TemporaryDirectory()
        self.addCleanup(self.cache.cleanup)
        patcher = patch("frigate.plus.MODEL_CACHE_DIR", self.cache.name)
        patcher.start()
        self.addCleanup(patcher.stop)

    def _write(self, model_id: str, content: str) -> None:
        with open(os.path.join(self.cache.name, f"{model_id}.json"), "w") as f:
            f.write(content)

    def test_a_cached_hailo_model_gains_the_current_key(self):
        self._write("abc", json.dumps({"supportedDetectors": ["hailo8l"]}))

        self.assertEqual(
            load_plus_model_info("abc")["supportedDetectors"], ["hailo8l", "hailo"]
        )

    def test_a_missing_file(self):
        self.assertIsNone(load_plus_model_info("nope"))

    def test_an_unreadable_file(self):
        self._write("bad", "{not json")

        self.assertIsNone(load_plus_model_info("bad"))


class TestValidateKey(unittest.IsolatedAsyncioTestCase):
    """The key format is checked locally, but only the server knows if it is valid."""

    CACHED_TOKEN = {"accessToken": "cached", "expires": 2000000000}

    async def _serve(self, handler) -> str:
        """Serve the token endpoint locally and return its base url."""
        app = web.Application()
        app.router.add_get("/v1/auth/token", handler)
        server = TestServer(app)
        await server.start_server()
        self.addAsyncCleanup(server.close)
        return str(server.make_url("")).rstrip("/")

    def _api(self, host: str, key: str | None = "id:secret") -> PlusApi:
        api = PlusApi.__new__(PlusApi)
        api.host = host
        api.key = key
        api._token_data = dict(self.CACHED_TOKEN)
        return api

    async def _validate(self, handler) -> tuple[PlusKeyStatus, PlusApi]:
        api = self._api(await self._serve(handler))
        return await api.validate_key(), api

    def _replies(self, status: int = 200, body: object = None, text: str | None = None):
        async def handler(request: web.Request) -> web.Response:
            self.auth = request.headers.get("Authorization")
            if text is not None:
                return web.Response(status=status, text=text)
            return web.json_response(body, status=status)

        return handler

    async def test_an_accepted_key_is_valid(self):
        token = {"accessToken": "fresh", "expires": 2000000500.5}
        status, api = await self._validate(self._replies(body=token))

        self.assertEqual(status, PlusKeyStatus.valid)
        self.assertEqual(api._token_data, token)
        self.assertEqual(self.auth, aiohttp.BasicAuth("id", "secret").encode())

    async def test_a_rejected_key_is_invalid(self):
        for code in (401, 403):
            status, api = await self._validate(self._replies(code, {"error": "no"}))

            self.assertEqual(status, PlusKeyStatus.invalid)
            self.assertEqual(api._token_data, self.CACHED_TOKEN)

    async def test_a_server_error_is_not_reported_as_invalid(self):
        status, _ = await self._validate(self._replies(500, {"error": "down"}))

        self.assertEqual(status, PlusKeyStatus.unreachable)

    async def test_unusable_replies_keep_the_cached_token(self):
        # a successful reply without a usable token must not replace one that
        # later Frigate+ requests depend on
        for body in (
            None,
            [],
            {},
            {"accessToken": "t"},
            {"expires": 2000000000},
            {"accessToken": 1, "expires": 2000000000},
            {"accessToken": "t", "expires": "soon"},
            {"accessToken": "t", "expires": True},
        ):
            with self.subTest(body=body):
                status, api = await self._validate(self._replies(body=body))

                self.assertEqual(status, PlusKeyStatus.unreachable)
                self.assertEqual(api._token_data, self.CACHED_TOKEN)

    async def test_a_non_json_reply_keeps_the_cached_token(self):
        status, api = await self._validate(self._replies(text="<html>"))

        self.assertEqual(status, PlusKeyStatus.unreachable)
        self.assertEqual(api._token_data, self.CACHED_TOKEN)

    async def test_a_connection_failure_is_unreachable(self):
        # serve and stop, so the port refuses connections
        server = TestServer(web.Application())
        await server.start_server()
        host = str(server.make_url("")).rstrip("/")
        await server.close()
        api = self._api(host)

        self.assertEqual(await api.validate_key(), PlusKeyStatus.unreachable)

    async def test_a_slow_server_times_out_as_unreachable(self):
        async def slow(request: web.Request) -> web.Response:
            await asyncio.sleep(5)
            return web.json_response(self.CACHED_TOKEN)

        with patch("frigate.plus.PLUS_VALIDATE_TIMEOUT", 0.1):
            status, _ = await self._validate(slow)

        self.assertEqual(status, PlusKeyStatus.unreachable)

    async def test_the_request_goes_through_a_configured_proxy(self):
        # installs that reach Frigate+ through a proxy must validate the same way
        token = {"accessToken": "proxied", "expires": 2000000000}
        proxied = []

        async def proxy(request: web.Request) -> web.Response:
            proxied.append(str(request.url))
            return web.json_response(token)

        proxy_url = await self._serve(proxy)
        api = self._api("http://plus.invalid")

        with patch.dict(
            os.environ, {"HTTP_PROXY": proxy_url, "NO_PROXY": ""}, clear=False
        ):
            status = await api.validate_key()

        self.assertEqual(status, PlusKeyStatus.valid)
        self.assertEqual(proxied, ["http://plus.invalid/v1/auth/token"])

    async def test_no_key_is_not_sent_to_the_server(self):
        requests_seen = []

        async def handler(request: web.Request) -> web.Response:
            requests_seen.append(request)
            return web.json_response(self.CACHED_TOKEN)

        api = self._api(await self._serve(handler), key=None)

        self.assertEqual(await api.validate_key(), PlusKeyStatus.not_set)
        self.assertEqual(requests_seen, [])


if __name__ == "__main__":
    unittest.main(verbosity=2)
