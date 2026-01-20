"""Chat API request models."""

from typing import Optional

from pydantic import BaseModel, Field


class ChatMessage(BaseModel):
    """A single message in a chat conversation."""

    role: str = Field(
        description="Message role: 'user', 'assistant', 'system', or 'tool'"
    )
    content: str = Field(description="Message content")
    tool_call_id: Optional[str] = Field(
        default=None, description="For tool messages, the ID of the tool call"
    )
    name: Optional[str] = Field(
        default=None, description="For tool messages, the tool name"
    )


class ChatCompletionRequest(BaseModel):
    """Request for chat completion with tool calling."""

    messages: list[ChatMessage] = Field(
        description="List of messages in the conversation"
    )
    max_tool_iterations: int = Field(
        default=5,
        ge=1,
        le=10,
        description="Maximum number of tool call iterations (default: 5)",
    )
