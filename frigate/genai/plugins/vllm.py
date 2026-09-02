"""vLLM provider for Frigate AI."""

import base64
import io
import logging
from typing import Any

import numpy as np
from openai import APIError, OpenAI
from openai.types import CreateEmbeddingResponse
from PIL import Image

from frigate.config import GenAIProviderEnum
from frigate.genai import register_genai_provider
from frigate.genai.plugins.openai import OpenAIClient

logger = logging.getLogger(__name__)

DEFAULT_EMBEDDING_INSTRUCTION = "Represent the user's input."
FRIGATE_EMBEDDING_DIMENSIONS = 768


def _to_jpeg(image_bytes: bytes) -> bytes | None:
    """Convert arbitrary image bytes to an RGB JPEG data payload."""
    try:
        with Image.open(io.BytesIO(image_bytes)) as image:
            rgb_image = image.convert("RGB")
            buffer = io.BytesIO()
            rgb_image.save(buffer, format="JPEG", quality=85)
            return buffer.getvalue()
    except (OSError, ValueError) as error:
        logger.warning("Failed to convert vLLM embedding image to JPEG: %s", error)
        return None


@register_genai_provider(GenAIProviderEnum.vllm)
class VLLMClient(OpenAIClient):
    """OpenAI-compatible vLLM client with multimodal embedding support."""

    provider: OpenAI

    def _init_provider(self) -> OpenAI:
        """Initialize the OpenAI client for a vLLM server."""
        if not self.genai_config.base_url:
            raise ValueError("vLLM requires a base_url ending in /v1")

        base_url = self.genai_config.base_url.rstrip("/")
        if not base_url.endswith("/v1"):
            raise ValueError("vLLM requires a base_url ending in /v1")

        local_options = {"context_size", "embedding_instruction"}
        provider_options = {
            key: value
            for key, value in self.genai_config.provider_options.items()
            if key not in local_options
        }
        provider_options.setdefault("timeout", self.timeout)

        return OpenAI(
            api_key=self.genai_config.api_key or "EMPTY",
            base_url=base_url,
            **provider_options,
        )

    @property
    def supports_embeddings(self) -> bool:
        """Return whether this provider supports semantic search embeddings."""
        return True

    def _request_provider_options(self) -> dict[str, Any]:
        """Exclude embedding-only options from inherited chat requests."""
        provider_options = super()._request_provider_options()
        provider_options.pop("embedding_instruction", None)
        return provider_options

    def _embedding_messages(
        self, text: str | None = None, image: bytes | None = None
    ) -> list[dict[str, Any]]:
        """Build the chat-formatted input required by Qwen3-VL embeddings."""
        instruction = (
            self.genai_config.provider_options.get("embedding_instruction")
            or DEFAULT_EMBEDDING_INSTRUCTION
        )
        user_content: list[dict[str, Any]] = []

        if image is not None:
            encoded_image = base64.b64encode(image).decode("utf-8")
            user_content.append(
                {
                    "type": "image_url",
                    "image_url": {
                        "url": f"data:image/jpeg;base64,{encoded_image}",
                    },
                }
            )

        user_content.append({"type": "text", "text": text or ""})

        return [
            {
                "role": "system",
                "content": [{"type": "text", "text": str(instruction)}],
            },
            {"role": "user", "content": user_content},
            {
                "role": "assistant",
                "content": [{"type": "text", "text": ""}],
            },
        ]

    def embed(
        self,
        texts: list[str] | None = None,
        images: list[bytes] | None = None,
    ) -> list[np.ndarray]:
        """Generate text and image embeddings through vLLM."""
        requests = [self._embedding_messages(text=text) for text in (texts or [])]
        for image in images or []:
            jpeg_image = _to_jpeg(image)
            if jpeg_image is None:
                return []
            requests.append(self._embedding_messages(image=jpeg_image))

        if not requests:
            return []

        embeddings: list[np.ndarray] = []
        for messages in requests:
            try:
                response = self.provider.post(
                    "/embeddings",
                    cast_to=CreateEmbeddingResponse,
                    body={
                        "model": self.genai_config.model,
                        "messages": messages,
                        "encoding_format": "float",
                        "dimensions": FRIGATE_EMBEDDING_DIMENSIONS,
                        "continue_final_message": True,
                        # Qwen's chat template already includes its special tokens.
                        "add_special_tokens": False,
                    },
                )
            except APIError as error:
                logger.warning("vLLM embeddings request failed: %s", error)
                return []

            if len(response.data) != 1:
                logger.warning(
                    "vLLM embeddings returned %d items for one input",
                    len(response.data),
                )
                return []

            embeddings.append(np.asarray(response.data[0].embedding, dtype=np.float32))

        return embeddings
