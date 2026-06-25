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
import requests

from frigate.config import GenAIProviderEnum
from frigate.genai import GenAIClient, register_genai_provider

logger = logging.getLogger(__name__)

# Default Marengo model. Overridable via the `model` config field.
DEFAULT_MODEL = "marengo3.0"

# Marengo embed REST endpoint. No SDK is needed — this is a plain multipart POST
# made through Frigate's existing `requests` dependency.
EMBED_URL = "https://api.twelvelabs.io/v1.3/embed"


@register_genai_provider(GenAIProviderEnum.twelvelabs)
class TwelveLabsClient(GenAIClient):
    """GenAI client for Frigate using TwelveLabs Marengo embeddings."""

    def _init_provider(self):
        """Validate config for the TwelveLabs REST provider.

        The provider is just an HTTPS API, so there is no client object to
        build — the API key is the only thing required. A non-None sentinel is
        returned so the shared ``ensure_provider``/initialization machinery
        treats the provider as available.
        """
        if not self.genai_config.api_key:
            logger.error("TwelveLabs provider requires an api_key.")
            return None

        return self.genai_config.api_key

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

        Calls the Marengo REST endpoint directly via ``requests`` — no SDK.
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
        """Embed a single text or image input, returning a float32 vector.

        Posts a multipart form to the Marengo embed endpoint (``model_name`` plus
        either a ``text`` or an ``image_file`` part). The endpoint requires
        multipart/form-data, so every field — including text — is passed via
        ``files`` (the ``(None, value)`` form makes requests emit a multipart
        text part). ``self.provider`` holds the validated API key. The 512-dim
        vector is at ``<text|image>_embedding.segments[0].float`` in the JSON
        response.
        """
        headers = {"x-api-key": self.provider}
        files: dict = {"model_name": (None, self._model)}

        if text is not None:
            files["text"] = (None, text)
            result_key = "text_embedding"
        else:
            files["image_file"] = ("image.jpg", image, "image/jpeg")
            result_key = "image_embedding"

        try:
            response = requests.post(
                EMBED_URL,
                headers=headers,
                files=files,
                timeout=self.timeout,
            )
            response.raise_for_status()
            result = response.json().get(result_key) or {}
            segments = result.get("segments") or []

            if not segments:
                logger.warning("TwelveLabs returned no embedding for input.")
                return None

            return np.array(segments[0]["float"], dtype=np.float32)
        except Exception as e:
            logger.warning("TwelveLabs returned an error: %s", e)
            return None
