"""Smoke tests for GenAI chat providers.

Each provider's ``chat_with_tools_stream`` is driven with a canned "test
response" so the two conversion layers are exercised without any network:

  1. Frigate (OpenAI-style) messages -> provider-native request format
  2. provider-native response -> Frigate ``("kind", value)`` stream events

These guard against regressions such as tool-call arguments arriving as raw
strings instead of dicts (which crash the ``ToolCall`` model), and multimodal
user content (a list of text/image parts, as injected by ``get_live_context``)
crashing message conversion.
"""

import asyncio
import base64
import json
import unittest
from types import SimpleNamespace
from unittest.mock import AsyncMock, MagicMock, patch

from frigate.config import GenAIConfig, GenAIProviderEnum
from frigate.genai import PROVIDERS, load_providers

load_providers()

# A minimal but valid JPEG data URI, mirroring what get_live_context injects.
_TINY_JPEG = base64.b64encode(b"\xff\xd8\xff\xd9").decode("ascii")
_IMAGE_DATA_URI = f"data:image/jpeg;base64,{_TINY_JPEG}"

# Conversation ending in a multimodal user message (text + live image), the
# exact shape the chat endpoint builds after a get_live_context tool result.
MULTIMODAL_MESSAGES = [
    {"role": "system", "content": "You are a test assistant."},
    {"role": "user", "content": "what do you see on the front camera?"},
    {
        "role": "assistant",
        "content": "",
        "tool_calls": [
            {
                "id": "call_1",
                "type": "function",
                "function": {
                    "name": "get_live_context",
                    "arguments": json.dumps({"camera": "front"}),
                },
            }
        ],
    },
    {
        "role": "tool",
        "tool_call_id": "call_1",
        "name": "get_live_context",
        "content": json.dumps({"camera": "front"}),
    },
    {
        "role": "user",
        "content": [
            {
                "type": "text",
                "text": "Here is the current live image from camera 'front'.",
            },
            {"type": "image_url", "image_url": {"url": _IMAGE_DATA_URI}},
        ],
    },
]

SIMPLE_MESSAGES = [
    {"role": "system", "content": "You are a test assistant."},
    {"role": "user", "content": "hello"},
]

TOOLS = [
    {
        "type": "function",
        "function": {
            "name": "search_objects",
            "description": "Search tracked objects",
            "parameters": {
                "type": "object",
                "properties": {"label": {"type": "string"}},
            },
        },
    }
]


def _make_client(provider: str, **cfg_overrides):
    """Build a provider client offline (no model validation, no network)."""
    cfg = GenAIConfig(provider=provider, **cfg_overrides)
    cls = PROVIDERS[GenAIProviderEnum(provider)]
    return cls(cfg, timeout=5, validate_model=False)


def _collect(client, messages, tools=TOOLS):
    """Drain chat_with_tools_stream into a list of (kind, value) events."""

    async def _run():
        events = []
        async for event in client.chat_with_tools_stream(
            messages=messages, tools=tools, tool_choice="auto"
        ):
            events.append(event)
        return events

    return asyncio.run(_run())


def _final_message(events) -> dict:
    messages = [value for (kind, value) in events if kind == "message"]
    assert messages, f"stream produced no final message: {events}"
    return messages[-1]


def _assert_tool_args_are_dicts(final: dict) -> None:
    """Every returned tool call must expose arguments as a dict, never a string."""
    for tool_call in final.get("tool_calls") or []:
        assert isinstance(tool_call["arguments"], dict), (
            f"tool call arguments must be a dict, got "
            f"{type(tool_call['arguments']).__name__}: {tool_call['arguments']!r}"
        )


# ---------------------------------------------------------------------------
# OpenAI
# ---------------------------------------------------------------------------
def _openai_tc(index, id=None, name=None, arguments=None):
    return SimpleNamespace(
        index=index,
        id=id,
        function=SimpleNamespace(name=name, arguments=arguments),
    )


