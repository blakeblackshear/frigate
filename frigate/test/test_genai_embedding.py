"""Tests for the GenAI semantic search embedding adapter."""

import unittest
from unittest.mock import MagicMock

import numpy as np

from frigate.embeddings.genai_embedding import EMBEDDING_DIM, GenAIEmbedding


class TestGenAIEmbedding(unittest.TestCase):
    def _client(self, embeddings):
        client = MagicMock()
        client.supports_embeddings = True
        client.ensure_provider.return_value = True
        client.embed.return_value = embeddings
        return client

    def test_truncates_and_normalizes_embedding(self):
        source = np.arange(1, 2049, dtype=np.float32)
        adapter = GenAIEmbedding(self._client([source]))

        result = adapter(["red car"], embedding_type="text")

        self.assertEqual(result[0].shape, (EMBEDDING_DIM,))
        self.assertEqual(result[0].dtype, np.float32)
        self.assertAlmostEqual(float(np.linalg.norm(result[0])), 1.0, places=6)
        expected = source[:EMBEDDING_DIM]
        expected /= np.linalg.norm(expected)
        np.testing.assert_allclose(result[0], expected)

    def test_rejects_incomplete_provider_response(self):
        adapter = GenAIEmbedding(self._client([]))

        with self.assertRaisesRegex(RuntimeError, "0 vectors for 1 inputs"):
            adapter(["red car"], embedding_type="text")

    def test_rejects_non_finite_embedding(self):
        adapter = GenAIEmbedding(
            self._client([np.full(EMBEDDING_DIM, np.nan, dtype=np.float32)])
        )

        with self.assertRaisesRegex(ValueError, "non-finite"):
            adapter(["red car"], embedding_type="text")

    def test_rejects_zero_embedding(self):
        adapter = GenAIEmbedding(
            self._client([np.zeros(EMBEDDING_DIM, dtype=np.float32)])
        )

        with self.assertRaisesRegex(ValueError, "zero vector"):
            adapter(["red car"], embedding_type="text")

    def test_pads_short_embedding_and_returns_contiguous_float32(self):
        adapter = GenAIEmbedding(self._client([np.array([3.0, 4.0], dtype=np.float64)]))

        result = adapter(["red car"], embedding_type="text")[0]

        self.assertEqual(result.shape, (EMBEDDING_DIM,))
        self.assertEqual(result.dtype, np.float32)
        self.assertTrue(result.flags.c_contiguous)
        np.testing.assert_allclose(result[:2], [0.6, 0.8])
        np.testing.assert_array_equal(result[2:], np.zeros(EMBEDDING_DIM - 2))

    def test_rejects_provider_without_embedding_support(self):
        client = self._client([])
        client.supports_embeddings = False

        with self.assertRaisesRegex(ValueError, "does not support"):
            GenAIEmbedding(client)

    def test_retries_provider_availability(self):
        client = self._client([np.ones(EMBEDDING_DIM, dtype=np.float32)])
        client.ensure_provider.return_value = False
        adapter = GenAIEmbedding(client)

        with self.assertRaisesRegex(RuntimeError, "unavailable"):
            adapter(["red car"], embedding_type="text")


if __name__ == "__main__":
    unittest.main()
