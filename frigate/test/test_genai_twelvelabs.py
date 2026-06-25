"""Tests for the TwelveLabs GenAI provider (Marengo embeddings)."""

import io
import os
import unittest
from unittest.mock import MagicMock

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


def _segment(values):
    """Mimic the SDK BaseSegment shape (a `float_` list per segment)."""
    seg = MagicMock()
    seg.float_ = values
    return seg


class TestTwelveLabsEmbedNoNetwork(unittest.TestCase):
    """Unit tests with the SDK client mocked — no network access."""

    def _client_with_provider(self, provider) -> TwelveLabsClient:
        client = TwelveLabsClient.__new__(TwelveLabsClient)
        client.genai_config = _make_config()
        client.timeout = 120
        client.provider = provider
        return client

    def test_text_embedding_returns_vector(self):
        provider = MagicMock()
        response = MagicMock()
        response.text_embedding.segments = [_segment([0.1, 0.2, 0.3])]
        provider.embed.create.return_value = response

        client = self._client_with_provider(provider)
        out = client.embed(texts=["a person walking a dog"])

        self.assertEqual(len(out), 1)
        self.assertIsInstance(out[0], np.ndarray)
        self.assertEqual(out[0].dtype, np.float32)
        np.testing.assert_allclose(out[0], [0.1, 0.2, 0.3], rtol=1e-6)

        _, kwargs = provider.embed.create.call_args
        self.assertEqual(kwargs["model_name"], DEFAULT_MODEL)
        self.assertEqual(kwargs["text"], "a person walking a dog")

    def test_image_embedding_uses_image_file(self):
        provider = MagicMock()
        response = MagicMock()
        response.image_embedding.segments = [_segment([1.0, 2.0])]
        provider.embed.create.return_value = response

        client = self._client_with_provider(provider)
        out = client.embed(images=[b"\xff\xd8\xff jpeg bytes"])

        self.assertEqual(len(out), 1)
        _, kwargs = provider.embed.create.call_args
        self.assertEqual(kwargs["image_file"], b"\xff\xd8\xff jpeg bytes")
        self.assertNotIn("text", kwargs)

    def test_custom_model_name_is_used(self):
        provider = MagicMock()
        response = MagicMock()
        response.text_embedding.segments = [_segment([0.0])]
        provider.embed.create.return_value = response

        client = self._client_with_provider(provider)
        client.genai_config = _make_config(model="marengo-custom")
        client.embed(texts=["x"])

        _, kwargs = provider.embed.create.call_args
        self.assertEqual(kwargs["model_name"], "marengo-custom")

    def test_empty_segments_are_skipped(self):
        provider = MagicMock()
        response = MagicMock()
        response.text_embedding = None
        provider.embed.create.return_value = response

        client = self._client_with_provider(provider)
        self.assertEqual(client.embed(texts=["x"]), [])

    def test_api_error_is_swallowed(self):
        provider = MagicMock()
        provider.embed.create.side_effect = RuntimeError("boom")

        client = self._client_with_provider(provider)
        self.assertEqual(client.embed(texts=["x"]), [])

    def test_no_provider_returns_empty(self):
        client = self._client_with_provider(None)
        self.assertEqual(client.embed(texts=["x"]), [])

    def test_no_inputs_returns_empty(self):
        client = self._client_with_provider(MagicMock())
        self.assertEqual(client.embed(), [])


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
