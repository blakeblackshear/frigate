"""llama.cpp Provider for Frigate AI."""

import base64
import io
import json
import logging
from typing import Any, AsyncGenerator, Optional, cast

import httpx
import numpy as np
import requests
from PIL import Image

from frigate.config import GenAIProviderEnum
from frigate.genai import GenAIClient, register_genai_provider
from frigate.genai.utils import parse_tool_calls_from_message

logger = logging.getLogger(__name__)


def _stats_from_llama_cpp_chunk(data: dict[str, Any]) -> Optional[dict[str, Any]]:
    """Build a stats dict from a llama.cpp streaming chunk.

    Final-chunk `usage` carries authoritative token counts. Per-chunk
    `timings` (enabled via timings_per_token) carries the running token
    counts (prompt_n, predicted_n) and generation rate, so live updates
    work mid-stream.
    """
    usage = data.get("usage") or {}
    timings = data.get("timings") or {}
    prompt_tokens = usage.get("prompt_tokens")
    completion_tokens = usage.get("completion_tokens")
    predicted_ms = timings.get("predicted_ms")
    tps = timings.get("predicted_per_second")
    stats: dict[str, Any] = {}

    if not isinstance(prompt_tokens, int):
        prompt_n = timings.get("prompt_n")

        if isinstance(prompt_n, int):
            prompt_tokens = prompt_n

    if not isinstance(completion_tokens, int):
        predicted_n = timings.get("predicted_n")

        if isinstance(predicted_n, int):
            completion_tokens = predicted_n

    if not isinstance(prompt_tokens, int) and not isinstance(completion_tokens, int):
        return None

    if isinstance(prompt_tokens, int):
        stats["prompt_tokens"] = prompt_tokens

    if isinstance(completion_tokens, int):
        stats["completion_tokens"] = completion_tokens

    if isinstance(predicted_ms, (int, float)) and predicted_ms > 0:
        stats["completion_duration_ms"] = float(predicted_ms)

    if isinstance(tps, (int, float)) and tps > 0:
        stats["tokens_per_second"] = float(tps)

    return stats or None


def _parse_launch_arg(args: list[str], flag: str) -> str | None:
    """Return the value following `flag` in a positional argv list, or None."""
    try:
        idx = args.index(flag)
    except ValueError:
        return None
    if idx + 1 >= len(args):
        return None
    return args[idx + 1]