def _openai_chunk(content=None, tool_calls=None, finish_reason=None, usage=None):
    delta = SimpleNamespace(
        content=content,
        tool_calls=tool_calls,
        reasoning_content=None,
        reasoning=None,
    )
    choice = SimpleNamespace(delta=delta, finish_reason=finish_reason)
    return SimpleNamespace(choices=[choice], usage=usage)


class TestOpenAIProvider(unittest.TestCase):
    def _client(self):
        return _make_client(
            "openai", model="gpt-4o", api_key="k", base_url="http://localhost:9999/v1"
        )

    def test_stream_tool_call_arguments_are_dict(self):
        # Arguments arrive split across chunks, as the real API streams them.
        chunks = [
            _openai_chunk(
                tool_calls=[
                    _openai_tc(0, id="c1", name="search_objects", arguments='{"label":')
                ]
            ),
            _openai_chunk(tool_calls=[_openai_tc(0, arguments=' "person"}')]),
            _openai_chunk(finish_reason="tool_calls"),
        ]
        client = self._client()
        client.provider.chat.completions.create = MagicMock(return_value=iter(chunks))

        final = _final_message(_collect(client, SIMPLE_MESSAGES))
        self.assertEqual(final["finish_reason"], "tool_calls")
        self.assertEqual(len(final["tool_calls"]), 1)
        _assert_tool_args_are_dicts(final)
        self.assertEqual(final["tool_calls"][0]["arguments"], {"label": "person"})

    def test_stream_content_response(self):
        chunks = [
            _openai_chunk(content="hel"),
            _openai_chunk(content="lo"),
            _openai_chunk(finish_reason="stop"),
        ]
        client = self._client()
        client.provider.chat.completions.create = MagicMock(return_value=iter(chunks))

        events = _collect(client, SIMPLE_MESSAGES)
        deltas = [v for (k, v) in events if k == "content_delta"]
        self.assertEqual("".join(deltas), "hello")
        self.assertEqual(_final_message(events)["content"], "hello")

    def test_multimodal_message_does_not_crash(self):
        client = self._client()
        client.provider.chat.completions.create = MagicMock(
            return_value=iter([_openai_chunk(content="ok", finish_reason="stop")])
        )
        # Passing the OpenAI-native multimodal list through must not raise.
        final = _final_message(_collect(client, MULTIMODAL_MESSAGES))
        self.assertEqual(final["content"], "ok")


# ---------------------------------------------------------------------------
# Gemini
# ---------------------------------------------------------------------------
def _gemini_part(text=None, thought=False, function_call=None, thought_signature=None):
    return SimpleNamespace(
        text=text,
        thought=thought,
        function_call=function_call,
        thought_signature=thought_signature,
    )


def _gemini_chunk(parts, finish_reason=None, usage_metadata=None):
    candidate = SimpleNamespace(
        content=SimpleNamespace(parts=parts), finish_reason=finish_reason
    )
    return SimpleNamespace(candidates=[candidate], usage_metadata=usage_metadata)


def _gemini_stream(chunks):
    async def _agen(*args, **kwargs):
        for chunk in chunks:
            yield chunk

    return _agen


