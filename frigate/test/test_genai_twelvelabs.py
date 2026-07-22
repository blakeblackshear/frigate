"""Tests for the TwelveLabs GenAI provider (Marengo embeddings)."""

import io
import os
import unittest
from unittest.mock import MagicMock, patch

import numpy as np

from frigate.config.camera.genai import (
    GenAIConfig,
    GenAIProviderEnum,
    GenAIRoleEnum,
)
from frigate.genai.plugins.twelvelabs import DEFAULT_MODEL, TwelveLabsClient


def _make_config(model: str = "") -> GenAIConfig:
    return GenAIConfig(
        provider=GenAIProviderEnum.twelvelabs,
        api_key="test-key",
        model=model,
        roles=[GenAIRoleEnum.embeddings],
    )


def _response(key: str, values):
    """Mimic the Marengo REST JSON: ``{<key>: {segments: [{float: [...]}]}}``."""
    resp = MagicMock()
    resp.raise_for_status.return_value = None
    resp.json.return_value = {key: {"segments": [{"float": values}]}}
    return resp


class TestTwelveLabsEmbedNoNetwork(unittest.TestCase):
    """Unit tests with ``requests`` mocked — no network access, no SDK."""

    def _client(self) -> TwelveLabsClient:
        client = TwelveLabsClient.__new__(TwelveLabsClient)
        client.genai_config = _make_config()
        client.timeout = 120
        client.provider = "test-key"
        return client

    @patch("frigate.genai.plugins.twelvelabs.requests.post")
    def test_text_embedding_returns_vector(self, post):
        post.return_value = _response("text_embedding", [0.1, 0.2, 0.3])

        out = self._client().embed(texts=["a person walking a dog"])

        self.assertEqual(len(out), 1)
        self.assertIsInstance(out[0], np.ndarray)
        self.assertEqual(out[0].dtype, np.float32)
        np.testing.assert_allclose(out[0], [0.1, 0.2, 0.3], rtol=1e-6)

        _, kwargs = post.call_args
        self.assertEqual(kwargs["files"]["model_name"][1], DEFAULT_MODEL)
        self.assertEqual(kwargs["files"]["text"][1], "a person walking a dog")
        self.assertEqual(kwargs["headers"]["x-api-key"], "test-key")
        self.assertNotIn("image_file", kwargs["files"])

    @patch("frigate.genai.plugins.twelvelabs.requests.post")
    def test_image_embedding_uses_image_file(self, post):
        post.return_value = _response("image_embedding", [1.0, 2.0])

        out = self._client().embed(images=[b"\xff\xd8\xff jpeg bytes"])

        self.assertEqual(len(out), 1)
        _, kwargs = post.call_args
        self.assertEqual(kwargs["files"]["image_file"][1], b"\xff\xd8\xff jpeg bytes")
        self.assertNotIn("text", kwargs["files"])

    @patch("frigate.genai.plugins.twelvelabs.requests.post")
    def test_custom_model_name_is_used(self, post):
        post.return_value = _response("text_embedding", [0.0])

        client = self._client()
        client.genai_config = _make_config(model="marengo-custom")
        client.embed(texts=["x"])

        _, kwargs = post.call_args
        self.assertEqual(kwargs["files"]["model_name"][1], "marengo-custom")

    @patch("frigate.genai.plugins.twelvelabs.requests.post")
    def test_empty_segments_are_skipped(self, post):
        resp = MagicMock()
        resp.raise_for_status.return_value = None
        resp.json.return_value = {"text_embedding": {"segments": []}}
        post.return_value = resp

        self.assertEqual(self._client().embed(texts=["x"]), [])

    @patch("frigate.genai.plugins.twelvelabs.requests.post")
    def test_api_error_is_swallowed(self, post):
        post.side_effect = RuntimeError("boom")

        self.assertEqual(self._client().embed(texts=["x"]), [])

    def test_no_provider_returns_empty(self):
        client = self._client()
        client.provider = None
        self.assertEqual(client.embed(texts=["x"]), [])

    def test_no_inputs_returns_empty(self):
        self.assertEqual(self._client().embed(), [])


@unittest.skipUnless(
    os.environ.get("TWELVELABS_API_KEY"),
    "TWELVELABS_API_KEY not set; skipping live TwelveLabs API test",
)
class TestTwelveLabsEmbedLive(unittest.TestCase):
    """Live smoke test against the real TwelveLabs API (Marengo)."""

    def _client(self) -> TwelveLabsClient:
        config = _make_config()
        config.api_key = os.environ["TWELVELABS_API_KEY"]
        return TwelveLabsClient(config)

    def test_text_embedding_dim(self):
        out = self._client().embed(texts=["a delivery person at the front door"])
        self.assertEqual(len(out), 1)
        self.assertEqual(out[0].shape, (512,))

    def test_image_embedding_dim(self):
        from PIL import Image

        arr = (np.random.rand(224, 224, 3) * 255).astype("uint8")
        buf = io.BytesIO()
        Image.fromarray(arr, "RGB").save(buf, format="JPEG")

        out = self._client().embed(images=[buf.getvalue()])
        self.assertEqual(len(out), 1)
        self.assertEqual(out[0].shape, (512,))


if __name__ == "__main__":
    unittest.main()
