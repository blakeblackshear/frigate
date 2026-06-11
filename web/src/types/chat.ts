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
  name: string;
  arguments?: Record<string, unknown>;
  response?: string;
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
};

export type GenAIModelsResponse = Record<string, GenAIProviderInfo>;
