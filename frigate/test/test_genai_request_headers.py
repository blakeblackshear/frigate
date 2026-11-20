"""Per-request headers reach every GenAI provider's description request.

Frigate's own ids go in request headers so a proxy in front of the model can
correlate a request without reading or rewriting its body.
"""

import copy
import unittest
from types import SimpleNamespace
from unittest.mock import MagicMock, patch

from frigate.config import GenAIConfig, GenAIProviderEnum
from frigate.genai import PROVIDERS, load_providers

load_providers()

EVENT_HEADER = {"X-Frigate-Event-ID": "1700000000.0-abc123"}


def _make_client(provider: str, **cfg_overrides):
    cfg = GenAIConfig(provider=provider, **cfg_overrides)
    cls = PROVIDERS[GenAIProviderEnum(provider)]
    return cls(cfg, timeout=5, validate_model=False)


def _openai_result(content: str = "ok"):
    message = SimpleNamespace(content=content, reasoning_content=None)
    return SimpleNamespace(choices=[SimpleNamespace(message=message)])


class TestOpenAIRequestHeaders(unittest.TestCase):
    def _client(self, **cfg):
        client = _make_client(
            "openai",
            model="gpt-4o",
            api_key="k",
            base_url="http://localhost:9999/v1",
            **cfg,
        )
        client.provider = MagicMock()
        client.provider.chat.completions.create.return_value = _openai_result()
        return client

    def test_headers_are_sent_with_the_request(self):
        client = self._client()
        client._send("prompt", [b"a"], extra_headers=EVENT_HEADER)
        params = client.provider.chat.completions.create.call_args.kwargs
        self.assertEqual(params["extra_headers"], EVENT_HEADER)

    def test_configured_headers_are_kept(self):
        client = self._client(runtime_options={"extra_headers": {"X-Custom": "kept"}})
        client._send("prompt", [b"a"], extra_headers=EVENT_HEADER)
        params = client.provider.chat.completions.create.call_args.kwargs
        self.assertEqual(params["extra_headers"], {"X-Custom": "kept", **EVENT_HEADER})
        self.assertEqual(
            client.genai_config.runtime_options["extra_headers"], {"X-Custom": "kept"}
        )

    def test_request_header_replaces_a_configured_one_of_any_case(self):
        client = self._client(
            runtime_options={"extra_headers": {"x-frigate-event-id": "configured"}}
        )
        client._send("prompt", [b"a"], extra_headers=EVENT_HEADER)
        params = client.provider.chat.completions.create.call_args.kwargs
        self.assertEqual(params["extra_headers"], EVENT_HEADER)

    def test_no_headers_leaves_the_request_unchanged(self):
        client = self._client()
        client._send("prompt", [b"a"])
        params = client.provider.chat.completions.create.call_args.kwargs
        self.assertNotIn("extra_headers", params)


class TestLlamaCppRequestHeaders(unittest.TestCase):
    def test_headers_are_merged_with_auth(self):
        client = _make_client(
            "llamacpp", model="m", api_key="k", base_url="http://localhost:9999"
        )
        response = MagicMock(status_code=200)
        response.json.return_value = {"choices": [{"message": {"content": "ok"}}]}
        with patch(
            "frigate.genai.plugins.llama_cpp.requests.post", return_value=response
        ) as post:
            client._send("prompt", [b"a"], extra_headers=EVENT_HEADER)
        self.assertEqual(
            post.call_args.kwargs["headers"],
            {"Authorization": "Bearer k", **EVENT_HEADER},
        )


class TestOllamaRequestHeaders(unittest.TestCase):
    def _client(self):
        client = _make_client(
            "ollama", model="llama3", api_key="k", base_url="http://localhost:9999"
        )
        client.provider = MagicMock()
        client._supports_thinking_cache = False
        return client

    def test_request_with_headers_uses_its_own_client(self):
        client = self._client()
        own = MagicMock()
        own.chat.return_value = {"message": {"content": "ok"}, "done": True}
        with patch(
            "frigate.genai.plugins.ollama.ApiClient", return_value=own
        ) as api_client:
            self.assertEqual(
                client._send("prompt", [b"a"], extra_headers=EVENT_HEADER), "ok"
            )
        self.assertEqual(
            api_client.call_args.kwargs["headers"],
            {"Authorization": "Bearer k", **EVENT_HEADER},
        )
        own.chat.assert_called_once()
        own.close.assert_called_once()
        client.provider.chat.assert_not_called()

    def test_request_without_headers_uses_the_shared_client(self):
        client = self._client()
        client.provider.chat.return_value = {"message": {"content": "ok"}, "done": True}
        with patch("frigate.genai.plugins.ollama.ApiClient") as api_client:
            client._send("prompt", [b"a"])
        api_client.assert_not_called()
        client.provider.chat.assert_called_once()


