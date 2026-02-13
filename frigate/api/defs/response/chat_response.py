"""Chat API response models."""

from typing import Any, Optional

from pydantic import BaseModel, Field


class ToolCallInvocation(BaseModel):
    """A tool call requested by the LLM (before execution)."""

    id: str = Field(description="Unique identifier for this tool call")
    name: str = Field(description="Tool name to call")
    arguments: dict[str, Any] = Field(description="Arguments for the tool call")


class ChatMessageResponse(BaseModel):
    """A message in the chat response."""

    role: str = Field(description="Message role")
    content: Optional[str] = Field(
        default=None, description="Message content (None if tool calls present)"
    )
    tool_calls: Optional[list[ToolCallInvocation]] = Field(
        default=None, description="Tool calls if LLM wants to call tools"
    )


class ToolCall(BaseModel):
    """A tool that was executed during the completion, with its response."""

    name: str = Field(description="Tool name that was called")
    arguments: dict[str, Any] = Field(
        default_factory=dict, description="Arguments passed to the tool"
    )
    response: str = Field(
        default="",
        description="The response or result returned from the tool execution",
    )


class ChatCompletionResponse(BaseModel):
    """Response from chat completion."""

    message: ChatMessageResponse = Field(description="The assistant's message")
    finish_reason: str = Field(
        description="Reason generation stopped: 'stop', 'tool_calls', 'length', 'error'"
    )
    tool_iterations: int = Field(
        default=0, description="Number of tool call iterations performed"
    )
    tool_calls: list[ToolCall] = Field(
        default_factory=list,
        description="List of tool calls that were executed during this completion",
    )
