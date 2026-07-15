"""Chat API request models."""

from typing import Any

from pydantic import BaseModel, Field


class ChatMessage(BaseModel):
    """A single message in a chat conversation."""

    role: str = Field(
        description="Message role: 'user', 'assistant', 'system', or 'tool'"
    )
    content: Any | None = Field(
        default=None,
        description=(
            "Message content. Usually a string, but may be a multimodal content "
            "list (e.g. text + image_url) or null for assistant turns that only "
            "request tool calls."
        ),
    )
    tool_call_id: str | None = Field(
        default=None, description="For tool messages, the ID of the tool call"
    )
    name: str | None = Field(
        default=None, description="For tool messages, the tool name"
    )
    tool_calls: list[dict[str, Any]] | None = Field(
        default=None,
        description=(
            "For assistant messages replayed from prior turns, the OpenAI-format "
            "tool calls the model previously requested. Replaying these verbatim "
            "keeps the conversation prefix byte-for-byte identical so the model "
            "server's prompt cache hits on follow-up turns."
        ),
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
    stream: bool = Field(
        default=False,
        description="If true, stream the final assistant response in the body as newline-delimited JSON.",
    )
    enable_thinking: bool | None = Field(
        default=None,
        description=(
            "Per-request thinking toggle. None means use the provider default. "
            "Ignored by providers that do not expose a per-request thinking switch."
        ),
    )
