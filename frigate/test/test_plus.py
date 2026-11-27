"""Tests for Frigate+ model metadata."""

import asyncio
import datetime
import email.utils
import http.server
import json
import os
import pickle
import tempfile
import threading
import time
import unittest
from unittest.mock import MagicMock, patch

import aiohttp
from aiohttp import web
from aiohttp.test_utils import TestServer

from frigate.const import PLUS_ENV_VAR
from frigate.plus import (
    PlusApi,
    PlusKeyStatus,
    PlusRateLimitError,
    load_plus_model_info,
    parse_retry_after,
)

TEST_PLUS_KEY = f"{'a' * 8}-{'b' * 4}-{'c' * 4}-{'d' * 4}-{'e' * 12}:{'f' * 40}"


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
        api._rate_limited_until = None
        return api

    async def _validate(self, handler) -> tuple[PlusKeyStatus, PlusApi]:
        api = self._api(await self._serve(handler))
        return await api.validate_key(), api

    def _replies(
        self,
        status: int = 200,
        body: object = None,
        text: str | None = None,
        headers: dict[str, str] | None = None,
    ):
        async def handler(request: web.Request) -> web.Response:
            self.auth = request.headers.get("Authorization")
            self.requests_seen = getattr(self, "requests_seen", 0) + 1
            if text is not None:
                return web.Response(status=status, text=text, headers=headers)
            return web.json_response(body, status=status, headers=headers)

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

    async def test_a_rate_limited_key_is_not_reported_as_invalid(self):
        api = self._api(
            await self._serve(self._replies(429, {}, headers={"Retry-After": "120"}))
        )

        self.assertEqual(await api.validate_key(), PlusKeyStatus.rate_limited)
        self.assertAlmostEqual(api.rate_limit_remaining(), 120, delta=1)
        self.assertEqual(api._token_data, self.CACHED_TOKEN)

        # validating again during the wait doesn't ask the server
        self.assertEqual(await api.validate_key(), PlusKeyStatus.rate_limited)
        self.assertEqual(self.requests_seen, 1)

    async def test_a_rate_limit_without_retry_after(self):
        status, api = await self._validate(self._replies(429, {}))

        self.assertEqual(status, PlusKeyStatus.rate_limited)
        self.assertIsNone(api.rate_limit_remaining())

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


class TestParseRetryAfter(unittest.TestCase):
    def test_delay_seconds(self):
        self.assertEqual(parse_retry_after("120"), 120)
        self.assertEqual(parse_retry_after(" 0 "), 0)

    def test_an_http_date(self):
        retry_at = datetime.datetime.now(datetime.UTC) + datetime.timedelta(seconds=90)
        header = email.utils.format_datetime(retry_at, usegmt=True)

        self.assertAlmostEqual(parse_retry_after(header), 90, delta=2)

    def test_a_date_in_the_past_is_no_wait(self):
        self.assertEqual(parse_retry_after("Wed, 21 Oct 2015 07:28:00 GMT"), 0)

    def test_missing_or_invalid_values(self):
        for value in (None, "", "soon", "-5", "1.5"):
            with self.subTest(value=value):
                self.assertIsNone(parse_retry_after(value))


