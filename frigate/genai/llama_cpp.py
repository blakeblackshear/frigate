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
    _context_size: int | None
    _supports_vision: bool
    _supports_audio: bool
    _supports_tools: bool

    def _init_provider(self) -> str | None:
        """Initialize the client and query model metadata from the server."""
        self.provider_options = {
            **self.genai_config.provider_options,
        }
        self._context_size = None
        self._supports_vision = False
        self._supports_audio = False
        self._supports_tools = False

        base_url = (
            self.genai_config.base_url.rstrip("/")
            if self.genai_config.base_url
            else None
        )

        if base_url is None:
            return None

        configured_model = self.genai_config.model

        # Query /v1/models to validate the configured model exists
        try:
            response = requests.get(
                f"{base_url}/v1/models",
                timeout=10,
            )
            response.raise_for_status()
            models_data = response.json()

            model_found = False
            for model in models_data.get("data", []):
                model_ids = {model.get("id")}
                for alias in model.get("aliases", []):
                    model_ids.add(alias)
                if configured_model in model_ids:
                    model_found = True
                    break

            if not model_found:
                available = []
                for m in models_data.get("data", []):
                    available.append(m.get("id", "unknown"))
                    for alias in m.get("aliases", []):
                        available.append(alias)
                logger.error(
                    "Model '%s' not found on llama.cpp server. Available models: %s",
                    configured_model,
                    available,
                )
                return None
        except Exception as e:
            logger.warning(
                "Failed to query llama.cpp /v1/models endpoint: %s. "
                "Model validation skipped.",
                e,
            )

        # Query /props for context size, modalities, and tool support.
        # The standard /props?model=<name> endpoint works with llama-server.
        # If it fails, try the llama-swap per-model passthrough endpoint which
        # returns props for a specific model without requiring it to be loaded.
        try:
            try:
                response = requests.get(
                    f"{base_url}/props",
                    params={"model": configured_model},
                    timeout=10,
                )
                response.raise_for_status()
                props = response.json()
            except Exception:
                response = requests.get(
                    f"{base_url}/upstream/{configured_model}/props",
                    timeout=10,
                )
                response.raise_for_status()
                props = response.json()

            # Context size from server runtime config
            default_settings = props.get("default_generation_settings", {})
            n_ctx = default_settings.get("n_ctx")
            if n_ctx:
                self._context_size = int(n_ctx)

            # Modalities (vision, audio)
            modalities = props.get("modalities", {})
            self._supports_vision = modalities.get("vision", False)
            self._supports_audio = modalities.get("audio", False)

            # Tool support from chat template capabilities
            chat_caps = props.get("chat_template_caps", {})
            self._supports_tools = chat_caps.get("supports_tools", False)

            logger.info(
                "llama.cpp model '%s' initialized — context: %s, vision: %s, audio: %s, tools: %s",
                configured_model,
                self._context_size or "unknown",
                self._supports_vision,
                self._supports_audio,
                self._supports_tools,
            )
        except Exception as e:
            logger.warning(
                "Failed to query llama.cpp /props endpoint: %s. "
                "Using defaults for context size and capabilities.",
                e,
            )

        return base_url

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

    @property
    def supports_vision(self) -> bool:
        """Whether the loaded model supports vision/image input."""
        return self._supports_vision

    @property
    def supports_audio(self) -> bool:
        """Whether the loaded model supports audio input."""
        return self._supports_audio

    @property
    def supports_tools(self) -> bool:
        """Whether the loaded model supports tool/function calling."""
        return self._supports_tools

    def list_models(self) -> list[str]:
        """Return available model IDs from the llama.cpp server."""
        if self.provider is None:
            return []
        try:
            response = requests.get(f"{self.provider}/v1/models", timeout=10)
            response.raise_for_status()
            models = []
            for m in response.json().get("data", []):
                models.append(m.get("id", "unknown"))
                for alias in m.get("aliases", []):
                    models.append(alias)
            return sorted(models)
        except Exception as e:
            logger.warning("Failed to list llama.cpp models: %s", e)
            return []

    def get_context_size(self) -> int:
        """Get the context window size for llama.cpp.

        Resolution order:
        1. provider_options["context_size"] (user override)
        2. Value queried from llama.cpp server at init
        3. Default fallback of 4096
        """
        if "context_size" in self.provider_options:
            return int(self.provider_options["context_size"])
        if self._context_size is not None:
            return self._context_size
        return 4096

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
