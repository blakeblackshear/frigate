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
        try:
            if tools:
                function_declarations = []
                for tool in tools:
                    if tool.get("type") == "function":
                        func_def = tool.get("function", {})
                        function_declarations.append(
                            genai.protos.FunctionDeclaration(
                                name=func_def.get("name"),
                                description=func_def.get("description"),
                                parameters=genai.protos.Schema(
                                    type=genai.protos.Type.OBJECT,
                                    properties={
                                        prop_name: genai.protos.Schema(
                                            type=_convert_json_type_to_gemini(
                                                prop.get("type")
                                            ),
                                            description=prop.get("description"),
                                        )
                                        for prop_name, prop in func_def.get(
                                            "parameters", {}
                                        )
                                        .get("properties", {})
                                        .items()
                                    },
                                    required=func_def.get("parameters", {}).get(
                                        "required", []
                                    ),
                                ),
                            )
                        )

                tool_config = genai.protos.Tool(
                    function_declarations=function_declarations
                )

                if tool_choice == "none":
                    function_calling_config = genai.protos.FunctionCallingConfig(
                        mode=genai.protos.FunctionCallingConfig.Mode.NONE
                    )
                elif tool_choice == "required":
                    function_calling_config = genai.protos.FunctionCallingConfig(
                        mode=genai.protos.FunctionCallingConfig.Mode.ANY
                    )
                else:
                    function_calling_config = genai.protos.FunctionCallingConfig(
                        mode=genai.protos.FunctionCallingConfig.Mode.AUTO
                    )
            else:
                tool_config = None
                function_calling_config = None

            contents = []
            for msg in messages:
                role = msg.get("role")
                content = msg.get("content", "")

                if role == "system":
                    continue
                elif role == "user":
                    contents.append({"role": "user", "parts": [content]})
                elif role == "assistant":
                    parts = [content] if content else []
                    if "tool_calls" in msg:
                        for tc in msg["tool_calls"]:
                            parts.append(
                                genai.protos.FunctionCall(
                                    name=tc["function"]["name"],
                                    args=json.loads(tc["function"]["arguments"]),
                                )
                            )
                    contents.append({"role": "model", "parts": parts})
                elif role == "tool":
                    tool_name = msg.get("name", "")
                    tool_result = (
                        json.loads(content) if isinstance(content, str) else content
                    )
                    contents.append(
                        {
                            "role": "function",
                            "parts": [
                                genai.protos.FunctionResponse(
                                    name=tool_name,
                                    response=tool_result,
                                )
                            ],
                        }
                    )

            generation_config = genai.types.GenerationConfig(
                candidate_count=1,
            )
            if function_calling_config:
                generation_config.function_calling_config = function_calling_config

            response = self.provider.generate_content(
                contents,
                tools=[tool_config] if tool_config else None,
                generation_config=generation_config,
                request_options=genai.types.RequestOptions(timeout=self.timeout),
            )

            content = None
            tool_calls = None

            if response.candidates and response.candidates[0].content:
                parts = response.candidates[0].content.parts
                text_parts = [p.text for p in parts if hasattr(p, "text") and p.text]
                if text_parts:
                    content = " ".join(text_parts).strip()

                function_calls = [
                    p.function_call
                    for p in parts
                    if hasattr(p, "function_call") and p.function_call
                ]
                if function_calls:
                    tool_calls = []
                    for fc in function_calls:
                        tool_calls.append(
                            {
                                "id": f"call_{hash(fc.name)}",
                                "name": fc.name,
                                "arguments": dict(fc.args)
                                if hasattr(fc, "args")
                                else {},
                            }
                        )

            finish_reason = "error"
            if response.candidates:
                finish_reason_map = {
                    genai.types.FinishReason.STOP: "stop",
                    genai.types.FinishReason.MAX_TOKENS: "length",
                    genai.types.FinishReason.SAFETY: "stop",
                    genai.types.FinishReason.RECITATION: "stop",
                    genai.types.FinishReason.OTHER: "error",
                }
                finish_reason = finish_reason_map.get(
                    response.candidates[0].finish_reason, "error"
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

        except GoogleAPICallError as e:
            logger.warning("Gemini returned an error: %s", str(e))
            return {
                "content": None,
                "tool_calls": None,
                "finish_reason": "error",
            }
        except Exception as e:
            logger.warning("Unexpected error in Gemini chat_with_tools: %s", str(e))
            return {
                "content": None,
                "tool_calls": None,
                "finish_reason": "error",
            }


def _convert_json_type_to_gemini(json_type: str) -> genai.protos.Type:
    type_map = {
        "string": genai.protos.Type.STRING,
        "integer": genai.protos.Type.INTEGER,
        "number": genai.protos.Type.NUMBER,
        "boolean": genai.protos.Type.BOOLEAN,
        "array": genai.protos.Type.ARRAY,
        "object": genai.protos.Type.OBJECT,
    }
    return type_map.get(json_type, genai.protos.Type.STRING)
