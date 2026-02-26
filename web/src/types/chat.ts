export type ToolCall = {
  name: string;
  arguments?: Record<string, unknown>;
  response?: string;
};

export type ChatMessage = {
  role: "user" | "assistant";
  content: string;
  toolCalls?: ToolCall[];
};

export type StartingRequest = {
  label: string;
  prompt: string;
};
