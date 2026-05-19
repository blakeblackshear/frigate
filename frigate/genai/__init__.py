"""Generative AI module for Frigate."""

import importlib
import json
import logging
import os
import re
from typing import Any, Callable, Optional

import numpy as np
from pydantic import ValidationError

from frigate.config import CameraConfig, GenAIConfig, GenAIProviderEnum
from frigate.const import CLIPS_DIR
from frigate.data_processing.post.types import ReviewMetadata
from frigate.genai.manager import GenAIClientManager
from frigate.genai.prompts import (
    build_object_description_prompt,
    build_review_description_prompt,
    build_review_description_response_format,
    build_review_summary_prompt,
)
from frigate.models import Event

logger = logging.getLogger(__name__)

__all__ = [
    "GenAIClient",
    "GenAIClientManager",
    "GenAIConfig",
    "GenAIProviderEnum",
    "PROVIDERS",
    "load_providers",
    "register_genai_provider",
]

PROVIDERS = {}


def register_genai_provider(key: GenAIProviderEnum) -> Callable:
    """Register a GenAI provider."""

    def decorator(cls: type) -> type:
        PROVIDERS[key] = cls
        return cls

    return decorator


class GenAIClient:
    """Generative AI client for Frigate."""

    def __init__(self, genai_config: GenAIConfig, timeout: int = 120) -> None:
        self.genai_config: GenAIConfig = genai_config
        self.timeout = timeout
        self.provider = self._init_provider()

    def generate_review_description(
        self,
        review_data: dict[str, Any],
        thumbnails: list[bytes],
        concerns: list[str],
        preferred_language: str | None,
        debug_save: bool,
        activity_context_prompt: str,
    ) -> ReviewMetadata | None:
        """Generate a description for the review item activity."""
        context_prompt = build_review_description_prompt(
            review_data,
            thumbnails,
            concerns,
            preferred_language,
            activity_context_prompt,
        )

        logger.debug(
            f"Sending {len(thumbnails)} images to create review description on {review_data['camera']}"
        )

        if debug_save:
            with open(
                os.path.join(
                    CLIPS_DIR, "genai-requests", review_data["id"], "prompt.txt"
                ),
                "w",
            ) as f:
                f.write(context_prompt)

        response_format = build_review_description_response_format(concerns)

        response = self._send(context_prompt, thumbnails, response_format)

        if debug_save and response:
            with open(
                os.path.join(
                    CLIPS_DIR, "genai-requests", review_data["id"], "response.txt"
                ),
                "w",
            ) as f:
                f.write(response)

        if response:
            clean_json = re.sub(
                r"\n?```$", "", re.sub(r"^```[a-zA-Z0-9]*\n?", "", response)
            )

            try:
                metadata = ReviewMetadata.model_validate_json(clean_json)
            except ValidationError as ve:
                # Constraint violations (length, item count, ranges) are logged
                # at debug and the response is kept anyway — a slightly
                # off-spec answer is still usable, and dropping the whole
                # response loses the narrative content the model produced.
                for err in ve.errors():
                    loc = ".".join(str(p) for p in err["loc"]) or "<root>"
                    logger.debug(
                        "Review metadata soft validation: %s — %s (input: %r)",
                        loc,
                        err["msg"],
                        err.get("input"),
                    )
                try:
                    raw = json.loads(clean_json)
                except json.JSONDecodeError as je:
                    logger.error("Failed to parse review description JSON: %s", je)
                    return None
                # observations and confidence are required on the model; fill an empty default
                # if the response omitted it so attribute access stays safe.
                raw.setdefault("observations", [])
                raw.setdefault("confidence", 0.0)
                metadata = ReviewMetadata.model_construct(**raw)
            except Exception as e:
                logger.error(
                    f"Failed to parse review description as the response did not match expected format. {e}"
                )
                return None

            try:
                # Normalize confidence if model returned a percentage (e.g. 85 instead of 0.85)
                if metadata.confidence > 1.0:
                    metadata.confidence = min(metadata.confidence / 100.0, 1.0)

                # If any verified objects (contain ← separator), set to 0
                if any("←" in obj for obj in review_data["unified_objects"]):
                    metadata.potential_threat_level = 0

                metadata.title = metadata.title[0].upper() + metadata.title[1:]
                metadata.time = review_data["start"]
                return metadata
            except Exception as e:
                logger.error(f"Failed to post-process review metadata: {e}")
                return None
        else:
            logger.debug(
                f"Invalid response received from GenAI provider for review description on {review_data['camera']}. Response: {response}",
            )
            return None

    def generate_review_summary(
        self,
        start_ts: float,
        end_ts: float,
        events: list[dict[str, Any]],
        preferred_language: str | None,
        debug_save: bool,
    ) -> str | None:
        """Generate a summary of review item descriptions over a period of time."""
        timeline_summary_prompt = build_review_summary_prompt(
            start_ts, end_ts, events, preferred_language
        )

        if debug_save:
            with open(
                os.path.join(
                    CLIPS_DIR, "genai-requests", f"{start_ts}-{end_ts}", "prompt.txt"
                ),
                "w",
            ) as f:
                f.write(timeline_summary_prompt)

        response = self._send(timeline_summary_prompt, [])

        if debug_save and response:
            with open(
                os.path.join(
                    CLIPS_DIR, "genai-requests", f"{start_ts}-{end_ts}", "response.txt"
                ),
                "w",
            ) as f:
                f.write(response)

        return response

    def generate_object_description(
        self,
        camera_config: CameraConfig,
        thumbnails: list[bytes],
        event: Event,
    ) -> Optional[str]:
        """Generate a description for the frame."""
        try:
            prompt = build_object_description_prompt(camera_config, event)
        except KeyError as e:
            logger.error(f"Invalid key in GenAI prompt: {e}")
            return None

        logger.debug(f"Sending images to genai provider with prompt: {prompt}")
        return self._send(prompt, thumbnails)

    def _init_provider(self) -> Any:
        """Initialize the client."""
        return None

    def _send(
        self,
        prompt: str,
        images: list[bytes],
        response_format: Optional[dict] = None,
    ) -> Optional[str]:
        """Submit a request to the provider."""
        return None

    @property
    def supports_vision(self) -> bool:
        """Whether the model supports vision/image input.

        Defaults to True for cloud providers. Providers that can detect
        capability at runtime (e.g. llama.cpp) should override this.
        """
        return True

    def list_models(self) -> list[str]:
        """Return the list of model names available from this provider.

        Providers should override this to query their backend.
        """
        return []

    def get_context_size(self) -> int:
        """Get the context window size for this provider in tokens."""
        return 4096

    def estimate_image_tokens(self, width: int, height: int) -> float:
        """Estimate prompt tokens consumed by a single image of the given dimensions.

        Default heuristic: ~1 token per 1250 pixels. Providers that can measure or
        know their model's exact image-token cost should override.
        """
        return (width * height) / 1250

    def embed(
        self,
        texts: list[str] | None = None,
        images: list[bytes] | None = None,
    ) -> list[np.ndarray]:
        """Generate embeddings for text and/or images.

        Returns list of numpy arrays (one per input). Expected dimension is 768
        for Frigate semantic search compatibility.

        Providers that support embeddings should override this method.
        """
        logger.warning(
            "%s does not support embeddings. "
            "This method should be overridden by the provider implementation.",
            self.__class__.__name__,
        )
        return []

    def chat_with_tools(
        self,
        messages: list[dict[str, Any]],
        tools: Optional[list[dict[str, Any]]] = None,
        tool_choice: Optional[str] = "auto",
    ) -> dict[str, Any]:
        """
        Send chat messages to LLM with optional tool definitions.

        This method handles conversation-style interactions with the LLM,
        including function calling/tool usage capabilities.

        Args:
            messages: List of message dictionaries. Each message should have:
                - 'role': str - One of 'user', 'assistant', 'system', or 'tool'
                - 'content': str - The message content
                - 'tool_call_id': Optional[str] - For tool responses, the ID of the tool call
                - 'name': Optional[str] - For tool messages, the tool name
            tools: Optional list of tool definitions in OpenAI-compatible format.
                   Each tool should have 'type': 'function' and 'function' with:
                   - 'name': str - Tool name
                   - 'description': str - Tool description
                   - 'parameters': dict - JSON schema for parameters
            tool_choice: How the model should handle tools:
                - 'auto': Model decides whether to call tools
                - 'none': Model must not call tools
                - 'required': Model must call at least one tool
                - Or a dict specifying a specific tool to call
            **kwargs: Additional provider-specific parameters.

        Returns:
            Dictionary with:
            - 'content': Optional[str] - The text response from the LLM, None if tool calls
            - 'reasoning': Optional[str] - The separated reasoning/thinking trace
              if the model emitted one (e.g. via OpenAI-compatible
              `reasoning_content`). None when the model does not surface a
              trace or the provider does not parse it.
            - 'tool_calls': Optional[List[Dict]] - List of tool calls if LLM wants to call tools.
              Each tool call dict has:
                - 'id': str - Unique identifier for this tool call
                - 'name': str - Tool name to call
                - 'arguments': dict - Arguments for the tool call (parsed JSON)
            - 'finish_reason': str - Reason generation stopped:
                - 'stop': Normal completion
                - 'tool_calls': LLM wants to call tools
                - 'length': Hit token limit
                - 'error': An error occurred

        Streaming counterpart `chat_with_tools_stream` yields
        ``(kind, value)`` tuples where ``kind`` is one of:
            - 'content_delta': value is a string fragment of the answer
            - 'reasoning_delta': value is a string fragment of the reasoning
              trace (emitted before content for thinking models)
            - 'stats': value is a usage stats dict
            - 'message': value is the final dict shape described above

        Raises:
            NotImplementedError: If the provider doesn't implement this method.
        """
        # Base implementation - each provider should override this
        logger.warning(
            f"{self.__class__.__name__} does not support chat_with_tools. "
            "This method should be overridden by the provider implementation."
        )
        return {
            "content": None,
            "reasoning": None,
            "tool_calls": None,
            "finish_reason": "error",
        }


def load_providers() -> None:
    plugins_dir = os.path.join(os.path.dirname(__file__), "plugins")
    for filename in os.listdir(plugins_dir):
        if filename.endswith(".py") and filename != "__init__.py":
            module_name = f"frigate.genai.plugins.{filename[:-3]}"
            importlib.import_module(module_name)
