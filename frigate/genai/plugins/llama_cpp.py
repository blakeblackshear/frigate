"""llama.cpp Provider for Frigate AI."""

import base64
import json
import logging
from collections.abc import AsyncGenerator
from typing import Any, cast

import httpx
import numpy as np
import requests

from frigate.config import GenAIProviderEnum
from frigate.genai import GenAIClient, register_genai_provider
from frigate.genai.utils import (
    interleave_images,
    parse_tool_calls_from_message,
    to_jpeg,
)

logger = logging.getLogger(__name__)


def _stats_from_llama_cpp_chunk(data: dict[str, Any]) -> dict[str, Any] | None:
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

    @property
    def supports_embeddings(self) -> bool:
        """llama.cpp exposes a /v1/embeddings endpoint for any loaded model."""
        return True

    def _auth_headers(self) -> dict | None:
        """Bearer auth header when an API key is configured, else None."""
        if self.genai_config.api_key:
            return {"Authorization": "Bearer " + self.genai_config.api_key}

        return None

    def _get(self, url: str, **kwargs: Any) -> requests.Response:
        """GET with the configured auth headers injected."""
        return requests.get(url, headers=self._auth_headers(), **kwargs)

    def _post(self, url: str, **kwargs: Any) -> requests.Response:
        """POST with the configured auth headers injected."""
        return requests.post(url, headers=self._auth_headers(), **kwargs)

    def _fetch_llama_props(self, base_url: str, model: str) -> dict[str, Any]:
        """Fetch /props from a llama.cpp server, with llama-swap fallback.

        Raises the underlying RequestException if both endpoints fail; callers
        decide how to surface the failure.
        """
        try:
            response = self._get(
                f"{base_url}/props",
                params={"model": model},
                timeout=10,
            )
            response.raise_for_status()
            return cast(dict[str, Any], response.json())
        except Exception:
            response = self._get(
                f"{base_url}/upstream/{model}/props",
                timeout=10,
            )
            response.raise_for_status()
            return cast(dict[str, Any], response.json())

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

        logger.info(
            "llama.cpp model '%s' initialized — context: %s, vision: %s, audio: %s, tools: %s, reasoning: %s",
            configured_model,
            self.get_context_size(),
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
        `meta.n_ctx`.
        """
        info: dict[str, Any] = {
            "context_size": None,
            "supports_vision": False,
            "supports_audio": False,
            "supports_tools": False,
            "supports_reasoning": False,
        }

        model_entry: dict[str, Any] | None = None
        try:
            response = self._get(f"{base_url}/v1/models", timeout=10)
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
            props = self._fetch_llama_props(base_url, configured_model)

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
        except Exception as e:
            logger.warning("Failed to query llama.cpp /props endpoint: %s", e)

        return info

    def _send(
        self,
        prompt: str,
        images: list[bytes],
        response_format: dict | None = None,
        enable_thinking: bool = False,
        image_captions: list[str] | None = None,
    ) -> str | None:
        """Submit a request to llama.cpp server."""
        if self.provider is None:
            logger.warning(
                "llama.cpp provider has not been initialized, a description will not be generated. Check your llama.cpp configuration."
            )
            return None

        try:
            content: list[dict[str, Any]] = []
            for part in interleave_images(prompt, images, image_captions):
                if isinstance(part, str):
                    content.append({"type": "text", "text": part})
                    continue

                encoded_image = base64.b64encode(part).decode("utf-8")
                content.append(
                    {
                        "type": "image_url",
                        "image_url": {
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

            response = self._post(
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
    def supports_transcription(self) -> bool:
        """Audio-capable models can transcribe through chat completions."""
        return self._supports_audio

    def transcribe(
        self,
        audio: bytes,
        language: str | None = None,
        mime_type: str = "audio/wav",
    ) -> str | None:
        """Transcribe audio through the OpenAI-compatible transcriptions route.

        llama.cpp serves /v1/audio/transcriptions for any audio-capable model,
        not only a separately loaded whisper (ggml-org/llama.cpp#21863), so it
        covers exactly the models supports_transcription detects. It takes the
        language as a native multipart field, which is the only thing dedicated
        ASR models honor: they read the chat prompt as contextual biasing, so
        asking one there to use a language does nothing.

        Falls back to chat completions when the server predates that route.
        """
        if self.provider is None:
            logger.warning(
                "llama.cpp provider has not been initialized, audio will not be transcribed. Check your llama.cpp configuration."
            )
            return None

        if not self._supports_audio:
            logger.warning(
                "llama.cpp model '%s' does not accept audio input",
                self.genai_config.model,
            )
            return None

        try:
            data = {"model": self.genai_config.model, "response_format": "json"}

            if language:
                data["language"] = language

            response = self._post(
                f"{self.provider}/v1/audio/transcriptions",
                files={"file": ("audio.wav", audio, mime_type)},
                data=data,
                timeout=self.timeout,
            )

            if response.status_code == 404:
                logger.debug(
                    "llama.cpp server has no /v1/audio/transcriptions route, using chat completions"
                )
                return self._transcribe_via_chat(audio, language)

            response.raise_for_status()
            result = response.json()
            text = result.get("text") if isinstance(result, dict) else None

            return str(text).strip() or None if text else None
        except Exception as e:
            logger.warning("llama.cpp returned an error: %s", str(e))
            return None

    def _transcribe_via_chat(self, audio: bytes, language: str | None) -> str | None:
        """Transcribe through /v1/chat/completions, for servers without the
        transcriptions route.
        """
        prompt = "Transcribe the speech in this audio verbatim. Respond with the transcript only, and with nothing at all if there is no speech."

        if language:
            prompt += f" The speech is in language '{language}'."

        try:
            encoded_audio = base64.b64encode(audio).decode("utf-8")
            payload: dict[str, Any] = {
                "model": self.genai_config.model,
                "messages": [
                    {
                        "role": "user",
                        "content": [
                            {"type": "text", "text": prompt},
                            {
                                "type": "input_audio",
                                "input_audio": {
                                    "data": encoded_audio,
                                    "format": "wav",
                                },
                            },
                        ],
                    },
                ],
                **self.provider_options,
            }

            response = self._post(
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

                if "message" in choice and choice["message"].get("content"):
                    return str(choice["message"]["content"].strip()) or None

            return None
        except Exception as e:
            logger.warning("llama.cpp returned an error: %s", str(e))
            return None

    @property
    def supports_tools(self) -> bool:
        """Whether the loaded model supports tool/function calling."""
        return self._supports_tools

    @property
    def supports_toggleable_thinking(self) -> bool:
        return self._supports_reasoning

    def _fetch_models_data(self) -> list[dict[str, Any]]:
        """Return the raw /v1/models entries, or an empty list if unreachable."""
        base_url = self.provider or (
            self.genai_config.base_url.rstrip("/")
            if self.genai_config.base_url
            else None
        )

        if base_url is None:
            return []

        try:
            response = self._get(f"{base_url}/v1/models", timeout=10)
            response.raise_for_status()
            data = response.json().get("data", [])
        except Exception as e:
            logger.warning("Failed to list llama.cpp models: %s", e)
            return []

        return data if isinstance(data, list) else []

    def list_models(self) -> list[str]:
        """Return available model IDs from the llama.cpp server."""
        models: set[str] = set()

        # llama-server lists the id among the aliases when --alias is set
        for m in self._fetch_models_data():
            models.add(m.get("id", "unknown"))
            models.update(m.get("aliases", []))

        return sorted(models)

    def list_model_capabilities(self) -> dict[str, dict[str, bool]]:
        """Report input modalities for every model the server serves.

        Since ggml-org/llama.cpp#22952 each /v1/models entry carries
        architecture.input_modalities, so a single request describes every
        model rather than just the configured one. That is what lets the UI
        answer "can the model I just picked transcribe" before the config is
        saved and a client for it exists.

        Models whose entry predates that field are omitted rather than reported
        as incapable, so an older server falls back to the /props probe instead
        of silently losing capabilities it actually has.
        """
        capabilities: dict[str, dict[str, bool]] = {}

        for model in self._fetch_models_data():
            architecture = model.get("architecture") or {}
            modalities = architecture.get("input_modalities")

            if not isinstance(modalities, list) or not modalities:
                continue

            flags = {
                "supports_vision": "image" in modalities,
                "supports_transcription": "audio" in modalities,
            }

            names = [model.get("id"), *(model.get("aliases") or [])]

            for name in names:
                if isinstance(name, str) and name:
                    capabilities[name] = flags

        return capabilities

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

    def _count_prompt_tokens(self, image: bytes | None) -> int | None:
        """POST a 1-token chat completion and return reported prompt_tokens.

        Uses a generous timeout to absorb a cold model load on the first probe
        when the server lazily loads models on demand (e.g. llama-swap).
        """
        content: list[dict[str, Any]] = [{"type": "text", "text": "."}]

        if image is not None:
            encoded = base64.b64encode(image).decode("utf-8")
            content.append(
                {
                    "type": "image_url",
                    "image_url": {"url": f"data:image/jpeg;base64,{encoded}"},
                }
            )

        payload = {
            "model": self.genai_config.model,
            "messages": [{"role": "user", "content": content}],
            "max_tokens": 1,
        }
        response = self._post(
            f"{self.provider}/v1/chat/completions",
            json=payload,
            timeout=60,
        )
        response.raise_for_status()
        return int(response.json()["usage"]["prompt_tokens"])

    def _build_payload(
        self,
        messages: list[dict[str, Any]],
        tools: list[dict[str, Any]] | None,
        tool_choice: str | None,
        stream: bool = False,
        enable_thinking: bool | None = None,
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
    ) -> list[dict[str, Any]] | None:
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
        """Generate embeddings via llama.cpp /v1/embeddings endpoint.

        Each text or image is one entry in `input`, using the chat-style
        content array from ggml-org/llama.cpp#29556. Server must be started
        with --embeddings, and --mmproj for image support.
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

        inputs: list[dict[str, Any]] = [
            {"content": [{"type": "text", "text": text}]} for text in texts
        ]

        for img in images:
            # llama.cpp uses STB which does not support WebP; convert to JPEG
            jpeg_bytes = to_jpeg(img)
            to_encode = jpeg_bytes if jpeg_bytes is not None else img
            encoded = base64.b64encode(to_encode).decode("utf-8")
            # The trailing newline keeps tokenization identical to the older
            # "<__media__>\n" prompt_string format, so indexed vectors stay valid
            inputs.append(
                {
                    "content": [
                        {
                            "type": "image_url",
                            "image_url": {"url": f"data:image/jpeg;base64,{encoded}"},
                        },
                        {"type": "text", "text": "\n"},
                    ]
                }
            )

        try:
            response = self._post(
                f"{self.provider}/v1/embeddings",
                json={
                    "model": self.genai_config.model,
                    "input": inputs,
                    "encoding_format": "float",
                },
                timeout=self.timeout,
            )
            response.raise_for_status()
            items = response.json().get("data")

            if not isinstance(items, list):
                logger.warning("llama.cpp embeddings returned unexpected format")
                return []

            embeddings = []
            for item in items:
                emb = item.get("embedding") if isinstance(item, dict) else None
                if emb is None:
                    logger.warning("llama.cpp embeddings item missing embedding field")
                    continue
                arr = np.array(emb, dtype=np.float32).flatten()
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
        tools: list[dict[str, Any]] | None = None,
        tool_choice: str | None = "auto",
        enable_thinking: bool | None = None,
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
            response = self._post(
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
        tools: list[dict[str, Any]] | None = None,
        tool_choice: str | None = "auto",
        enable_thinking: bool | None = None,
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
                    headers=self._auth_headers(),
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