def _fetch_llama_props(base_url: str, model: str) -> dict[str, Any]:
    """Fetch /props from a llama.cpp server, with llama-swap fallback.

    Raises the underlying RequestException if both endpoints fail; callers
    decide how to surface the failure.
    """
    try:
        response = requests.get(
            f"{base_url}/props",
            params={"model": model},
            timeout=10,
        )
        response.raise_for_status()
        return cast(dict[str, Any], response.json())
    except Exception:
        response = requests.get(
            f"{base_url}/upstream/{model}/props",
            timeout=10,
        )
        response.raise_for_status()
        return cast(dict[str, Any], response.json())


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
    _supports_reasoning: bool
    _image_token_cache: dict[tuple[int, int], int]
    _text_baseline_tokens: int | None
    _media_marker: str

    def _init_provider(self) -> str | None:
        """Initialize the client and query model metadata from the server."""
        self.provider_options = {
            **self.genai_config.provider_options,
        }
        self._context_size = None
        self._supports_vision = False
        self._supports_audio = False
        self._supports_tools = False
        self._supports_reasoning = False
        self._image_token_cache = {}
        self._text_baseline_tokens = None
        self._media_marker = "<__media__>"

        base_url = (
            self.genai_config.base_url.rstrip("/")
            if self.genai_config.base_url
            else None
        )

        if base_url is None:
            return None
        else:
            base_url = base_url.replace("/v1", "")  # Strip /v1 if included in base_url

        if not self.validate_model:
            # Probe path
            return base_url

        configured_model = self.genai_config.model
        info = self._get_model_info(base_url, configured_model)

        if info is None:
            return None

        self._context_size = info["context_size"]
        self._supports_vision = info["supports_vision"]
        self._supports_audio = info["supports_audio"]
        self._supports_tools = info["supports_tools"]
        self._supports_reasoning = info["supports_reasoning"]
        self._media_marker = info["media_marker"]

        logger.info(
            "llama.cpp model '%s' initialized — context: %s, vision: %s, audio: %s, tools: %s, reasoning: %s",
            configured_model,
            self._context_size or "unknown",
            self._supports_vision,
            self._supports_audio,
            self._supports_tools,
            self._supports_reasoning,
        )

        return base_url

    def _get_model_info(
        self, base_url: str, configured_model: str
    ) -> dict[str, Any] | None:
        """Resolve model metadata from /v1/models with /props fallback.

        Returns a dict of capability fields, or None if the server's model
        registry was reachable and reported the configured model as missing.
        A reachable-but-unparseable /v1/models is treated as soft-pass and
        falls through to /props, matching prior behavior.

        After ggml-org/llama.cpp#22952, /v1/models exposes per-model
        `architecture.input_modalities` (text/image/audio) — the primary
        source. When proxied through llama-swap, the same entry carries
        `status.args` (server launch argv) and, for the loaded model,
        `meta.n_ctx`. /props remains the only source for `media_marker`,
        which the server randomizes per startup unless LLAMA_MEDIA_MARKER
        is set.
        """
        info: dict[str, Any] = {
            "context_size": None,
            "supports_vision": False,
            "supports_audio": False,
            "supports_tools": False,
            "supports_reasoning": False,
            "media_marker": "<__media__>",
        }

        model_entry: dict[str, Any] | None = None
        try:
            response = requests.get(f"{base_url}/v1/models", timeout=10)
            response.raise_for_status()
            models_data = response.json()

            for model in models_data.get("data", []):
                model_ids = {model.get("id")}
                for alias in model.get("aliases", []):
                    model_ids.add(alias)
                if configured_model in model_ids:
                    model_entry = model
                    break

            if model_entry is None:
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

        if model_entry is not None:
            architecture = model_entry.get("architecture") or {}
            input_modalities = architecture.get("input_modalities") or []

            if isinstance(input_modalities, list):
                info["supports_vision"] = "image" in input_modalities
                info["supports_audio"] = "audio" in input_modalities

            status = model_entry.get("status") or {}
            launch_args = status.get("args") if isinstance(status, dict) else None
            if not isinstance(launch_args, list):
                launch_args = []

            meta = model_entry.get("meta") if isinstance(model_entry, dict) else None
            n_ctx = meta.get("n_ctx") if isinstance(meta, dict) else None

            if not n_ctx:
                n_ctx = _parse_launch_arg(launch_args, "--ctx-size")

            if n_ctx:
                try:
                    info["context_size"] = int(n_ctx)
                except (TypeError, ValueError):
                    pass

            # Tool calling on llama-server requires --jinja.
            if "--jinja" in launch_args:
                info["supports_tools"] = True

        try:
            props = _fetch_llama_props(base_url, configured_model)

            if info["context_size"] is None:
                default_settings = props.get("default_generation_settings", {})
                n_ctx = default_settings.get("n_ctx")
                if n_ctx:
                    info["context_size"] = int(n_ctx)

            if not (info["supports_vision"] or info["supports_audio"]):
                modalities = props.get("modalities", {})
                info["supports_vision"] = bool(modalities.get("vision", False))
                info["supports_audio"] = bool(modalities.get("audio", False))

            chat_caps = props.get("chat_template_caps") or {}

            if not info["supports_tools"]:
                info["supports_tools"] = bool(chat_caps.get("supports_tools", False))

            # llama.cpp does not advertise per-template reasoning support, so
            # detect it by looking for the `enable_thinking` toggle variable
            # in the Jinja chat template itself.
            chat_template = props.get("chat_template") or ""
            info["supports_reasoning"] = "enable_thinking" in chat_template

            media_marker = props.get("media_marker")
            if isinstance(media_marker, str) and media_marker:
                info["media_marker"] = media_marker
        except Exception as e:
            logger.warning(
                "Failed to query llama.cpp /props endpoint: %s. "
                "Image embeddings may fail if the server randomized its media marker.",
                e,
            )

        return info

    def _send(
        self,
        prompt: str,
        images: list[bytes],
        response_format: Optional[dict] = None,
        enable_thinking: bool = False,
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
            payload: dict[str, Any] = {
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

            if self.supports_toggleable_thinking:
                payload["chat_template_kwargs"] = {"enable_thinking": enable_thinking}

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

    @property
    def supports_toggleable_thinking(self) -> bool:
        return self._supports_reasoning

    def list_models(self) -> list[str]:
        """Return available model IDs from the llama.cpp server."""
        base_url = self.provider or (
            self.genai_config.base_url.rstrip("/")
            if self.genai_config.base_url
            else None
        )
        if base_url is None:
            return []
        try:
            response = requests.get(f"{base_url}/v1/models", timeout=10)
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

    def estimate_image_tokens(self, width: int, height: int) -> float:
        """Probe the llama.cpp server to learn the model's image-token cost at the
        requested dimensions.

        llama.cpp's image tokenization is a deterministic function of dimensions and
        the loaded mmproj, so the result is cached per (width, height) for the
        lifetime of the process. Falls back to the base pixel heuristic if the
        server is unreachable or the response is malformed.
        """
        if self.provider is None:
            return super().estimate_image_tokens(width, height)

        cached = self._image_token_cache.get((width, height))

        if cached is not None:
            return cached

        try:
            baseline = self._probe_baseline_tokens()
            with_image = self._probe_image_prompt_tokens(width, height)
            tokens = max(1, with_image - baseline)
        except Exception as e:
            logger.debug(
                "llama.cpp image-token probe failed for %dx%d (%s); using heuristic",
                width,
                height,
                e,
            )
            return super().estimate_image_tokens(width, height)

        self._image_token_cache[(width, height)] = tokens
        logger.debug(
            "llama.cpp model '%s' uses ~%d tokens for %dx%d images",
            self.genai_config.model,
            tokens,
            width,
            height,
        )
        return tokens

    def _probe_baseline_tokens(self) -> int:
        """Return prompt_tokens for a minimal text-only request. Cached after first call."""
        if self._text_baseline_tokens is not None:
            return self._text_baseline_tokens

        self._text_baseline_tokens = self._probe_prompt_tokens(
            [{"type": "text", "text": "."}]
        )
        return self._text_baseline_tokens

    def _probe_image_prompt_tokens(self, width: int, height: int) -> int:
        """Return prompt_tokens for a single synthetic image plus minimal text."""
        img = Image.new("RGB", (width, height), (128, 128, 128))
        buf = io.BytesIO()
        img.save(buf, format="JPEG", quality=60)
        encoded = base64.b64encode(buf.getvalue()).decode("utf-8")
        return self._probe_prompt_tokens(
            [
                {"type": "text", "text": "."},
                {
                    "type": "image_url",
                    "image_url": {"url": f"data:image/jpeg;base64,{encoded}"},
                },
            ]
        )

    def _probe_prompt_tokens(self, content: list[dict[str, Any]]) -> int:
        """POST a 1-token chat completion and return reported prompt_tokens.

        Uses a generous timeout to absorb a cold model load on the first probe
        when the server lazily loads models on demand (e.g. llama-swap).
        """
        payload = {
            "model": self.genai_config.model,
            "messages": [{"role": "user", "content": content}],
            "max_tokens": 1,
        }
        response = requests.post(
            f"{self.provider}/v1/chat/completions",
            json=payload,
            timeout=60,
        )
        response.raise_for_status()
        return int(response.json()["usage"]["prompt_tokens"])

    def _build_payload(
        self,
        messages: list[dict[str, Any]],
        tools: Optional[list[dict[str, Any]]],
        tool_choice: Optional[str],
        stream: bool = False,
        enable_thinking: Optional[bool] = None,
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
            payload["stream_options"] = {"include_usage": True}
            payload["timings_per_token"] = True

        if tools:
            payload["tools"] = tools

            if openai_tool_choice is not None:
                payload["tool_choice"] = openai_tool_choice

        if enable_thinking is not None and self._supports_reasoning:
            payload["chat_template_kwargs"] = {"enable_thinking": enable_thinking}

        provider_opts = {
            k: v for k, v in self.provider_options.items() if k != "context_size"
        }
        payload.update(provider_opts)
        payload.update(self.genai_config.runtime_options)
        return payload

    def _message_from_choice(self, choice: dict[str, Any]) -> dict[str, Any]:
        """Parse OpenAI-style choice into {content, reasoning, tool_calls, finish_reason}.

        llama.cpp's `--reasoning-format` puts the trace in
        `message.reasoning_content` (preferred) or `message.thinking`; both
        keys are accepted so different builds work without configuration.
        """
        message = choice.get("message", {})
        content = message.get("content")
        content = content.strip() if content else None
        reasoning = message.get("reasoning_content") or message.get("thinking")
        reasoning = reasoning.strip() if reasoning else None
        tool_calls = parse_tool_calls_from_message(message)
        finish_reason = choice.get("finish_reason") or (
            "tool_calls" if tool_calls else "stop" if content else "error"
        )
        return {
            "content": content,
            "reasoning": reasoning,
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

    def _refresh_media_marker(self) -> bool:
        """Re-fetch /props and update the cached media marker if it changed.

        The server randomizes the marker per startup (unless LLAMA_MEDIA_MARKER
        is set), so a stale marker indicates a restart. Returns True iff the
        marker was updated to a new value — used to gate a one-shot retry of
        a failed embeddings request.
        """
        if self.provider is None:
            return False
        try:
            props = _fetch_llama_props(self.provider, self.genai_config.model)
        except Exception as e:
            logger.warning("Failed to refresh llama.cpp media marker: %s", e)
            return False

        marker = props.get("media_marker")

        if not isinstance(marker, str) or not marker or marker == self._media_marker:
            return False

        logger.info("llama.cpp media marker changed (server restart); refreshed")
        self._media_marker = marker
        return True

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

        encoded_images: list[str] = []
        for img in images:
            # llama.cpp uses STB which does not support WebP; convert to JPEG
            jpeg_bytes = _to_jpeg(img)
            to_encode = jpeg_bytes if jpeg_bytes is not None else img
            encoded_images.append(base64.b64encode(to_encode).decode("utf-8"))

        def build_content() -> list[dict[str, Any]]:
            # prompt_string must contain the server's media marker placeholder
            # for each image. The marker is randomized per server startup.
            content: list[dict[str, Any]] = []
            for text in texts:
                content.append({"prompt_string": text})
            for encoded in encoded_images:
                content.append(
                    {
                        "prompt_string": f"{self._media_marker}\n",
                        "multimodal_data": [encoded],
                    }
                )
            return content

        def post_embeddings() -> requests.Response:
            return requests.post(
                f"{self.provider}/embeddings",
                json={"model": self.genai_config.model, "content": build_content()},
                timeout=self.timeout,
            )

        try:
            try:
                response = post_embeddings()
                response.raise_for_status()
            except requests.exceptions.RequestException:
                # The server may have restarted with a new media marker.
                # Refresh from /props; only retry if the marker actually changed.
                if not encoded_images or not self._refresh_media_marker():
                    raise
                response = post_embeddings()
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
        enable_thinking: Optional[bool] = None,
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
            payload = self._build_payload(
                messages,
                tools,
                tool_choice,
                stream=False,
                enable_thinking=enable_thinking,
            )
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
        enable_thinking: Optional[bool] = None,
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
            payload = self._build_payload(
                messages,
                tools,
                tool_choice,
                stream=True,
                enable_thinking=enable_thinking,
            )
            content_parts: list[str] = []
            reasoning_parts: list[str] = []
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
                        maybe_stats = _stats_from_llama_cpp_chunk(data)
                        if maybe_stats is not None:
                            yield ("stats", maybe_stats)
                        choices = data.get("choices") or []
                        if not choices:
                            continue
                        delta = choices[0].get("delta", {})
                        if choices[0].get("finish_reason"):
                            finish_reason = choices[0]["finish_reason"]
                        # llama.cpp emits separated thinking under
                        # reasoning_content (preferred) or thinking before any
                        # content tokens arrive
                        reasoning_delta = delta.get("reasoning_content") or delta.get(
                            "thinking"
                        )
                        if reasoning_delta:
                            reasoning_parts.append(reasoning_delta)
                            yield ("reasoning_delta", reasoning_delta)
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
            full_reasoning = "".join(reasoning_parts).strip() or None
            tool_calls_list = self._streamed_tool_calls_to_list(tool_calls_by_index)
            if tool_calls_list:
                finish_reason = "tool_calls"
            yield (
                "message",
                {
                    "content": full_content,
                    "reasoning": full_reasoning,
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