class TestGeminiProvider(unittest.TestCase):
    def _client(self):
        return _make_client("gemini", model="gemini-2.5-flash", api_key="k")

    def _patch_stream(self, client, chunks):
        client.provider = MagicMock()
        client.provider.aio.models.generate_content_stream = AsyncMock(
            side_effect=_gemini_stream(chunks)
        )

    def test_stream_parallel_tool_calls_stay_separate_dicts(self):
        # Regression: Gemini streams complete function calls. Two calls to the
        # same tool must NOT be merged into one concatenated arguments string.
        from google.genai.types import FinishReason

        chunks = [
            _gemini_chunk(
                parts=[
                    _gemini_part(
                        function_call=SimpleNamespace(
                            name="search_objects", args={"label": "person"}
                        )
                    ),
                    _gemini_part(
                        function_call=SimpleNamespace(
                            name="search_objects", args={"limit": 1}
                        )
                    ),
                ],
                finish_reason=FinishReason.STOP,
            ),
        ]
        client = self._client()
        self._patch_stream(client, chunks)

        final = _final_message(_collect(client, SIMPLE_MESSAGES))
        self.assertEqual(final["finish_reason"], "tool_calls")
        self.assertEqual(len(final["tool_calls"]), 2)
        _assert_tool_args_are_dicts(final)
        self.assertEqual(final["tool_calls"][0]["arguments"], {"label": "person"})
        self.assertEqual(final["tool_calls"][1]["arguments"], {"limit": 1})

    def test_stream_content_response(self):
        from google.genai.types import FinishReason

        chunks = [
            _gemini_chunk(parts=[_gemini_part(text="hel")]),
            _gemini_chunk(
                parts=[_gemini_part(text="lo")], finish_reason=FinishReason.STOP
            ),
        ]
        client = self._client()
        self._patch_stream(client, chunks)

        events = _collect(client, SIMPLE_MESSAGES)
        deltas = [v for (k, v) in events if k == "content_delta"]
        self.assertEqual("".join(deltas), "hello")
        self.assertEqual(_final_message(events)["content"], "hello")

    def test_multimodal_message_converts_without_crash(self):
        # Regression: a user message with list content (text + image_url) used
        # to be handed to Part.from_text(text=<list>) and raise ValidationError.
        from google.genai.types import FinishReason

        client = self._client()
        self._patch_stream(
            client,
            [
                _gemini_chunk(
                    parts=[_gemini_part(text="ok")], finish_reason=FinishReason.STOP
                )
            ],
        )
        final = _final_message(_collect(client, MULTIMODAL_MESSAGES))
        self.assertEqual(final["content"], "ok")


# ---------------------------------------------------------------------------
# Ollama
# ---------------------------------------------------------------------------
class TestOllamaProvider(unittest.TestCase):
    def _client(self):
        return _make_client("ollama", model="llama3", base_url="http://localhost:9999")

    def _run_with_response(self, client, response, messages):
        # Ollama uses a non-streaming call when tools are present, via an
        # internally-constructed async client.
        fake_async = MagicMock()
        fake_async.chat = AsyncMock(return_value=response)
        with patch(
            "frigate.genai.plugins.ollama.OllamaAsyncClient",
            return_value=fake_async,
        ):
            return _collect(client, messages)

    def test_tool_call_arguments_are_dict(self):
        response = {
            "message": {
                "content": "",
                "tool_calls": [
                    {
                        "function": {
                            "name": "search_objects",
                            "arguments": {"label": "person"},
                        }
                    }
                ],
            },
            "done": True,
            "done_reason": "stop",
            "eval_count": 5,
            "prompt_eval_count": 3,
            "eval_duration": 1_000_000,
        }
        client = self._client()
        final = _final_message(
            self._run_with_response(client, response, SIMPLE_MESSAGES)
        )
        self.assertEqual(final["finish_reason"], "tool_calls")
        _assert_tool_args_are_dicts(final)
        self.assertEqual(final["tool_calls"][0]["arguments"], {"label": "person"})

    def test_multimodal_message_normalizes_image(self):
        # Ollama needs content as a string with images pulled into a separate
        # field; the normalizer must extract both without crashing.
        response = {
            "message": {"content": "ok"},
            "done": True,
            "done_reason": "stop",
        }
        client = self._client()
        final = _final_message(
            self._run_with_response(client, response, MULTIMODAL_MESSAGES)
        )
        self.assertEqual(final["content"], "ok")

    def test_normalize_multimodal_content(self):
        from frigate.genai.plugins.ollama import _normalize_multimodal_content

        text, images = _normalize_multimodal_content(MULTIMODAL_MESSAGES[-1]["content"])
        self.assertIn("live image", text)
        self.assertEqual(len(images), 1)
        self.assertEqual(images[0], b"\xff\xd8\xff\xd9")


# ---------------------------------------------------------------------------
# llama.cpp
# ---------------------------------------------------------------------------
class _FakeStreamResponse:
    def __init__(self, lines):
        self._lines = lines

    def raise_for_status(self):
        return None

    async def aiter_lines(self):
        for line in self._lines:
            yield line


class _FakeStreamCtx:
    def __init__(self, lines):
        self._resp = _FakeStreamResponse(lines)

    async def __aenter__(self):
        return self._resp

    async def __aexit__(self, *exc):
        return False


