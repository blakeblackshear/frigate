"""Ollama Provider for Frigate AI."""

import base64
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


def _normalize_multimodal_content(
    content: Any,
) -> tuple[Optional[str], Optional[list[bytes]]]:
    """Convert OpenAI-style multimodal content to Ollama's (text, images) shape.

    The chat API constructs user messages with content as a list of
    ``{"type": "text"}`` and ``{"type": "image_url"}`` parts when a tool
    returns a live frame. Ollama's SDK requires content to be a string and
    images to be passed in a separate field, so we extract each.
    """
    if not isinstance(content, list):
        return content, None

    text_parts: list[str] = []
    images: list[bytes] = []
    for part in content:
        if not isinstance(part, dict):
            continue
        part_type = part.get("type")
        if part_type == "text":
            text = part.get("text")
            if text:
                text_parts.append(str(text))
        elif part_type == "image_url":
            url = (part.get("image_url") or {}).get("url", "")
            if isinstance(url, str) and url.startswith("data:"):
                try:
                    encoded = url.split(",", 1)[1]
                    images.append(base64.b64decode(encoded, validate=True))
                except (ValueError, IndexError, base64.binascii.Error) as e:
                    logger.debug("Failed to decode multimodal image url: %s", e)

    return ("\n".join(text_parts) if text_parts else None), (images or None)


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

    def _auth_headers(self) -> dict | None:
        if self.genai_config.api_key:
            return {"Authorization": "Bearer " + self.genai_config.api_key}

        return None

    def _init_provider(self) -> ApiClient | None:
        """Initialize the client."""
        self.provider_options = {
            **self.LOCAL_OPTIMIZED_OPTIONS,
            **self.genai_config.provider_options,
        }

        try:
            client = ApiClient(
                host=self.genai_config.base_url,
                timeout=self.timeout,
                headers=self._auth_headers(),
            )
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
            logger.debug(
                "Ollama generate request: model=%s, prompt_len=%s, image_count=%s, "
                "has_format=%s, options=%s",
                self.genai_config.model,
                len(prompt),
                len(images) if images else 0,
                "format" in ollama_options,
                {k: v for k, v in ollama_options.items() if k != "format"},
            )
            result = self.provider.generate(
                self.genai_config.model,
                prompt,
                images=images if images else None,
                **ollama_options,
            )
            logger.debug(
                "Ollama generate response: done=%s, done_reason=%s, eval_count=%s, "
                "prompt_eval_count=%s, response_len=%s",
                result.get("done"),
                result.get("done_reason"),
                result.get("eval_count"),
                result.get("prompt_eval_count"),
                len(result.get("response", "") or ""),
            )
            response_text = str(result["response"]).strip()
            if not response_text:
                logger.warning(
                    "Ollama returned a blank response for model %s (done_reason=%s, "
                    "eval_count=%s). Check model output, ensure thinking is disabled.",
                    self.genai_config.model,
                    result.get("done_reason"),
                    result.get("eval_count"),
                )
            return response_text
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
        client = self.provider
        if client is None:
            # Provider init may have failed due to invalid model, but we can
            # still list available models with a fresh client.
            if not self.genai_config.base_url:
                return []
            try:
                client = ApiClient(
                    host=self.genai_config.base_url,
                    timeout=self.timeout,
                    headers=self._auth_headers(),
                )
            except Exception:
                return []
        try:
            response = client.list()
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
            content, images = _normalize_multimodal_content(msg.get("content", ""))
            msg_dict: dict[str, Any] = {
                "role": msg.get("role"),
                "content": content if content is not None else "",
            }
            if images:
                msg_dict["images"] = images
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
                    headers=self._auth_headers(),
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
                headers=self._auth_headers(),
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
