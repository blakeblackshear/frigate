"""GenAI-backed embeddings for semantic search."""

import io
import logging
from typing import TYPE_CHECKING

import numpy as np
from PIL import Image

if TYPE_CHECKING:
    from frigate.genai import GenAIClient

logger = logging.getLogger(__name__)

EMBEDDING_DIM = 768


class GenAIEmbedding:
    """Embedding adapter that delegates to a GenAI provider's embed API.

    Provides the same interface as JinaV2Embedding for semantic search:
    __call__(inputs, embedding_type) -> list[np.ndarray]. Output embeddings are
    normalized to 768 dimensions for Frigate's sqlite-vec schema.
    """

    def __init__(self, client: "GenAIClient") -> None:
        if not client.supports_embeddings:
            raise ValueError(
                f"{client.__class__.__name__} does not support multimodal embeddings"
            )
        self.client = client

    def __call__(
        self,
        inputs: list[str] | list[bytes] | list[Image.Image],
        embedding_type: str = "text",
    ) -> list[np.ndarray]:
        """Generate embeddings for text or images.

        Args:
            inputs: List of strings (text) or bytes/PIL images (vision).
            embedding_type: "text" or "vision".

        Returns:
            List of 768-dim numpy float32 arrays.
        """
        if not inputs:
            return []

        if not self.client.ensure_provider():
            raise RuntimeError("Embeddings provider is unavailable")

        if embedding_type == "text":
            texts = [str(x) for x in inputs]
            embeddings = self.client.embed(texts=texts)
            expected_count = len(texts)
        elif embedding_type == "vision":
            images: list[bytes] = []
            for inp in inputs:
                if isinstance(inp, bytes):
                    images.append(inp)
                elif isinstance(inp, Image.Image):
                    buf = io.BytesIO()
                    inp.convert("RGB").save(buf, format="JPEG")
                    images.append(buf.getvalue())
                else:
                    logger.warning(
                        "GenAIEmbedding: skipping unsupported vision input type %s",
                        type(inp).__name__,
                    )
            if not images:
                return []
            embeddings = self.client.embed(images=images)
            expected_count = len(images)
        else:
            raise ValueError(
                f"Invalid embedding_type '{embedding_type}'. Must be 'text' or 'vision'."
            )

        if len(embeddings) != expected_count:
            raise RuntimeError(
                "Embeddings provider returned "
                f"{len(embeddings)} vectors for {expected_count} inputs"
            )

        result = []
        for emb in embeddings:
            arr = np.asarray(emb, dtype=np.float32)
            if arr.ndim > 1:
                # Some providers return token-level embeddings; pool to one vector.
                arr = arr.mean(axis=0)
            arr = arr.flatten()
            if arr.size != EMBEDDING_DIM:
                if arr.size > EMBEDDING_DIM:
                    arr = arr[:EMBEDDING_DIM]
                else:
                    arr = np.pad(
                        arr,
                        (0, EMBEDDING_DIM - arr.size),
                        mode="constant",
                        constant_values=0,
                    )
            if not np.all(np.isfinite(arr)):
                raise ValueError("Embeddings provider returned a non-finite vector")

            norm = float(np.linalg.norm(arr.astype(np.float64, copy=False)))
            if not np.isfinite(norm) or norm == 0:
                raise ValueError("Embeddings provider returned a zero vector")

            result.append(np.ascontiguousarray(arr / norm, dtype=np.float32))
        return result
