export type ToolCall = {
  name: string;
  arguments?: Record<string, unknown>;
  response?: string;
};

export type ChatMessage = {
  role: "user" | "assistant";
  content: string;
  reasoning?: string;
  toolCalls?: ToolCall[];
  stats?: ChatStats;
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