class TestRateLimit(unittest.TestCase):
    """A 429 from Frigate+ is raised at once instead of blocking on Retry-After."""

    def setUp(self):
        self.hits: list[str] = []
        self.status = 429
        self.headers: dict[str, str] = {"Retry-After": "30"}
        test = self

        class Handler(http.server.BaseHTTPRequestHandler):
            def _reply(self):
                test.hits.append(f"{self.command} {self.path}")
                length = int(self.headers.get("Content-Length") or 0)
                self.rfile.read(length)

                if self.path == "/v1/auth/token":
                    status, body = (
                        200,
                        json.dumps({"accessToken": "t", "expires": time.time() + 3600}),
                    )
                    headers = {}
                else:
                    status, body, headers = test.status, "{}", test.headers

                self.send_response(status)
                for name, value in headers.items():
                    self.send_header(name, value)
                self.send_header("Content-Length", str(len(body)))
                self.end_headers()
                self.wfile.write(body.encode())

            do_GET = do_PUT = do_POST = _reply

            def log_message(self, *args):
                pass

        server = http.server.ThreadingHTTPServer(("127.0.0.1", 0), Handler)
        threading.Thread(target=server.serve_forever, daemon=True).start()
        self.addCleanup(server.server_close)
        self.addCleanup(server.shutdown)

        host = f"http://127.0.0.1:{server.server_port}"
        with (
            patch("frigate.plus.PLUS_API_HOST", host),
            patch.dict(os.environ, {PLUS_ENV_VAR: TEST_PLUS_KEY}),
        ):
            self.api = PlusApi()

    def _api_hits(self) -> list[str]:
        return [hit for hit in self.hits if hit != "GET /v1/auth/token"]

    def test_a_429_is_raised_without_retrying(self):
        for call in (
            lambda: self.api.get_models(),
            lambda: self.api.add_annotation("img", [0, 0, 1, 1], "person"),
            lambda: self.api._post("image/create", {}),
        ):
            with self.subTest(call=call):
                self.hits.clear()
                self.api._rate_limited_until = None
                start = time.monotonic()

                with self.assertRaises(PlusRateLimitError) as ctx:
                    call()

                self.assertEqual(ctx.exception.retry_after, 30)
                self.assertEqual(len(self._api_hits()), 1)
                self.assertLess(time.monotonic() - start, 5)

    def test_requests_are_refused_locally_until_retry_after_passes(self):
        with self.assertRaises(PlusRateLimitError):
            self.api.get_models()

        self.assertAlmostEqual(self.api.rate_limit_remaining(), 30, delta=1)
        self.hits.clear()

        with self.assertRaises(PlusRateLimitError) as ctx:
            self.api.get_model_info("abc")

        self.assertAlmostEqual(ctx.exception.retry_after, 30, delta=1)
        self.assertEqual(self.hits, [])

        # once the wait has passed, requests go to the server again
        self.api._rate_limited_until = time.time() - 1
        self.status = 200

        self.assertEqual(self.api.get_model_info("abc"), {})
        self.assertIsNone(self.api.rate_limit_remaining())

    def test_a_shorter_wait_arriving_later_keeps_the_longer_one(self):
        # two requests in flight are both refused, and the reply with the
        # longer wait is handled first
        self.api._note_rate_limit(120)
        self.api._note_rate_limit(10)

        self.assertAlmostEqual(self.api.rate_limit_remaining(), 120, delta=1)

        # a longer wait still extends it
        self.api._note_rate_limit(300)

        self.assertAlmostEqual(self.api.rate_limit_remaining(), 300, delta=1)

    def test_concurrent_replies_keep_the_longest_wait(self):
        waits = list(range(1, 201))
        threads = [
            threading.Thread(target=self.api._note_rate_limit, args=(wait,))
            for wait in waits
        ]

        with patch("frigate.plus.logger"):
            for thread in threads:
                thread.start()
            for thread in threads:
                thread.join()

        self.assertAlmostEqual(self.api.rate_limit_remaining(), max(waits), delta=1)

    def test_the_client_can_be_sent_to_a_worker_process(self):
        # worker processes start from the forkserver, which pickles the
        # config and the Frigate+ client it holds
        self.api._note_rate_limit(60)

        copy = pickle.loads(pickle.dumps(self.api))

        self.assertAlmostEqual(copy.rate_limit_remaining(), 60, delta=1)
        copy._note_rate_limit(120)
        self.assertAlmostEqual(copy.rate_limit_remaining(), 120, delta=1)

    def test_a_429_without_retry_after_is_not_remembered(self):
        self.headers = {}

        with self.assertRaises(PlusRateLimitError) as ctx:
            self.api.get_models()

        self.assertIsNone(ctx.exception.retry_after)
        self.assertIsNone(self.api.rate_limit_remaining())

    def test_a_rate_limited_token_refresh(self):
        self.api._token_data = {}

        with patch.object(
            self.api._session,
            "get",
            return_value=MagicMock(status_code=429, headers={"Retry-After": "60"}),
        ):
            with self.assertRaises(PlusRateLimitError) as ctx:
                self.api.get_models()

        self.assertEqual(ctx.exception.retry_after, 60)
        self.assertAlmostEqual(self.api.rate_limit_remaining(), 60, delta=1)


if __name__ == "__main__":
    unittest.main(verbosity=2)
