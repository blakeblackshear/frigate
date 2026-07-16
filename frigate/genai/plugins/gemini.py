"""Gemini Provider for Frigate AI."""

import base64
import binascii
import json
import logging
from collections.abc import AsyncGenerator
from typing import Any

from google import genai
from google.genai import errors, types
from google.genai.types import FunctionCallingConfigMode

from frigate.config import GenAIProviderEnum
from frigate.genai import GenAIClient, register_genai_provider

logger = logging.getLogger(__name__)


def _decode_thought_signature(value: Any) -> bytes | None:
    """Decode a base64-encoded thought_signature carried across conversation turns."""
    if not value:
        return None
    if isinstance(value, bytes):
        return value
    if isinstance(value, str):
        try:
            return base64.b64decode(value)
        except (binascii.Error, ValueError):
            return None
    return None


def _encode_thought_signature(signature: bytes | None) -> str | None:
    """Encode bytes thought_signature as base64 so it survives JSON-friendly transport."""
    if not signature:
        return None
    return base64.b64encode(signature).decode("ascii")


def _decode_data_uri(url: str) -> tuple[str, bytes] | None:
    """Decode a ``data:`` URI into ``(mime_type, bytes)``; None if not a data URI."""
    if not isinstance(url, str) or not url.startswith("data:"):
        return None
    try:
        header, b64 = url.split(",", 1)
        mime = header[len("data:") :].split(";")[0] or "image/jpeg"
        return mime, base64.b64decode(b64)
    except (ValueError, binascii.Error):
        return None


def _parts_from_content(content: Any) -> list[types.Part]:
    """Convert OpenAI-style message content (str or multimodal list) to Gemini parts."""
    if isinstance(content, list):
        parts: list[types.Part] = []
        for item in content:
            if not isinstance(item, dict):
                continue
            if item.get("type") == "text":
                parts.append(types.Part.from_text(text=item.get("text") or ""))
            elif item.get("type") == "image_url":
                decoded = _decode_data_uri((item.get("image_url") or {}).get("url", ""))
                if decoded is not None:
                    mime, data = decoded
                    parts.append(types.Part.from_bytes(data=data, mime_type=mime))
        # Gemini rejects empty parts; fall back to a single space.
        return parts or [types.Part.from_text(text=" ")]
    return [types.Part.from_text(text=content or "")]


def _stats_from_gemini_usage(usage: Any) -> dict[str, Any] | None:
    """Build a stats dict from a Gemini usage_metadata object."""
    prompt_tokens = getattr(usage, "prompt_token_count", None)
    completion_tokens = getattr(usage, "candidates_token_count", None)
    if prompt_tokens is None and completion_tokens is None:
        return None
    stats: dict[str, Any] = {}
    if isinstance(prompt_tokens, int):
        stats["prompt_tokens"] = prompt_tokens
    if isinstance(completion_tokens, int):
        stats["completion_tokens"] = completion_tokens
    return stats or None


