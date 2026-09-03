export type ToolCallFunction = {
  name: string;
  arguments: string;
};

export type WireToolCall = {
  id: string;
  type?: string;
  function: ToolCallFunction;
};

export type ChatMessage = {
  role: "system" | "user" | "assistant" | "tool";
  content: unknown;
  tool_call_id?: string;
  name?: string;
  tool_calls?: WireToolCall[];
  reasoning?: string;
  stats?: ChatStats;
};

export type ToolCall = {
  id?: string;
  name: string;
  arguments?: Record<string, unknown>;
  response?: string;
};

export type ToolDecision = "approve" | "reject";

/** A state-changing tool call the backend paused on, awaiting the user. */
export type PendingToolCall = {
  id: string;
  name: string;
  arguments: Record<string, unknown>;
};

export type StartingRequest = {
  label: string;
  prompt: string;
};

export type ChatStats = {
  promptTokens?: number;
  completionTokens?: number;
  completionDurationMs?: number;
  tokensPerSecond?: number;
};

export type ShowStatsMode = "while_generating" | "always";

export type GenAIProviderInfo = {
  models: string[];
  roles: string[];
  supports_toggleable_thinking: boolean;
  supports_embeddings: boolean;
};

export type GenAIModelsResponse = Record<string, GenAIProviderInfo>;
