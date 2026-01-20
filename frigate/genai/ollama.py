"""Ollama Provider for Frigate AI."""

import json
import logging
from typing import Any, Optional

from httpx import RemoteProtocolError, TimeoutException
from ollama import Client as ApiClient
from ollama import ResponseError

from frigate.config import GenAIProviderEnum
from frigate.genai import GenAIClient, register_genai_provider

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

    provider: ApiClient
    provider_options: dict[str, Any]

    def _init_provider(self):
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

    def _send(self, prompt: str, images: list[bytes]) -> Optional[str]:
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
            result = self.provider.generate(
                self.genai_config.model,
                prompt,
                images=images if images else None,
                **ollama_options,
            )
            logger.debug(
                f"Ollama tokens used: eval_count={result.get('eval_count')}, prompt_eval_count={result.get('prompt_eval_count')}"
            )
            return result["response"].strip()
        except (
            TimeoutException,
            ResponseError,
            RemoteProtocolError,
            ConnectionError,
        ) as e:
            logger.warning("Ollama returned an error: %s", str(e))
            return None

    def get_context_size(self) -> int:
        """Get the context window size for Ollama."""
        return self.genai_config.provider_options.get("options", {}).get(
            "num_ctx", 4096
        )

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
                    msg_dict["tool_calls"] = msg["tool_calls"]
                request_messages.append(msg_dict)

            request_params = {
                "model": self.genai_config.model,
                "messages": request_messages,
            }

            if tools:
                request_params["tools"] = tools
                if tool_choice:
                    if tool_choice == "none":
                        request_params["tool_choice"] = "none"
                    elif tool_choice == "required":
                        request_params["tool_choice"] = "required"
                    elif tool_choice == "auto":
                        request_params["tool_choice"] = "auto"

            request_params.update(self.provider_options)

            response = self.provider.chat(**request_params)

            if not response or "message" not in response:
                return {
                    "content": None,
                    "tool_calls": None,
                    "finish_reason": "error",
                }

            message = response["message"]
            content = (
                message.get("content", "").strip() if message.get("content") else None
            )

            tool_calls = None
            if "tool_calls" in message and message["tool_calls"]:
                tool_calls = []
                for tool_call in message["tool_calls"]:
                    try:
                        function_data = tool_call.get("function", {})
                        arguments_str = function_data.get("arguments", "{}")
                        arguments = json.loads(arguments_str)
                    except (json.JSONDecodeError, KeyError, TypeError) as e:
                        logger.warning(
                            f"Failed to parse tool call arguments: {e}, "
                            f"tool: {function_data.get('name', 'unknown')}"
                        )
                        arguments = {}

                    tool_calls.append(
                        {
                            "id": tool_call.get("id", ""),
                            "name": function_data.get("name", ""),
                            "arguments": arguments,
                        }
                    )

            finish_reason = "error"
            if "done" in response and response["done"]:
                if tool_calls:
                    finish_reason = "tool_calls"
                elif content:
                    finish_reason = "stop"
            elif tool_calls:
                finish_reason = "tool_calls"
            elif content:
                finish_reason = "stop"

            return {
                "content": content,
                "tool_calls": tool_calls,
                "finish_reason": finish_reason,
            }

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