class TestGeminiRequestHeaders(unittest.TestCase):
    def test_headers_go_in_the_request_http_options(self):
        client = _make_client("gemini", model="gemini-2.5-flash", api_key="k")
        client.provider = MagicMock()
        client.provider.models.generate_content.return_value = SimpleNamespace(
            text="ok"
        )
        client._send("prompt", [b"a"], extra_headers=EVENT_HEADER)
        config = client.provider.models.generate_content.call_args.kwargs["config"]
        self.assertEqual(config.http_options.headers, EVENT_HEADER)

    def test_no_headers_sets_no_http_options(self):
        client = _make_client("gemini", model="gemini-2.5-flash", api_key="k")
        client.provider = MagicMock()
        client.provider.models.generate_content.return_value = SimpleNamespace(
            text="ok"
        )
        client._send("prompt", [b"a"])
        config = client.provider.models.generate_content.call_args.kwargs["config"]
        self.assertIsNone(config.http_options)

    def test_runtime_http_options_and_headers_are_preserved(self):
        for extra_headers in [None, EVENT_HEADER]:
            with self.subTest(extra_headers=extra_headers):
                options = {
                    "http_options": {
                        "timeout": 5000,
                        "headers": {"X-Custom": "kept", "x-frigate-event-id": "old"},
                    }
                }
                original = copy.deepcopy(options)
                client = _make_client(
                    "gemini",
                    model="gemini-2.5-flash",
                    api_key="k",
                    runtime_options=options,
                )
                client.provider = MagicMock()
                client.provider.models.generate_content.return_value = SimpleNamespace(
                    text="ok"
                )
                self.assertEqual(
                    client._send("prompt", [b"a"], extra_headers=extra_headers), "ok"
                )
                config = client.provider.models.generate_content.call_args.kwargs[
                    "config"
                ]
                self.assertEqual(config.http_options.timeout, 5000)
                expected = (
                    {"X-Custom": "kept", **EVENT_HEADER}
                    if extra_headers
                    else original["http_options"]["headers"]
                )
                self.assertEqual(config.http_options.headers, expected)
                self.assertEqual(client.genai_config.runtime_options, original)


class TestObjectDescriptionEventHeader(unittest.TestCase):
    def test_object_description_sends_the_event_id_header(self):
        client = _make_client(
            "openai", model="gpt-4o", api_key="k", send_request_ids=True
        )
        client._send = MagicMock(return_value="A person walks by.")
        event = SimpleNamespace(id="1700000000.0-abc123")
        with patch(
            "frigate.genai.build_object_description_prompt", return_value="prompt"
        ):
            client.generate_object_description(SimpleNamespace(), [b"a"], event)
        self.assertEqual(client._send.call_args.kwargs["extra_headers"], EVENT_HEADER)

    def test_object_header_is_disabled_by_default_or_explicitly(self):
        for options in [{}, {"send_request_ids": False}]:
            with self.subTest(options=options):
                client = _make_client("openai", model="gpt-4o", api_key="k", **options)
                client._send = MagicMock(return_value="A person walks by.")
                with patch(
                    "frigate.genai.build_object_description_prompt",
                    return_value="prompt",
                ):
                    client.generate_object_description(
                        SimpleNamespace(), [b"a"], SimpleNamespace(id="event-id")
                    )
                self.assertIsNone(client._send.call_args.kwargs["extra_headers"])


class TestReviewDescriptionReviewHeader(unittest.TestCase):
    def test_review_description_sends_the_review_id_header(self):
        client = _make_client(
            "openai", model="gpt-4o", api_key="k", send_request_ids=True
        )
        client._send = MagicMock(return_value=None)
        with patch(
            "frigate.genai.build_review_description_prompt", return_value="prompt"
        ):
            client.generate_review_description(
                {"id": "1700000000.0-rev123", "camera": "front"},
                [b"a"],
                [],
                None,
                False,
                "",
            )
        self.assertEqual(
            client._send.call_args.kwargs["extra_headers"],
            {"X-Frigate-Review-ID": "1700000000.0-rev123"},
        )

    def test_review_header_is_disabled_by_default_or_explicitly(self):
        for options in [{}, {"send_request_ids": False}]:
            with self.subTest(options=options):
                client = _make_client("openai", model="gpt-4o", api_key="k", **options)
                client._send = MagicMock(return_value=None)
                with patch(
                    "frigate.genai.build_review_description_prompt",
                    return_value="prompt",
                ):
                    client.generate_review_description(
                        {"id": "review-id", "camera": "front"},
                        [b"a"],
                        [],
                        None,
                        False,
                        "",
                    )
                self.assertIsNone(client._send.call_args.kwargs["extra_headers"])


if __name__ == "__main__":
    unittest.main()
