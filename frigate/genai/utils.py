"""Shared helpers for GenAI providers and chat (OpenAI-style messages, tool call parsing)."""

import json
import logging
from typing import Any, List, Optional

logger = logging.getLogger(__name__)


def parse_tool_calls_from_message(
    message: dict[str, Any],
) -> Optional[list[dict[str, Any]]]:
    """
    Parse tool_calls from an OpenAI-style message dict.

    Message may have "tool_calls" as a list of:
      {"id": str, "function": {"name": str, "arguments": str}, ...}

    Returns a list of {"id", "name", "arguments"} with arguments parsed as dict,
    or None if no tool_calls. Used by Ollama and LlamaCpp (non-stream) responses.
    """
    raw = message.get("tool_calls")
    if not raw or not isinstance(raw, list):
        return None
    result = []
    for tool_call in raw:
        function_data = tool_call.get("function") or {}
        try:
            arguments_str = function_data.get("arguments") or "{}"
            arguments = json.loads(arguments_str)
        except (json.JSONDecodeError, KeyError, TypeError) as e:
            logger.warning(
                "Failed to parse tool call arguments: %s, tool: %s",
                e,
                function_data.get("name", "unknown"),
            )
            arguments = {}
        result.append(
            {
                "id": tool_call.get("id", ""),
                "name": function_data.get("name", ""),
                "arguments": arguments,
            }
        )
    return result if result else None


def build_assistant_message_for_conversation(
    content: Any,
    tool_calls_raw: Optional[List[dict[str, Any]]],
) -> dict[str, Any]:
    """
    Build the assistant message dict in OpenAI format for appending to a conversation.

    tool_calls_raw: list of {"id", "name", "arguments"} (arguments as dict), or None.
    """
    msg: dict[str, Any] = {"role": "assistant", "content": content}
    if tool_calls_raw:
        msg["tool_calls"] = [
            {
                "id": tc["id"],
                "type": "function",
                "function": {
                    "name": tc["name"],
                    "arguments": json.dumps(tc.get("arguments") or {}),
                },
            }
            for tc in tool_calls_raw
        ]
    return msg
