"""Ollama Provider for Frigate AI."""

import json
import logging
from typing import Any, AsyncGenerator, Optional

from httpx import RemoteProtocolError, TimeoutException
from ollama import AsyncClient as OllamaAsyncClient
from ollama import Client as ApiClient
from ollama import ResponseError

from frigate.config import GenAIProviderEnum
from frigate.genai import GenAIClient, register_genai_provider
from frigate.genai.utils import parse_tool_calls_from_message

logger = logging.getLogger(__name__)


@register_genai_provider(GenAIProviderEnum.ollama)
class OllamaClient(GenAIClient):
    """Generative AI client for Frigate using Ollama."""

    LOCAL_OPTIMIZED_OPTIONS = {
        "options": {
            "temperature": 0.5,
            "repeat_penalty": 1.05,
            "presence_penalty": 0.3,
        },
    }

    provider: ApiClient | None
    provider_options: dict[str, Any]

    def _init_provider(self) -> ApiClient | None:
        """Initialize the client."""
        self.provider_options = {
            **self.LOCAL_OPTIMIZED_OPTIONS,
            **self.genai_config.provider_options,
        }

        try:
            client = ApiClient(host=self.genai_config.base_url, timeout=self.timeout)
            # ensure the model is available locally
            response = client.show(self.genai_config.model)
            if response.get("error"):
                logger.error(
                    "Ollama error: %s",
                    response["error"],
                )
                return None
            return client
        except Exception as e:
            logger.warning("Error initializing Ollama: %s", str(e))
            return None

    @staticmethod
    def _clean_schema_for_ollama(schema: dict, *, _is_properties: bool = False) -> dict:
        """Strip Pydantic metadata from a JSON schema for Ollama compatibility.

        Ollama's grammar-based constrained generation works best with minimal
        schemas. Pydantic adds title/description/constraint fields that can
        cause the grammar generator to silently skip required fields.

        Keys inside a ``properties`` dict are actual field names and must never
        be stripped, even if they collide with a metadata key name (e.g. a
        model field called ``title``).
        """
        STRIP_KEYS = {
            "title",
            "description",
            "minimum",
            "maximum",
            "exclusiveMinimum",
            "exclusiveMaximum",
        }
        result: dict[str, Any] = {}
        for key, value in schema.items():
            if not _is_properties and key in STRIP_KEYS:
                continue
            if isinstance(value, dict):
                result[key] = OllamaClient._clean_schema_for_ollama(
                    value, _is_properties=(key == "properties")
                )
            elif isinstance(value, list):
                result[key] = [
                    OllamaClient._clean_schema_for_ollama(item)
                    if isinstance(item, dict)
                    else item
                    for item in value
                ]
            else:
                result[key] = value
        return result

    def _send(
        self,
        prompt: str,
        images: list[bytes],
        response_format: Optional[dict] = None,
    ) -> Optional[str]:
        """Submit a request to Ollama"""
        if self.provider is None:
            logger.warning(
                "Ollama provider has not been initialized, a description will not be generated. Check your Ollama configuration."
            )
            return None
        try:
            ollama_options = {
                **self.provider_options,
                **self.genai_config.runtime_options,
            }
            if response_format and response_format.get("type") == "json_schema":
                schema = response_format.get("json_schema", {}).get("schema")
                if schema:
                    ollama_options["format"] = self._clean_schema_for_ollama(schema)
            result = self.provider.generate(
                self.genai_config.model,
                prompt,
                images=images if images else None,
                **ollama_options,
            )
            logger.debug(
                f"Ollama tokens used: eval_count={result.get('eval_count')}, prompt_eval_count={result.get('prompt_eval_count')}"
            )
            return str(result["response"]).strip()
        except (
            TimeoutException,
            ResponseError,
            RemoteProtocolError,
            ConnectionError,
        ) as e:
            logger.warning("Ollama returned an error: %s", str(e))
            return None

    def list_models(self) -> list[str]:
        """Return available model names from the Ollama server."""
        if self.provider is None:
            return []
        try:
            response = self.provider.list()
            return sorted(
                m.get("name", m.get("model", "")) for m in response.get("models", [])
            )
        except Exception as e:
            logger.warning("Failed to list Ollama models: %s", e)
            return []

    def get_context_size(self) -> int:
        """Get the context window size for Ollama."""
        return int(
            self.genai_config.provider_options.get("options", {}).get("num_ctx", 4096)
        )

    def _build_request_params(
        self,
        messages: list[dict[str, Any]],
        tools: Optional[list[dict[str, Any]]],
        tool_choice: Optional[str],
        stream: bool = False,
    ) -> dict[str, Any]:
        """Build request_messages and params for chat (sync or stream)."""
        request_messages = []
        for msg in messages:
            msg_dict = {
                "role": msg.get("role"),
                "content": msg.get("content", ""),
            }
            if msg.get("tool_call_id"):
                msg_dict["tool_call_id"] = msg["tool_call_id"]
            if msg.get("name"):
                msg_dict["name"] = msg["name"]
            if msg.get("tool_calls"):
                # Ollama requires tool call arguments as dicts, but the
                # conversation format (OpenAI-style) stores them as JSON
                # strings. Convert back to dicts for Ollama.
                ollama_tool_calls = []
                for tc in msg["tool_calls"]:
                    func = tc.get("function") or {}
                    args = func.get("arguments") or {}
                    if isinstance(args, str):
                        try:
                            args = json.loads(args)
                        except (json.JSONDecodeError, TypeError):
                            args = {}
                    ollama_tool_calls.append(
                        {"function": {"name": func.get("name", ""), "arguments": args}}
                    )
                msg_dict["tool_calls"] = ollama_tool_calls
            request_messages.append(msg_dict)

        request_params: dict[str, Any] = {
            "model": self.genai_config.model,
            "messages": request_messages,
            **self.provider_options,
        }
        if stream:
            request_params["stream"] = True
        if tools:
            request_params["tools"] = tools
        return request_params

    def _message_from_response(self, response: dict[str, Any]) -> dict[str, Any]:
        """Parse Ollama chat response into {content, tool_calls, finish_reason}."""
        if not response or "message" not in response:
            logger.debug("Ollama response empty or missing 'message' key")
            return {
                "content": None,
                "tool_calls": None,
                "finish_reason": "error",
            }
        message = response["message"]
        logger.debug(
            "Ollama response message keys: %s, content_len=%s, thinking_len=%s, "
            "tool_calls=%s, done=%s",
            list(message.keys()) if hasattr(message, "keys") else "N/A",
            len(message.get("content", "") or "") if message.get("content") else 0,
            len(message.get("thinking", "") or "") if message.get("thinking") else 0,
            bool(message.get("tool_calls")),
            response.get("done"),
        )
        content = message.get("content", "").strip() if message.get("content") else None
        tool_calls = parse_tool_calls_from_message(message)
        finish_reason = "error"
        if response.get("done"):
            finish_reason = (
                "tool_calls" if tool_calls else "stop" if content else "error"
            )
        elif tool_calls:
            finish_reason = "tool_calls"
        elif content:
            finish_reason = "stop"
        return {
            "content": content,
            "tool_calls": tool_calls,
            "finish_reason": finish_reason,
        }

    def chat_with_tools(
        self,
        messages: list[dict[str, Any]],
        tools: Optional[list[dict[str, Any]]] = None,
        tool_choice: Optional[str] = "auto",
    ) -> dict[str, Any]:
        if self.provider is None:
            logger.warning(
                "Ollama provider has not been initialized. Check your Ollama configuration."
            )
            return {
                "content": None,
                "tool_calls": None,
                "finish_reason": "error",
            }
        try:
            request_params = self._build_request_params(
                messages, tools, tool_choice, stream=False
            )
            response = self.provider.chat(**request_params)
            return self._message_from_response(response)
        except (TimeoutException, ResponseError, ConnectionError) as e:
            logger.warning("Ollama returned an error: %s", str(e))
            return {
                "content": None,
                "tool_calls": None,
                "finish_reason": "error",
            }
        except Exception as e:
            logger.warning("Unexpected error in Ollama chat_with_tools: %s", str(e))
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
    ) -> AsyncGenerator[tuple[str, Any], None]:
        """Stream chat with tools; yields content deltas then final message.

        When tools are provided, Ollama streaming does not include tool_calls
        in the response chunks. To work around this, we use a non-streaming
        call when tools are present to ensure tool calls are captured, then
        emit the content as a single delta followed by the final message.
        """
        if self.provider is None:
            logger.warning(
                "Ollama provider has not been initialized. Check your Ollama configuration."
            )
            yield (
                "message",
                {
                    "content": None,
                    "tool_calls": None,
                    "finish_reason": "error",
                },
            )
            return
        try:
            # Ollama does not return tool_calls in streaming mode, so fall
            # back to a non-streaming call when tools are provided.
            if tools:
                logger.debug(
                    "Ollama: tools provided, using non-streaming call for tool support"
                )
                request_params = self._build_request_params(
                    messages, tools, tool_choice, stream=False
                )
                async_client = OllamaAsyncClient(
                    host=self.genai_config.base_url,
                    timeout=self.timeout,
                )
                response = await async_client.chat(**request_params)
                result = self._message_from_response(response)
                content = result.get("content")
                if content:
                    yield ("content_delta", content)
                yield ("message", result)
                return

            request_params = self._build_request_params(
                messages, tools, tool_choice, stream=True
            )
            async_client = OllamaAsyncClient(
                host=self.genai_config.base_url,
                timeout=self.timeout,
            )
            content_parts: list[str] = []
            final_message: dict[str, Any] | None = None
            stream = await async_client.chat(**request_params)
            async for chunk in stream:
                if not chunk or "message" not in chunk:
                    continue
                msg = chunk.get("message", {})
                delta = msg.get("content") or ""
                if delta:
                    content_parts.append(delta)
                    yield ("content_delta", delta)
                if chunk.get("done"):
                    full_content = "".join(content_parts).strip() or None
                    final_message = {
                        "content": full_content,
                        "tool_calls": None,
                        "finish_reason": "stop",
                    }
                    break

            if final_message is not None:
                yield ("message", final_message)
            else:
                yield (
                    "message",
                    {
                        "content": "".join(content_parts).strip() or None,
                        "tool_calls": None,
                        "finish_reason": "stop",
                    },
                )
        except (TimeoutException, ResponseError, ConnectionError) as e:
            logger.warning("Ollama streaming error: %s", str(e))
            yield (
                "message",
                {
                    "content": None,
                    "tool_calls": None,
                    "finish_reason": "error",
                },
            )
        except Exception as e:
            logger.warning(
                "Unexpected error in Ollama chat_with_tools_stream: %s", str(e)
            )
            yield (
                "message",
                {
                    "content": None,
                    "tool_calls": None,
                    "finish_reason": "error",
                },
            )
