"""Gemini Provider for Frigate AI."""

import json
import logging
from typing import Any, Optional

from google import genai
from google.genai import errors, types

from frigate.config import GenAIProviderEnum
from frigate.genai import GenAIClient, register_genai_provider

logger = logging.getLogger(__name__)


@register_genai_provider(GenAIProviderEnum.gemini)
class GeminiClient(GenAIClient):
    """Generative AI client for Frigate using Gemini."""

    provider: genai.Client

    def _init_provider(self):
        """Initialize the client."""
        # Merge provider_options into HttpOptions
        http_options_dict = {
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

    def _send(self, prompt: str, images: list[bytes]) -> Optional[str]:
        """Submit a request to Gemini."""
        contents = [
            types.Part.from_bytes(data=img, mime_type="image/jpeg") for img in images
        ] + [prompt]
        try:
            # Merge runtime_options into generation_config if provided
            generation_config_dict = {"candidate_count": 1}
            generation_config_dict.update(self.genai_config.runtime_options)

            response = self.provider.models.generate_content(
                model=self.genai_config.model,
                contents=contents,
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
            description = response.text.strip()
        except (ValueError, AttributeError):
            # No description was generated
            return None
        return description

    def get_context_size(self) -> int:
        """Get the context window size for Gemini."""
        # Gemini Pro Vision has a 1M token context window
        return 1000000

    def chat_with_tools(
        self,
        messages: list[dict[str, Any]],
        tools: Optional[list[dict[str, Any]]] = None,
        tool_choice: Optional[str] = "auto",
    ) -> dict[str, Any]:
        """
        Send chat messages to Gemini with optional tool definitions.

        Implements function calling/tool usage for Gemini models.
        """
        try:
            # Convert messages to Gemini format
            gemini_messages = []
            for msg in messages:
                role = msg.get("role", "user")
                content = msg.get("content", "")

                # Map roles to Gemini format
                if role == "system":
                    # Gemini doesn't have system role, prepend to first user message
                    if gemini_messages and gemini_messages[0].role == "user":
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
                    gemini_messages.append(
                        types.Content(
                            role="model", parts=[types.Part.from_text(text=content)]
                        )
                    )
                elif role == "tool":
                    # Handle tool response
                    function_response = {
                        "name": msg.get("name", ""),
                        "response": content,
                    }
                    gemini_messages.append(
                        types.Content(
                            role="function",
                            parts=[
                                types.Part.from_function_response(function_response)
                            ],
                        )
                    )
                else:  # user
                    gemini_messages.append(
                        types.Content(
                            role="user", parts=[types.Part.from_text(text=content)]
                        )
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
                        function_calling_config=types.FunctionCallingConfig(mode="NONE")
                    )
                elif tool_choice == "auto":
                    tool_config = types.ToolConfig(
                        function_calling_config=types.FunctionCallingConfig(mode="AUTO")
                    )
                elif tool_choice == "required":
                    tool_config = types.ToolConfig(
                        function_calling_config=types.FunctionCallingConfig(mode="ANY")
                    )

            # Build request config
            config_params = {"candidate_count": 1}

            if gemini_tools:
                config_params["tools"] = gemini_tools

            if tool_config:
                config_params["tool_config"] = tool_config

            # Merge runtime_options
            if isinstance(self.genai_config.runtime_options, dict):
                config_params.update(self.genai_config.runtime_options)

            response = self.provider.models.generate_content(
                model=self.genai_config.model,
                contents=gemini_messages,
                config=types.GenerateContentConfig(**config_params),
            )

            # Check if response is valid
            if not response or not response.candidates:
                return {
                    "content": None,
                    "tool_calls": None,
                    "finish_reason": "error",
                }

            candidate = response.candidates[0]
            content = None
            tool_calls = None

            # Extract content and tool calls from response
            if candidate.content and candidate.content.parts:
                for part in candidate.content.parts:
                    if part.text:
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
                            }
                        )

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
                "tool_calls": tool_calls,
                "finish_reason": finish_reason,
            }

        except errors.APIError as e:
            logger.warning("Gemini API error during chat_with_tools: %s", str(e))
            return {
                "content": None,
                "tool_calls": None,
                "finish_reason": "error",
            }
        except Exception as e:
            logger.warning(
                "Gemini returned an error during chat_with_tools: %s", str(e)
            )
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

        Implements streaming function calling/tool usage for Gemini models.
        """
        try:
            # Convert messages to Gemini format
            gemini_messages = []
            for msg in messages:
                role = msg.get("role", "user")
                content = msg.get("content", "")

                # Map roles to Gemini format
                if role == "system":
                    # Gemini doesn't have system role, prepend to first user message
                    if gemini_messages and gemini_messages[0].role == "user":
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
                    gemini_messages.append(
                        types.Content(
                            role="model", parts=[types.Part.from_text(text=content)]
                        )
                    )
                elif role == "tool":
                    # Handle tool response
                    function_response = {
                        "name": msg.get("name", ""),
                        "response": content,
                    }
                    gemini_messages.append(
                        types.Content(
                            role="function",
                            parts=[
                                types.Part.from_function_response(function_response)
                            ],
                        )
                    )
                else:  # user
                    gemini_messages.append(
                        types.Content(
                            role="user", parts=[types.Part.from_text(text=content)]
                        )
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
                        function_calling_config=types.FunctionCallingConfig(mode="NONE")
                    )
                elif tool_choice == "auto":
                    tool_config = types.ToolConfig(
                        function_calling_config=types.FunctionCallingConfig(mode="AUTO")
                    )
                elif tool_choice == "required":
                    tool_config = types.ToolConfig(
                        function_calling_config=types.FunctionCallingConfig(mode="ANY")
                    )

            # Build request config
            config_params = {"candidate_count": 1}

            if gemini_tools:
                config_params["tools"] = gemini_tools

            if tool_config:
                config_params["tool_config"] = tool_config

            # Merge runtime_options
            if isinstance(self.genai_config.runtime_options, dict):
                config_params.update(self.genai_config.runtime_options)

            # Use streaming API
            content_parts: list[str] = []
            tool_calls_by_index: dict[int, dict[str, Any]] = {}
            finish_reason = "stop"

            response = self.provider.models.generate_content_stream(
                model=self.genai_config.model,
                contents=gemini_messages,
                config=types.GenerateContentConfig(**config_params),
            )

            async for chunk in response:
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

                # Extract content and tool calls from chunk
                if candidate.content and candidate.content.parts:
                    for part in candidate.content.parts:
                        if part.text:
                            content_parts.append(part.text)
                            yield ("content_delta", part.text)
                        elif part.function_call:
                            # Handle function call
                            try:
                                arguments = (
                                    dict(part.function_call.args)
                                    if part.function_call.args
                                    else {}
                                )
                            except Exception:
                                arguments = {}

                            # Store tool call
                            tool_call_id = part.function_call.name or ""
                            tool_call_name = part.function_call.name or ""

                            # Check if we already have this tool call
                            found_index = None
                            for idx, tc in tool_calls_by_index.items():
                                if tc["name"] == tool_call_name:
                                    found_index = idx
                                    break

                            if found_index is None:
                                found_index = len(tool_calls_by_index)
                                tool_calls_by_index[found_index] = {
                                    "id": tool_call_id,
                                    "name": tool_call_name,
                                    "arguments": "",
                                }

                            # Accumulate arguments
                            if arguments:
                                tool_calls_by_index[found_index]["arguments"] += (
                                    json.dumps(arguments)
                                    if isinstance(arguments, dict)
                                    else str(arguments)
                                )

            # Build final message
            full_content = "".join(content_parts).strip() or None

            # Convert tool calls to list format
            tool_calls_list = None
            if tool_calls_by_index:
                tool_calls_list = []
                for tc in tool_calls_by_index.values():
                    try:
                        # Try to parse accumulated arguments as JSON
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

        except errors.APIError as e:
            logger.warning("Gemini API error during streaming: %s", str(e))
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
                "Gemini returned an error during chat_with_tools_stream: %s", str(e)
            )
            yield (
                "message",
                {
                    "content": None,
                    "tool_calls": None,
                    "finish_reason": "error",
                },
            )