class _FakeAsyncClient:
    def __init__(self, lines):
        self._lines = lines

    async def __aenter__(self):
        return self

    async def __aexit__(self, *exc):
        return False

    def stream(self, method, url, json=None, headers=None):
        return _FakeStreamCtx(self._lines)


class TestLlamaCppProvider(unittest.TestCase):
    def _client(self):
        return _make_client("llamacpp", model="m", base_url="http://localhost:9999")

    def _run_with_lines(self, client, lines, messages):
        with patch(
            "frigate.genai.plugins.llama_cpp.httpx.AsyncClient",
            return_value=_FakeAsyncClient(lines),
        ):
            return _collect(client, messages)

    def test_stream_tool_call_arguments_are_dict(self):
        lines = [
            "data: "
            + json.dumps(
                {
                    "choices": [
                        {
                            "delta": {
                                "tool_calls": [
                                    {
                                        "index": 0,
                                        "id": "c1",
                                        "function": {
                                            "name": "search_objects",
                                            "arguments": '{"label":',
                                        },
                                    }
                                ]
                            }
                        }
                    ]
                }
            ),
            "data: "
            + json.dumps(
                {
                    "choices": [
                        {
                            "delta": {
                                "tool_calls": [
                                    {
                                        "index": 0,
                                        "function": {"arguments": ' "person"}'},
                                    }
                                ]
                            }
                        }
                    ]
                }
            ),
            "data: "
            + json.dumps({"choices": [{"delta": {}, "finish_reason": "tool_calls"}]}),
            "data: [DONE]",
        ]
        client = self._client()
        final = _final_message(self._run_with_lines(client, lines, SIMPLE_MESSAGES))
        self.assertEqual(final["finish_reason"], "tool_calls")
        _assert_tool_args_are_dicts(final)
        self.assertEqual(final["tool_calls"][0]["arguments"], {"label": "person"})

    def test_stream_content_response(self):
        lines = [
            "data: " + json.dumps({"choices": [{"delta": {"content": "hel"}}]}),
            "data: " + json.dumps({"choices": [{"delta": {"content": "lo"}}]}),
            "data: "
            + json.dumps({"choices": [{"delta": {}, "finish_reason": "stop"}]}),
            "data: [DONE]",
        ]
        client = self._client()
        events = self._run_with_lines(client, lines, SIMPLE_MESSAGES)
        deltas = [v for (k, v) in events if k == "content_delta"]
        self.assertEqual("".join(deltas), "hello")
        self.assertEqual(_final_message(events)["content"], "hello")

    def test_multimodal_message_does_not_crash(self):
        lines = [
            "data: " + json.dumps({"choices": [{"delta": {"content": "ok"}}]}),
            "data: "
            + json.dumps({"choices": [{"delta": {}, "finish_reason": "stop"}]}),
            "data: [DONE]",
        ]
        client = self._client()
        final = _final_message(self._run_with_lines(client, lines, MULTIMODAL_MESSAGES))
        self.assertEqual(final["content"], "ok")

    def _validated_client(self, server_context_size, provider_options=None):
        """Build a client as if the server reported the given context size."""
        cfg = GenAIConfig(
            provider="llamacpp",
            model="m",
            base_url="http://localhost:9999",
            provider_options=provider_options or {},
        )
        info = {
            "context_size": server_context_size,
            "supports_vision": False,
            "supports_audio": False,
            "supports_tools": False,
            "supports_reasoning": False,
            "media_marker": "<__media__>",
        }
        cls = PROVIDERS[GenAIProviderEnum.llamacpp]
        with patch.object(cls, "_get_model_info", return_value=info):
            return cls(cfg, timeout=5)

    def test_server_context_size_used_without_override(self):
        client = self._validated_client(4096)
        self.assertEqual(client.get_context_size(), 4096)

    def test_provider_options_context_size_overrides_server(self):
        client = self._validated_client(4096, {"context_size": 32768})
        self.assertEqual(client.get_context_size(), 32768)


if __name__ == "__main__":
    unittest.main()
