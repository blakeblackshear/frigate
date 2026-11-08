"""Request-local event correlation on OpenAI object descriptions."""

import copy
import json
import unittest
from types import SimpleNamespace
from unittest.mock import patch

import httpx
from openai import OpenAI

from frigate.genai.plugins.openai import OpenAIClient
from frigate.models import Event


class TestObjectDescriptionEventHeader(unittest.TestCase):
    def setUp(self):
        self.requests = []
        self.content = "A person enters."
        self.event = Event(id="existing-event-id")
        self.sdk = OpenAI(
            api_key="fixture-only",
            base_url="http://provider.invalid/v1",
            http_client=httpx.Client(transport=httpx.MockTransport(self.respond)),
            max_retries=0,
        )
        self.addCleanup(self.sdk.close)
        self.client = OpenAIClient.__new__(OpenAIClient)
        self.client.provider = self.sdk
        self.client.timeout = 5
        self.client.genai_config = SimpleNamespace(
            model="fixture",
            provider_options={},
            runtime_options={"extra_headers": {"X-Custom": "preserved"}},
        )

    def respond(self, request):
        self.requests.append(request)
        return httpx.Response(
            200,
            json={
                "id": "chatcmpl-fixture",
                "object": "chat.completion",
                "created": 0,
                "model": "fixture",
                "choices": [
                    {
                        "index": 0,
                        "message": {"role": "assistant", "content": self.content},
                        "finish_reason": "stop",
                    }
                ],
            },
        )

    def describe(self):
        with patch(
            "frigate.genai.build_object_description_prompt",
            return_value="Describe the object.",
        ):
            return self.client.generate_object_description(
                SimpleNamespace(), [b"fixture-image"], self.event
            )

    def test_normal_and_blank_completion_preserve_wire_event_identity(self):
        original = copy.deepcopy(self.client.genai_config.runtime_options)
        for content, expected in [("A person enters.", "A person enters."), ("", None)]:
            with self.subTest(content=content):
                self.content = content
                self.assertEqual(self.describe(), expected)
                request = self.requests[-1]
                self.assertEqual(request.headers["X-Frigate-Event-ID"], self.event.id)
                self.assertEqual(request.headers["X-Custom"], "preserved")
                body = json.loads(request.content)
                self.assertNotIn("event_id", body)
                self.assertNotIn("extra_headers", body)
        self.assertEqual(self.client.genai_config.runtime_options, original)

    def test_existing_header_is_overridden_case_insensitively_for_this_request(self):
        configured = {"x-frigate-event-id": "configured-value", "X-Custom": "preserved"}
        self.client.genai_config.runtime_options["extra_headers"] = configured
        self.describe()
        self.assertEqual(
            self.requests[-1].headers.get_list("X-Frigate-Event-ID"), [self.event.id]
        )
        self.assertEqual(configured["x-frigate-event-id"], "configured-value")

    def test_review_and_chat_do_not_inherit_the_object_header(self):
        self.describe()
        with patch(
            "frigate.genai.build_review_summary_prompt",
            return_value="Summarize the reviews.",
        ):
            self.client.generate_review_summary(0, 1, [], None, False)
        self.client.chat_with_tools([{"role": "user", "content": "A chat request."}])
        self.assertEqual(len(self.requests), 3)
        for request in self.requests[1:]:
            self.assertNotIn("X-Frigate-Event-ID", request.headers)

    def test_null_configured_headers_accept_the_request_header(self):
        self.client.genai_config.runtime_options["extra_headers"] = None
        self.describe()
        self.assertEqual(self.requests[-1].headers["X-Frigate-Event-ID"], self.event.id)
