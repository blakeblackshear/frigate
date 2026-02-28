"""OpenAI Provider for Frigate AI."""

import base64
import json
import logging
from typing import Any, Optional

from httpx import TimeoutException
from openai import OpenAI

from frigate.config import GenAIProviderEnum
from frigate.genai import GenAIClient, register_genai_provider

logger = logging.getLogger(__name__)


@register_genai_provider(GenAIProviderEnum.openai)
class OpenAIClient(GenAIClient):
    """Generative AI client for Frigate using OpenAI."""

    provider: OpenAI
    context_size: Optional[int] = None

    def _init_provider(self):
        """Initialize the client."""
        # Extract context_size from provider_options as it's not a valid OpenAI client parameter
        # It will be used in get_context_size() instead
        provider_opts = {
            k: v
            for k, v in self.genai_config.provider_options.items()
            if k != "context_size"
        }

        if self.genai_config.base_url:
            provider_opts["base_url"] = self.genai_config.base_url

        return OpenAI(api_key=self.genai_config.api_key, **provider_opts)

    def _send(self, prompt: str, images: list[bytes]) -> Optional[str]:
        """Submit a request to OpenAI."""
        encoded_images = [base64.b64encode(image).decode("utf-8") for image in images]
        messages_content = []
        for image in encoded_images:
            messages_content.append(
                {
                    "type": "image_url",
                    "image_url": {
                        "url": f"data:image/jpeg;base64,{image}",
                        "detail": "low",
                    },
                }
            )
        messages_content.append(
            {
                "type": "text",
                "text": prompt,
            }
        )
        try:
            result = self.provider.chat.completions.create(
                model=self.genai_config.model,
                messages=[
                    {
                        "role": "user",
                        "content": messages_content,
                    },
                ],
                timeout=self.timeout,
                **self.genai_config.runtime_options,
            )
            if (
                result is not None
                and hasattr(result, "choices")
                and len(result.choices) > 0
            ):
                return result.choices[0].message.content.strip()
            return None
        except (TimeoutException, Exception) as e:
            logger.warning("OpenAI returned an error: %s", str(e))
            return None

    def get_context_size(self) -> int:
        """Get the context window size for OpenAI."""
        if self.context_size is not None:
            return self.context_size

        # First check provider_options for manually specified context size
        # This is necessary for llama.cpp and other OpenAI-compatible servers
        # that don't expose the configured runtime context size in the API response
        if "context_size" in self.genai_config.provider_options:
            self.context_size = self.genai_config.provider_options["context_size"]
            logger.debug(
                f"Using context size {self.context_size} from provider_options for model {self.genai_config.model}"
            )
            return self.context_size

        try:
            models = self.provider.models.list()
            for model in models.data:
                if model.id == self.genai_config.model:
                    if hasattr(model, "max_model_len") and model.max_model_len:
                        self.context_size = model.max_model_len
                        logger.debug(
                            f"Retrieved context size {self.context_size} for model {self.genai_config.model}"
                        )
                        return self.context_size

        except Exception as e:
            logger.debug(
                f"Failed to fetch model context size from API: {e}, using default"
            )

        # Default to 128K for ChatGPT models, 8K for others
        model_name = self.genai_config.model.lower()
        if "gpt" in model_name:
            self.context_size = 128000
        else:
            self.context_size = 8192

        logger.debug(
            f"Using default context size {self.context_size} for model {self.genai_config.model}"
        )
        return self.context_size

    def chat_with_tools(
        self,
        messages: list[dict[str, Any]],
        tools: Optional[list[dict[str, Any]]] = None,
        tool_choice: Optional[str] = "auto",
    ) -> dict[str, Any]:
        """
        Send chat messages to OpenAI with optional tool definitions.

        Implements function calling/tool usage for OpenAI models.
        """
        try:
            openai_tool_choice = None
            if tool_choice:
                if tool_choice == "none":
                    openai_tool_choice = "none"
                elif tool_choice == "auto":
                    openai_tool_choice = "auto"
                elif tool_choice == "required":
                    openai_tool_choice = "required"

            request_params = {
                "model": self.genai_config.model,
                "messages": messages,
                "timeout": self.timeout,
            }

            if tools:
                request_params["tools"] = tools
                if openai_tool_choice is not None:
                    request_params["tool_choice"] = openai_tool_choice

            if isinstance(self.genai_config.provider_options, dict):
                excluded_options = {"context_size"}
                provider_opts = {
                    k: v
                    for k, v in self.genai_config.provider_options.items()
                    if k not in excluded_options
                }
                request_params.update(provider_opts)

            result = self.provider.chat.completions.create(**request_params)

            if (
                result is None
                or not hasattr(result, "choices")
                or len(result.choices) == 0
            ):
                return {
                    "content": None,
                    "tool_calls": None,
                    "finish_reason": "error",
                }

            choice = result.choices[0]
            message = choice.message
            content = message.content.strip() if message.content else None

            tool_calls = None
            if message.tool_calls:
                tool_calls = []
                for tool_call in message.tool_calls:
                    try:
                        arguments = json.loads(tool_call.function.arguments)
                    except (json.JSONDecodeError, AttributeError) as e:
                        logger.warning(
                            f"Failed to parse tool call arguments: {e}, "
                            f"tool: {tool_call.function.name if hasattr(tool_call.function, 'name') else 'unknown'}"
                        )
                        arguments = {}

                    tool_calls.append(
                        {
                            "id": tool_call.id if hasattr(tool_call, "id") else "",
                            "name": tool_call.function.name
                            if hasattr(tool_call.function, "name")
                            else "",
                            "arguments": arguments,
                        }
                    )

            finish_reason = "error"
            if hasattr(choice, "finish_reason") and choice.finish_reason:
                finish_reason = choice.finish_reason
            elif tool_calls:
                finish_reason = "tool_calls"
            elif content:
                finish_reason = "stop"

            return {
                "content": content,
                "tool_calls": tool_calls,
                "finish_reason": finish_reason,
            }

        except TimeoutException as e:
            logger.warning("OpenAI request timed out: %s", str(e))
            return {
                "content": None,
                "tool_calls": None,
                "finish_reason": "error",
            }
        except Exception as e:
            logger.warning("OpenAI returned an error: %s", str(e))
            return {
                "content": None,
                "tool_calls": None,
                "finish_reason": "error",
            }

    async def chat_with_tools_stream(
        self,
        messages: list[dict[str, Any]],
        tools: Optional[list[dict[str, Any]]] = None,
        tool_choice: Optional[str] = "auto",
    ):
        """
        Stream chat with tools; yields content deltas then final message.

        Implements streaming function calling/tool usage for OpenAI models.
        """
        try:
            openai_tool_choice = None
            if tool_choice:
                if tool_choice == "none":
                    openai_tool_choice = "none"
                elif tool_choice == "auto":
                    openai_tool_choice = "auto"
                elif tool_choice == "required":
                    openai_tool_choice = "required"

            request_params = {
                "model": self.genai_config.model,
                "messages": messages,
                "timeout": self.timeout,
                "stream": True,
            }

            if tools:
                request_params["tools"] = tools
                if openai_tool_choice is not None:
                    request_params["tool_choice"] = openai_tool_choice

            if isinstance(self.genai_config.provider_options, dict):
                excluded_options = {"context_size"}
                provider_opts = {
                    k: v
                    for k, v in self.genai_config.provider_options.items()
                    if k not in excluded_options
                }
                request_params.update(provider_opts)

            # Use streaming API
            content_parts: list[str] = []
            tool_calls_by_index: dict[int, dict[str, Any]] = {}
            finish_reason = "stop"

            stream = self.provider.chat.completions.create(**request_params)

            for chunk in stream:
                if not chunk or not chunk.choices:
                    continue

                choice = chunk.choices[0]
                delta = choice.delta

                # Check for finish reason
                if choice.finish_reason:
                    finish_reason = choice.finish_reason

                # Extract content deltas
                if delta.content:
                    content_parts.append(delta.content)
                    yield ("content_delta", delta.content)

                # Extract tool calls
                if delta.tool_calls:
                    for tc in delta.tool_calls:
                        idx = tc.index
                        fn = tc.function

                        if idx not in tool_calls_by_index:
                            tool_calls_by_index[idx] = {
                                "id": tc.id or "",
                                "name": fn.name if fn and fn.name else "",
                                "arguments": "",
                            }

                        t = tool_calls_by_index[idx]
                        if tc.id:
                            t["id"] = tc.id
                        if fn and fn.name:
                            t["name"] = fn.name
                        if fn and fn.arguments:
                            t["arguments"] += fn.arguments

            # Build final message
            full_content = "".join(content_parts).strip() or None

            # Convert tool calls to list format
            tool_calls_list = None
            if tool_calls_by_index:
                tool_calls_list = []
                for tc in tool_calls_by_index.values():
                    try:
                        # Parse accumulated arguments as JSON
                        parsed_args = json.loads(tc["arguments"])
                    except (json.JSONDecodeError, Exception):
                        parsed_args = tc["arguments"]

                    tool_calls_list.append(
                        {
                            "id": tc["id"],
                            "name": tc["name"],
                            "arguments": parsed_args,
                        }
                    )
                finish_reason = "tool_calls"

            yield (
                "message",
                {
                    "content": full_content,
                    "tool_calls": tool_calls_list,
                    "finish_reason": finish_reason,
                },
            )

        except TimeoutException as e:
            logger.warning("OpenAI streaming request timed out: %s", str(e))
            yield (
                "message",
                {
                    "content": None,
                    "tool_calls": None,
                    "finish_reason": "error",
                },
            )
        except Exception as e:
            logger.warning("OpenAI streaming returned an error: %s", str(e))
            yield (
                "message",
                {
                    "content": None,
                    "tool_calls": None,
                    "finish_reason": "error",
                },
            )
