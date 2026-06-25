"""TwelveLabs provider for Frigate AI.

Provides multimodal embeddings for Frigate's semantic search via TwelveLabs'
Marengo model. Marengo produces text and image embeddings in a shared vector
space, so a natural-language query and a stored event thumbnail can be matched
directly — which is exactly what the ``embeddings`` GenAI role drives.

This provider is opt-in: it is only used when a ``genai`` config entry sets
``provider: twelvelabs`` and includes the ``embeddings`` role. It does not
implement the ``descriptions``/``chat`` roles — Marengo is an embedding model,
and TwelveLabs' Pegasus description model operates on whole video clips rather
than the per-frame thumbnails Frigate hands to ``_send``.

Marengo embeddings are 512-dimensional; Frigate's semantic search schema
expects 768 dimensions. The shared :class:`~frigate.embeddings.genai_embedding.GenAIEmbedding`
adapter zero-pads shorter vectors, so the dimension difference is handled
upstream and is consistent for both text and image inputs.
"""

import logging

import numpy as np

from frigate.config import GenAIProviderEnum
from frigate.genai import GenAIClient, register_genai_provider

logger = logging.getLogger(__name__)

# Default Marengo model. Overridable via the `model` config field.
DEFAULT_MODEL = "marengo3.0"


@register_genai_provider(GenAIProviderEnum.twelvelabs)
class TwelveLabsClient(GenAIClient):
    """GenAI client for Frigate using TwelveLabs Marengo embeddings."""

    def _init_provider(self):
        """Initialize the TwelveLabs SDK client."""
        try:
            from twelvelabs import TwelveLabs
        except ImportError:
            logger.error(
                "The twelvelabs package is required for the TwelveLabs provider."
            )
            return None

        if not self.genai_config.api_key:
            logger.error("TwelveLabs provider requires an api_key.")
            return None

        return TwelveLabs(api_key=self.genai_config.api_key)

    @property
    def _model(self) -> str:
        return self.genai_config.model or DEFAULT_MODEL

    def list_models(self) -> list[str]:
        """Marengo is the embedding model exposed by this provider."""
        return [DEFAULT_MODEL]

    def embed(
        self,
        texts: list[str] | None = None,
        images: list[bytes] | None = None,
    ) -> list[np.ndarray]:
        """Generate Marengo embeddings for text and/or images.

        The TwelveLabs embed API embeds a single input per call, so inputs are
        sent one at a time. Returns one 512-dim float32 vector per input, in
        order (texts first, then images). The shared GenAIEmbedding adapter
        pads these to Frigate's 768-dim search schema.
        """
        if self.provider is None:
            logger.warning(
                "TwelveLabs provider has not been initialized. Check your configuration."
            )
            return []

        results: list[np.ndarray] = []

        for text in texts or []:
            vector = self._embed_one(text=text)
            if vector is not None:
                results.append(vector)

        for image in images or []:
            vector = self._embed_one(image=image)
            if vector is not None:
                results.append(vector)

        return results

    def _embed_one(
        self, text: str | None = None, image: bytes | None = None
    ) -> np.ndarray | None:
        """Embed a single text or image input, returning a float32 vector."""
        try:
            if text is not None:
                response = self.provider.embed.create(
                    model_name=self._model,
                    text=text,
                    request_options={"timeout_in_seconds": self.timeout},
                )
                result = response.text_embedding
            else:
                response = self.provider.embed.create(
                    model_name=self._model,
                    image_file=image,
                    request_options={"timeout_in_seconds": self.timeout},
                )
                result = response.image_embedding

            if result is None or not result.segments:
                logger.warning("TwelveLabs returned no embedding for input.")
                return None

            return np.array(result.segments[0].float_, dtype=np.float32)
        except Exception as e:
            logger.warning("TwelveLabs returned an error: %s", e)
            return None