@register_genai_provider(GenAIProviderEnum.gemini)
class GeminiClient(GenAIClient):
    """Generative AI client for Frigate using Gemini."""

    provider: genai.Client

    def _init_provider(self) -> genai.Client:
        """Initialize the client."""
        # Merge provider_options into HttpOptions
        http_options_dict: dict[str, Any] = {
            "timeout": int(self.timeout * 1000),  # requires milliseconds
            "retry_options": types.HttpRetryOptions(
                attempts=3,
                initial_delay=1.0,
                max_delay=60.0,
                exp_base=2.0,
                jitter=1.0,
                http_status_codes=[429, 500, 502, 503, 504],
            ),
        }

        if isinstance(self.genai_config.provider_options, dict):
            http_options_dict.update(self.genai_config.provider_options)

        return genai.Client(
            api_key=self.genai_config.api_key,
            http_options=types.HttpOptions(**http_options_dict),
        )

    def _send(
        self,
        prompt: str,
        images: list[bytes],
        response_format: dict | None = None,
        enable_thinking: bool = False,
    ) -> str | None:
        """Submit a request to Gemini."""
        contents = [prompt] + [
            types.Part.from_bytes(data=img, mime_type="image/jpeg") for img in images
        ]
        try:
            # Merge runtime_options into generation_config if provided
            generation_config_dict: dict[str, Any] = {"candidate_count": 1}
            generation_config_dict.update(self.genai_config.runtime_options)

            if response_format and response_format.get("type") == "json_schema":
                generation_config_dict["response_mime_type"] = "application/json"
                schema = response_format.get("json_schema", {}).get("schema")
                if schema:
                    generation_config_dict["response_schema"] = schema

            response = self.provider.models.generate_content(
                model=self.genai_config.model,
                contents=contents,  # type: ignore[arg-type]
                config=types.GenerateContentConfig(
                    **generation_config_dict,
                ),
            )
        except errors.APIError as e:
            logger.warning("Gemini returned an error: %s", str(e))
            return None
        except Exception as e:
            logger.warning("An unexpected error occurred with Gemini: %s", str(e))
            return None

        try:
            if response.text is None:
                return None
            description = response.text.strip()
        except (ValueError, AttributeError):
            # No description was generated
            return None
        return description

    def list_models(self) -> list[str]:
        """Return available model names from Gemini."""
        try:
            return sorted(m.name or "" for m in self.provider.models.list())
        except Exception as e:
            logger.warning("Failed to list Gemini models: %s", e)
            return []

    def get_context_size(self) -> int:
        """Get the context window size for Gemini."""
        # Gemini Pro Vision has a 1M token context window
        return 1000000

    def chat_with_tools(
        self,
        messages: list[dict[str, Any]],
        tools: list[dict[str, Any]] | None = None,
        tool_choice: str | None = "auto",
        enable_thinking: bool | None = None,
    ) -> dict[str, Any]:
        """
        Send chat messages to Gemini with optional tool definitions.

        Implements function calling/tool usage for Gemini models. Thinking is
        configured at the model level for Gemini, so ``enable_thinking`` is
        accepted for interface parity and ignored.
        """
        try:
            # Convert messages to Gemini format
            gemini_messages: list[types.Content] = []
            for msg in messages:
                role = msg.get("role", "user")
                content = msg.get("content", "")

                # Map roles to Gemini format
                if role == "system":
                    # Gemini doesn't have system role, prepend to first user message
                    if (
                        gemini_messages
                        and gemini_messages[0].role == "user"
                        and gemini_messages[0].parts
                    ):
                        gemini_messages[0].parts[
                            0
                        ].text = f"{content}\n\n{gemini_messages[0].parts[0].text}"
                    else:
                        gemini_messages.append(
                            types.Content(
                                role="user", parts=[types.Part.from_text(text=content)]
                            )
                        )
                elif role == "assistant":
                    parts: list[types.Part] = []
                    if content:
                        parts.append(types.Part.from_text(text=content))
                    for tc in msg.get("tool_calls") or []:
                        func = tc.get("function") or {}
                        tc_name = func.get("name") or ""
                        tc_args: Any = func.get("arguments")
                        if isinstance(tc_args, str):
                            try:
                                tc_args = json.loads(tc_args)
                            except (json.JSONDecodeError, TypeError):
                                tc_args = {}
                        if not isinstance(tc_args, dict):
                            tc_args = {}
                        if tc_name:
                            fc_part = types.Part.from_function_call(
                                name=tc_name, args=tc_args
                            )
                            # Thinking-capable Gemini models require the original
                            # thought_signature to be echoed back on functionCall
                            # parts after a tool response, or the next request
                            # fails with INVALID_ARGUMENT.
                            sig = _decode_thought_signature(tc.get("thought_signature"))
                            if sig:
                                fc_part.thought_signature = sig
                            parts.append(fc_part)
                    if not parts:
                        parts.append(types.Part.from_text(text=" "))
                    gemini_messages.append(types.Content(role="model", parts=parts))
                elif role == "tool":
                    # Handle tool response
                    response_payload = (
                        content if isinstance(content, dict) else {"result": content}
                    )
                    gemini_messages.append(
                        types.Content(
                            role="function",
                            parts=[
                                types.Part.from_function_response(
                                    name=msg.get("name")
                                    or msg.get("tool_call_id")
                                    or "",
                                    response=response_payload,
                                )
                            ],
                        )
                    )
                else:  # user
                    gemini_messages.append(
                        types.Content(role="user", parts=_parts_from_content(content))
                    )

            # Convert tools to Gemini format
            gemini_tools = None
            if tools:
                gemini_tools = []
                for tool in tools:
                    if tool.get("type") == "function":
                        func = tool.get("function", {})
                        gemini_tools.append(
                            types.Tool(
                                function_declarations=[
                                    types.FunctionDeclaration(
                                        name=func.get("name", ""),
                                        description=func.get("description", ""),
                                        parameters=func.get("parameters", {}),
                                    )
                                ]
                            )
                        )

            # Configure tool choice
            tool_config = None
            if tool_choice:
                if tool_choice == "none":
                    tool_config = types.ToolConfig(
                        function_calling_config=types.FunctionCallingConfig(
                            mode=FunctionCallingConfigMode.NONE
                        )
                    )
                elif tool_choice == "auto":
                    tool_config = types.ToolConfig(
                        function_calling_config=types.FunctionCallingConfig(
                            mode=FunctionCallingConfigMode.AUTO
                        )
                    )
                elif tool_choice == "required":
                    tool_config = types.ToolConfig(
                        function_calling_config=types.FunctionCallingConfig(
                            mode=FunctionCallingConfigMode.ANY
                        )
                    )

            # Build request config
            config_params: dict[str, Any] = {"candidate_count": 1}

            if gemini_tools:
                config_params["tools"] = gemini_tools

            if tool_config:
                config_params["tool_config"] = tool_config

            # Ask thinking-capable models (Gemini 2.5+) to include their
            # reasoning trace as separate `thought` parts so we can surface
            # it on the reasoning channel. Older models ignore this field.
            config_params["thinking_config"] = types.ThinkingConfig(
                include_thoughts=True
            )

            # Merge runtime_options
            if isinstance(self.genai_config.runtime_options, dict):
                config_params.update(self.genai_config.runtime_options)

            response = self.provider.models.generate_content(
                model=self.genai_config.model,
                contents=gemini_messages,  # type: ignore[arg-type]
                config=types.GenerateContentConfig(**config_params),
            )

            # Check if response is valid
            if not response or not response.candidates:
                return {
                    "content": None,
                    "reasoning": None,
                    "tool_calls": None,
                    "finish_reason": "error",
                }

            candidate = response.candidates[0]
            content = None
            reasoning_parts: list[str] = []
            tool_calls = None

            # Extract content, reasoning, and tool calls from response
            if candidate.content and candidate.content.parts:
                for part in candidate.content.parts:
                    if part.text:
                        if getattr(part, "thought", False):
                            reasoning_parts.append(part.text)
                        else:
                            content = part.text.strip()
                    elif part.function_call:
                        # Handle function call
                        if tool_calls is None:
                            tool_calls = []

                        try:
                            arguments = (
                                dict(part.function_call.args)
                                if part.function_call.args
                                else {}
                            )
                        except Exception:
                            arguments = {}

                        tool_calls.append(
                            {
                                "id": part.function_call.name or "",
                                "name": part.function_call.name or "",
                                "arguments": arguments,
                                "thought_signature": _encode_thought_signature(
                                    getattr(part, "thought_signature", None)
                                ),
                            }
                        )

            reasoning = "".join(reasoning_parts).strip() or None

            # Determine finish reason
            finish_reason = "error"
            if hasattr(candidate, "finish_reason") and candidate.finish_reason:
                from google.genai.types import FinishReason

                if candidate.finish_reason == FinishReason.STOP:
                    finish_reason = "stop"
                elif candidate.finish_reason == FinishReason.MAX_TOKENS:
                    finish_reason = "length"
                elif candidate.finish_reason in [
                    FinishReason.SAFETY,
                    FinishReason.RECITATION,
                ]:
                    finish_reason = "error"
                elif tool_calls:
                    finish_reason = "tool_calls"
                elif content:
                    finish_reason = "stop"
            elif tool_calls:
                finish_reason = "tool_calls"
            elif content:
                finish_reason = "stop"

            return {
                "content": content,
                "reasoning": reasoning,
                "tool_calls": tool_calls,
                "finish_reason": finish_reason,
            }

        except errors.APIError as e:
            logger.warning("Gemini API error during chat_with_tools: %s", str(e))
            return {
                "content": None,
                "reasoning": None,
                "tool_calls": None,
                "finish_reason": "error",
            }
        except Exception as e:
            logger.warning(
                "Gemini returned an error during chat_with_tools: %s", str(e)
            )
            return {
                "content": None,
                "reasoning": None,
                "tool_calls": None,
                "finish_reason": "error",
            }

    async def chat_with_tools_stream(
        self,
        messages: list[dict[str, Any]],
        tools: list[dict[str, Any]] | None = None,
        tool_choice: str | None = "auto",
        enable_thinking: bool | None = None,
    ) -> AsyncGenerator[tuple[str, Any], None]:
        """
        Stream chat with tools; yields content deltas then final message.

        Implements streaming function calling/tool usage for Gemini models.
        ``enable_thinking`` is accepted for interface parity; Gemini configures
        thinking at the model level, so it is ignored here.
        """
        try:
            # Convert messages to Gemini format
            gemini_messages: list[types.Content] = []
            for msg in messages:
                role = msg.get("role", "user")
                content = msg.get("content", "")

                # Map roles to Gemini format
                if role == "system":
                    # Gemini doesn't have system role, prepend to first user message
                    if (
                        gemini_messages
                        and gemini_messages[0].role == "user"
                        and gemini_messages[0].parts
                    ):
                        gemini_messages[0].parts[
                            0
                        ].text = f"{content}\n\n{gemini_messages[0].parts[0].text}"
                    else:
                        gemini_messages.append(
                            types.Content(
                                role="user", parts=[types.Part.from_text(text=content)]
                            )
                        )
                elif role == "assistant":
                    parts: list[types.Part] = []
                    if content:
                        parts.append(types.Part.from_text(text=content))
                    for tc in msg.get("tool_calls") or []:
                        func = tc.get("function") or {}
                        tc_name = func.get("name") or ""
                        tc_args: Any = func.get("arguments")
                        if isinstance(tc_args, str):
                            try:
                                tc_args = json.loads(tc_args)
                            except (json.JSONDecodeError, TypeError):
                                tc_args = {}
                        if not isinstance(tc_args, dict):
                            tc_args = {}
                        if tc_name:
                            fc_part = types.Part.from_function_call(
                                name=tc_name, args=tc_args
                            )
                            # Thinking-capable Gemini models require the original
                            # thought_signature to be echoed back on functionCall
                            # parts after a tool response, or the next request
                            # fails with INVALID_ARGUMENT.
                            sig = _decode_thought_signature(tc.get("thought_signature"))
                            if sig:
                                fc_part.thought_signature = sig
                            parts.append(fc_part)
                    if not parts:
                        parts.append(types.Part.from_text(text=" "))
                    gemini_messages.append(types.Content(role="model", parts=parts))
                elif role == "tool":
                    # Handle tool response
                    response_payload = (
                        content if isinstance(content, dict) else {"result": content}
                    )
                    gemini_messages.append(
                        types.Content(
                            role="function",
                            parts=[
                                types.Part.from_function_response(
                                    name=msg.get("name")
                                    or msg.get("tool_call_id")
                                    or "",
                                    response=response_payload,
                                )
                            ],
                        )
                    )
                else:  # user
                    gemini_messages.append(
                        types.Content(role="user", parts=_parts_from_content(content))
                    )

            # Convert tools to Gemini format
            gemini_tools = None
            if tools:
                gemini_tools = []
                for tool in tools:
                    if tool.get("type") == "function":
                        func = tool.get("function", {})
                        gemini_tools.append(
                            types.Tool(
                                function_declarations=[
                                    types.FunctionDeclaration(
                                        name=func.get("name", ""),
                                        description=func.get("description", ""),
                                        parameters=func.get("parameters", {}),
                                    )
                                ]
                            )
                        )

            # Configure tool choice
            tool_config = None
            if tool_choice:
                if tool_choice == "none":
                    tool_config = types.ToolConfig(
                        function_calling_config=types.FunctionCallingConfig(
                            mode=FunctionCallingConfigMode.NONE
                        )
                    )
                elif tool_choice == "auto":
                    tool_config = types.ToolConfig(
                        function_calling_config=types.FunctionCallingConfig(
                            mode=FunctionCallingConfigMode.AUTO
                        )
                    )
                elif tool_choice == "required":
                    tool_config = types.ToolConfig(
                        function_calling_config=types.FunctionCallingConfig(
                            mode=FunctionCallingConfigMode.ANY
                        )
                    )

            # Build request config
            config_params: dict[str, Any] = {"candidate_count": 1}

            if gemini_tools:
                config_params["tools"] = gemini_tools

            if tool_config:
                config_params["tool_config"] = tool_config

            # Ask thinking-capable models to include their reasoning trace
            # as separate `thought` parts (Gemini 2.5+; ignored elsewhere).
            config_params["thinking_config"] = types.ThinkingConfig(
                include_thoughts=True
            )

            # Merge runtime_options
            if isinstance(self.genai_config.runtime_options, dict):
                config_params.update(self.genai_config.runtime_options)

            # Use streaming API
            content_parts: list[str] = []
            reasoning_parts: list[str] = []
            tool_calls_accum: list[dict[str, Any]] = []
            finish_reason = "stop"
            usage_stats: dict[str, Any] | None = None

            stream = await self.provider.aio.models.generate_content_stream(
                model=self.genai_config.model,
                contents=gemini_messages,  # type: ignore[arg-type]
                config=types.GenerateContentConfig(**config_params),
            )

            async for chunk in stream:
                chunk_usage = getattr(chunk, "usage_metadata", None)
                if chunk_usage is not None:
                    maybe_stats = _stats_from_gemini_usage(chunk_usage)
                    if maybe_stats is not None:
                        usage_stats = maybe_stats

                if not chunk or not chunk.candidates:
                    continue

                candidate = chunk.candidates[0]

                # Check for finish reason
                if hasattr(candidate, "finish_reason") and candidate.finish_reason:
                    from google.genai.types import FinishReason

                    if candidate.finish_reason == FinishReason.STOP:
                        finish_reason = "stop"
                    elif candidate.finish_reason == FinishReason.MAX_TOKENS:
                        finish_reason = "length"
                    elif candidate.finish_reason in [
                        FinishReason.SAFETY,
                        FinishReason.RECITATION,
                    ]:
                        finish_reason = "error"

                # Extract content, reasoning, and tool calls from chunk
                if candidate.content and candidate.content.parts:
                    for part in candidate.content.parts:
                        if part.text:
                            if getattr(part, "thought", False):
                                reasoning_parts.append(part.text)
                                yield ("reasoning_delta", part.text)
                            else:
                                content_parts.append(part.text)
                                yield ("content_delta", part.text)
                        elif part.function_call:
                            # Gemini streams complete function calls (not partial
                            # argument deltas), so each part is a distinct tool
                            # call. Append rather than accumulate by name — the
                            # latter concatenated parallel/repeated calls into one
                            # invalid arguments string (e.g. `{...}{...}`).
                            try:
                                arguments = (
                                    dict(part.function_call.args)
                                    if part.function_call.args
                                    else {}
                                )
                            except Exception:
                                arguments = {}

                            tool_calls_accum.append(
                                {
                                    "id": part.function_call.name or "",
                                    "name": part.function_call.name or "",
                                    "arguments": arguments,
                                    "thought_signature": getattr(
                                        part, "thought_signature", None
                                    ),
                                }
                            )

            # Build final message
            full_content = "".join(content_parts).strip() or None
            full_reasoning = "".join(reasoning_parts).strip() or None

            # Convert tool calls to list format
            tool_calls_list = None
            if tool_calls_accum:
                tool_calls_list = [
                    {
                        "id": tc["id"],
                        "name": tc["name"],
                        "arguments": tc["arguments"]
                        if isinstance(tc["arguments"], dict)
                        else {},
                        "thought_signature": _encode_thought_signature(
                            tc.get("thought_signature")
                        ),
                    }
                    for tc in tool_calls_accum
                ]
                finish_reason = "tool_calls"

            if usage_stats is not None:
                yield ("stats", usage_stats)

            yield (
                "message",
                {
                    "content": full_content,
                    "reasoning": full_reasoning,
                    "tool_calls": tool_calls_list,
                    "finish_reason": finish_reason,
                },
            )

        except errors.APIError as e:
            logger.warning("Gemini API error during streaming: %s", str(e))
            yield (
                "message",
                {
                    "content": None,
                    "reasoning": None,
                    "tool_calls": None,
                    "finish_reason": "error",
                },
            )
        except Exception as e:
            logger.warning(
                "Gemini returned an error during chat_with_tools_stream: %s", str(e)
            )
            yield (
                "message",
                {
                    "content": None,
                    "reasoning": None,
                    "tool_calls": None,
                    "finish_reason": "error",
                },
            )
