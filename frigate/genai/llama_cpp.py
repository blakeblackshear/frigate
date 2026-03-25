"""llama.cpp Provider for Frigate AI."""

import base64
import io
import json
import logging
from typing import Any, AsyncGenerator, Optional

import httpx
import numpy as np
import requests
from PIL import Image

from frigate.config import GenAIProviderEnum
from frigate.genai import GenAIClient, register_genai_provider
from frigate.genai.utils import parse_tool_calls_from_message

logger = logging.getLogger(__name__)


def _to_jpeg(img_bytes: bytes) -> bytes | None:
    """Convert image bytes to JPEG. llama.cpp/STB does not support WebP."""
    try:
        img = Image.open(io.BytesIO(img_bytes))
        if img.mode != "RGB":
            img = img.convert("RGB")  # type: ignore[assignment]
        buf = io.BytesIO()
        img.save(buf, format="JPEG", quality=85)
        return buf.getvalue()
    except Exception as e:
        logger.warning("Failed to convert image to JPEG: %s", e)
        return None


@register_genai_provider(GenAIProviderEnum.llamacpp)
class LlamaCppClient(GenAIClient):
    """Generative AI client for Frigate using llama.cpp server."""

    provider: str | None  # base_url
    provider_options: dict[str, Any]

    def _init_provider(self) -> str | None:
        """Initialize the client."""
        self.provider_options = {
            **self.genai_config.provider_options,
        }
        return (
            self.genai_config.base_url.rstrip("/")
            if self.genai_config.base_url
            else None
        )

    def _send(
        self,
        prompt: str,
        images: list[bytes],
        response_format: Optional[dict] = None,
    ) -> Optional[str]:
        """Submit a request to llama.cpp server."""
        if self.provider is None:
            logger.warning(
                "llama.cpp provider has not been initialized, a description will not be generated. Check your llama.cpp configuration."
            )
            return None

        try:
            content = [
                {
                    "type": "text",
                    "text": prompt,
                }
            ]
            for image in images:
                encoded_image = base64.b64encode(image).decode("utf-8")
                content.append(
                    {
                        "type": "image_url",
                        "image_url": {  # type: ignore[dict-item]
                            "url": f"data:image/jpeg;base64,{encoded_image}",
                        },
                    }
                )

            # Build request payload with llama.cpp native options
            payload = {
                "model": self.genai_config.model,
                "messages": [
                    {
                        "role": "user",
                        "content": content,
                    },
                ],
                **self.provider_options,
            }

            if response_format:
                payload["response_format"] = response_format

            response = requests.post(
                f"{self.provider}/v1/chat/completions",
                json=payload,
                timeout=self.timeout,
            )
            response.raise_for_status()
            result = response.json()

            if (
                result is not None
                and "choices" in result
                and len(result["choices"]) > 0
            ):
                choice = result["choices"][0]
                if "message" in choice and "content" in choice["message"]:
                    return str(choice["message"]["content"].strip())
            return None
        except Exception as e:
            logger.warning("llama.cpp returned an error: %s", str(e))
            return None

    def get_context_size(self) -> int:
        """Get the context window size for llama.cpp."""
        return int(self.provider_options.get("context_size", 4096))

    def _build_payload(
        self,
        messages: list[dict[str, Any]],
        tools: Optional[list[dict[str, Any]]],
        tool_choice: Optional[str],
        stream: bool = False,
    ) -> dict[str, Any]:
        """Build request payload for chat completions (sync or stream)."""
        openai_tool_choice = None
        if tool_choice:
            if tool_choice == "none":
                openai_tool_choice = "none"
            elif tool_choice == "auto":
                openai_tool_choice = "auto"
            elif tool_choice == "required":
                openai_tool_choice = "required"

        payload: dict[str, Any] = {
            "messages": messages,
            "model": self.genai_config.model,
        }
        if stream:
            payload["stream"] = True
        if tools:
            payload["tools"] = tools
            if openai_tool_choice is not None:
                payload["tool_choice"] = openai_tool_choice
        provider_opts = {
            k: v for k, v in self.provider_options.items() if k != "context_size"
        }
        payload.update(provider_opts)
        return payload

    def _message_from_choice(self, choice: dict[str, Any]) -> dict[str, Any]:
        """Parse OpenAI-style choice into {content, tool_calls, finish_reason}."""
        message = choice.get("message", {})
        content = message.get("content")
        content = content.strip() if content else None
        tool_calls = parse_tool_calls_from_message(message)
        finish_reason = choice.get("finish_reason") or (
            "tool_calls" if tool_calls else "stop" if content else "error"
        )
        return {
            "content": content,
            "tool_calls": tool_calls,
            "finish_reason": finish_reason,
        }

    @staticmethod
    def _streamed_tool_calls_to_list(
        tool_calls_by_index: dict[int, dict[str, Any]],
    ) -> Optional[list[dict[str, Any]]]:
        """Convert streamed tool_calls index map to list of {id, name, arguments}."""
        if not tool_calls_by_index:
            return None
        result = []
        for idx in sorted(tool_calls_by_index.keys()):
            t = tool_calls_by_index[idx]
            args_str = t.get("arguments") or "{}"
            try:
                arguments = json.loads(args_str)
            except json.JSONDecodeError:
                arguments = {}
            result.append(
                {
                    "id": t.get("id", ""),
                    "name": t.get("name", ""),
                    "arguments": arguments,
                }
            )
        return result if result else None

    def embed(
        self,
        texts: list[str] | None = None,
        images: list[bytes] | None = None,
    ) -> list[np.ndarray]:
        """Generate embeddings via llama.cpp /embeddings endpoint.

        Supports batch requests. Uses content format with prompt_string and
        multimodal_data for images (PR #15108). Server must be started with
        --embeddings and --mmproj for multimodal support.
        """
        if self.provider is None:
            logger.warning(
                "llama.cpp provider has not been initialized. Check your llama.cpp configuration."
            )
            return []

        texts = texts or []
        images = images or []
        if not texts and not images:
            return []

        EMBEDDING_DIM = 768

        content = []
        for text in texts:
            content.append({"prompt_string": text})
        for img in images:
            # llama.cpp uses STB which does not support WebP; convert to JPEG
            jpeg_bytes = _to_jpeg(img)
            to_encode = jpeg_bytes if jpeg_bytes is not None else img
            encoded = base64.b64encode(to_encode).decode("utf-8")
            # prompt_string must contain <__media__> placeholder for image tokenization
            content.append(
                {
                    "prompt_string": "<__media__>\n",
                    "multimodal_data": [encoded],  # type: ignore[dict-item]
                }
            )

        try:
            response = requests.post(
                f"{self.provider}/embeddings",
                json={"model": self.genai_config.model, "content": content},
                timeout=self.timeout,
            )
            response.raise_for_status()
            result = response.json()

            items = result.get("data", result) if isinstance(result, dict) else result
            if not isinstance(items, list):
                logger.warning("llama.cpp embeddings returned unexpected format")
                return []

            embeddings = []
            for item in items:
                emb = item.get("embedding") if isinstance(item, dict) else None
                if emb is None:
                    logger.warning("llama.cpp embeddings item missing embedding field")
                    continue
                arr = np.array(emb, dtype=np.float32)
                if arr.ndim > 1:
                    # llama.cpp can return token-level embeddings; pool per item
                    arr = arr.mean(axis=0)
                arr = arr.flatten()
                orig_dim = arr.size
                if orig_dim != EMBEDDING_DIM:
                    if orig_dim > EMBEDDING_DIM:
                        arr = arr[:EMBEDDING_DIM]
                        logger.debug(
                            "Truncated llama.cpp embedding from %d to %d dimensions",
                            orig_dim,
                            EMBEDDING_DIM,
                        )
                    else:
                        arr = np.pad(
                            arr,
                            (0, EMBEDDING_DIM - orig_dim),
                            mode="constant",
                            constant_values=0,
                        )
                        logger.debug(
                            "Padded llama.cpp embedding from %d to %d dimensions",
                            orig_dim,
                            EMBEDDING_DIM,
                        )
                embeddings.append(arr)
            return embeddings
        except requests.exceptions.Timeout:
            logger.warning("llama.cpp embeddings request timed out")
            return []
        except requests.exceptions.RequestException as e:
            error_detail = str(e)
            if hasattr(e, "response") and e.response is not None:
                try:
                    error_detail = f"{str(e)} - Response: {e.response.text[:500]}"
                except Exception:
                    pass
            logger.warning("llama.cpp embeddings error: %s", error_detail)
            return []
        except Exception as e:
            logger.warning("Unexpected error in llama.cpp embeddings: %s", str(e))
            return []

    def chat_with_tools(
        self,
        messages: list[dict[str, Any]],
        tools: Optional[list[dict[str, Any]]] = None,
        tool_choice: Optional[str] = "auto",
    ) -> dict[str, Any]:
        """
        Send chat messages to llama.cpp server with optional tool definitions.

        Uses the OpenAI-compatible endpoint but passes through all native llama.cpp
        parameters (like slot_id, temperature, etc.) via provider_options.
        """
        if self.provider is None:
            logger.warning(
                "llama.cpp provider has not been initialized. Check your llama.cpp configuration."
            )
            return {
                "content": None,
                "tool_calls": None,
                "finish_reason": "error",
            }
        try:
            payload = self._build_payload(messages, tools, tool_choice, stream=False)
            response = requests.post(
                f"{self.provider}/v1/chat/completions",
                json=payload,
                timeout=self.timeout,
            )
            response.raise_for_status()
            result = response.json()
            if result is None or "choices" not in result or len(result["choices"]) == 0:
                return {
                    "content": None,
                    "tool_calls": None,
                    "finish_reason": "error",
                }
            return self._message_from_choice(result["choices"][0])
        except requests.exceptions.Timeout as e:
            logger.warning("llama.cpp request timed out: %s", str(e))
            return {
                "content": None,
                "tool_calls": None,
                "finish_reason": "error",
            }
        except requests.exceptions.RequestException as e:
            error_detail = str(e)
            if hasattr(e, "response") and e.response is not None:
                try:
                    error_detail = f"{str(e)} - Response: {e.response.text[:500]}"
                except Exception:
                    pass
            logger.warning("llama.cpp returned an error: %s", error_detail)
            return {
                "content": None,
                "tool_calls": None,
                "finish_reason": "error",
            }
        except Exception as e:
            logger.warning("Unexpected error in llama.cpp chat_with_tools: %s", str(e))
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
        """Stream chat with tools via OpenAI-compatible streaming API."""
        if self.provider is None:
            logger.warning(
                "llama.cpp provider has not been initialized. Check your llama.cpp configuration."
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
            payload = self._build_payload(messages, tools, tool_choice, stream=True)
            content_parts: list[str] = []
            tool_calls_by_index: dict[int, dict[str, Any]] = {}
            finish_reason = "stop"

            async with httpx.AsyncClient(timeout=float(self.timeout)) as client:
                async with client.stream(
                    "POST",
                    f"{self.provider}/v1/chat/completions",
                    json=payload,
                ) as response:
                    response.raise_for_status()
                    async for line in response.aiter_lines():
                        if not line.startswith("data: "):
                            continue
                        data_str = line[6:].strip()
                        if data_str == "[DONE]":
                            break
                        try:
                            data = json.loads(data_str)
                        except json.JSONDecodeError:
                            continue
                        choices = data.get("choices") or []
                        if not choices:
                            continue
                        delta = choices[0].get("delta", {})
                        if choices[0].get("finish_reason"):
                            finish_reason = choices[0]["finish_reason"]
                        if delta.get("content"):
                            content_parts.append(delta["content"])
                            yield ("content_delta", delta["content"])
                        for tc in delta.get("tool_calls") or []:
                            idx = tc.get("index", 0)
                            fn = tc.get("function") or {}
                            if idx not in tool_calls_by_index:
                                tool_calls_by_index[idx] = {
                                    "id": tc.get("id", ""),
                                    "name": tc.get("name") or fn.get("name", ""),
                                    "arguments": "",
                                }
                            t = tool_calls_by_index[idx]
                            if tc.get("id"):
                                t["id"] = tc["id"]
                            name = tc.get("name") or fn.get("name")
                            if name:
                                t["name"] = name
                            arg = tc.get("arguments") or fn.get("arguments")
                            if arg is not None:
                                t["arguments"] += (
                                    arg if isinstance(arg, str) else json.dumps(arg)
                                )

            full_content = "".join(content_parts).strip() or None
            tool_calls_list = self._streamed_tool_calls_to_list(tool_calls_by_index)
            if tool_calls_list:
                finish_reason = "tool_calls"
            yield (
                "message",
                {
                    "content": full_content,
                    "tool_calls": tool_calls_list,
                    "finish_reason": finish_reason,
                },
            )
        except httpx.HTTPStatusError as e:
            logger.warning("llama.cpp streaming HTTP error: %s", e)
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
                "Unexpected error in llama.cpp chat_with_tools_stream: %s", str(e)
            )
            yield (
                "message",
                {
                    "content": None,
                    "tool_calls": None,
                    "finish_reason": "error",
                },
            )
