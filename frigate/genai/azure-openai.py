"""Azure OpenAI Provider for Frigate AI."""

import base64
import json
import logging
from typing import Any, Optional
from urllib.parse import parse_qs, urlparse

from openai import AzureOpenAI

from frigate.config import GenAIProviderEnum
from frigate.genai import GenAIClient, register_genai_provider

logger = logging.getLogger(__name__)


@register_genai_provider(GenAIProviderEnum.azure_openai)
class OpenAIClient(GenAIClient):
    """Generative AI client for Frigate using Azure OpenAI."""

    provider: AzureOpenAI

    def _init_provider(self):
        """Initialize the client."""
        try:
            parsed_url = urlparse(self.genai_config.base_url)
            query_params = parse_qs(parsed_url.query)
            api_version = query_params.get("api-version", [None])[0]
            azure_endpoint = f"{parsed_url.scheme}://{parsed_url.netloc}/"

            if not api_version:
                logger.warning("Azure OpenAI url is missing API version.")
                return None

        except Exception as e:
            logger.warning("Error parsing Azure OpenAI url: %s", str(e))
            return None

        return AzureOpenAI(
            api_key=self.genai_config.api_key,
            api_version=api_version,
            azure_endpoint=azure_endpoint,
        )

    def _send(self, prompt: str, images: list[bytes]) -> Optional[str]:
        """Submit a request to Azure OpenAI."""
        encoded_images = [base64.b64encode(image).decode("utf-8") for image in images]
        try:
            result = self.provider.chat.completions.create(
                model=self.genai_config.model,
                messages=[
                    {
                        "role": "user",
                        "content": [{"type": "text", "text": prompt}]
                        + [
                            {
                                "type": "image_url",
                                "image_url": {
                                    "url": f"data:image/jpeg;base64,{image}",
                                    "detail": "low",
                                },
                            }
                            for image in encoded_images
                        ],
                    },
                ],
                timeout=self.timeout,
                **self.genai_config.runtime_options,
            )
        except Exception as e:
            logger.warning("Azure OpenAI returned an error: %s", str(e))
            return None
        if len(result.choices) > 0:
            return result.choices[0].message.content.strip()
        return None

    def get_context_size(self) -> int:
        """Get the context window size for Azure OpenAI."""
        return 128000

    def chat_with_tools(
        self,
        messages: list[dict[str, Any]],
        tools: Optional[list[dict[str, Any]]] = None,
        tool_choice: Optional[str] = "auto",
    ) -> dict[str, Any]:
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

        except Exception as e:
            logger.warning("Azure OpenAI returned an error: %s", str(e))
            return {
                "content": None,
                "tool_calls": None,
                "finish_reason": "error",
            }
