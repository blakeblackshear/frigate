import type { ChatMessage, ChatStats, ToolCall } from "@/types/chat";

export type StreamChatCallbacks = {
  /** Streamed delta of the assistant's final answer text. */
  onContentDelta: (delta: string) => void;
  /** Streamed delta of the assistant's reasoning trace. */
  onReasoningDelta: (delta: string) => void;
  /** The full conversation chain so far (system message, history, this turn's
   * tool-call turns, tool results, and — on the final emission — the final
   * assistant message). */
  onChain: (chain: ChatMessage[]) => void;
  /** Token/timing stats for the turn. */
  onStats: (stats: ChatStats) => void;
  /** Called when the stream sends an error or fetch fails. */
  onError: (message: string) => void;
  /** Called when the stream finishes (success or error). */
  onDone: () => void;
  /** Message used when fetch throws and no server error is available. */
  defaultErrorMessage?: string;
};

type StatsChunk = {
  type: "stats";
  prompt_tokens?: number;
  completion_tokens?: number;
  completion_duration_ms?: number;
  tokens_per_second?: number;
};

type StreamChunk =
  | { type: "error"; error: string }
  | { type: "messages"; messages: ChatMessage[] }
  | { type: "content"; delta: string }
  | { type: "reasoning"; delta: string }
  | StatsChunk;

/**
 * POST to chat/completion with stream: true, parse NDJSON stream, and invoke
 * callbacks so the caller can update UI (e.g. React state).
 */
export type StreamChatOptions = {
  enableThinking?: boolean;
};

export async function streamChatCompletion(
  url: string,
  headers: Record<string, string>,
  apiMessages: ChatMessage[],
  callbacks: StreamChatCallbacks,
  signal?: AbortSignal,
  options: StreamChatOptions = {},
): Promise<void> {
  const {
    onContentDelta,
    onReasoningDelta,
    onChain,
    onStats,
    onError,
    onDone,
    defaultErrorMessage = "Something went wrong. Please try again.",
  } = callbacks;

  try {
    const body: Record<string, unknown> = {
      messages: apiMessages,
      stream: true,
    };
    if (options.enableThinking !== undefined) {
      body.enable_thinking = options.enableThinking;
    }
    const res = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
      signal,
    });

    if (!res.ok) {
      const errBody = await res.json().catch(() => ({}));
      const message = (errBody as { error?: string }).error ?? res.statusText;
      onError(message);
      onDone();
      return;
    }

    const reader = res.body?.getReader();
    const decoder = new TextDecoder();
    if (!reader) {
      onError("No response body");
      onDone();
      return;
    }

    let buffer = "";
    let hadStreamError = false;

    const applyChunk = (data: StreamChunk) => {
      if (data.type === "error") {
        onError(data.error);
        return "break";
      }
      if (data.type === "messages") {
        onChain(data.messages ?? []);
        return "continue";
      }
      if (data.type === "content" && data.delta !== undefined) {
        onContentDelta(data.delta);
        return "continue";
      }
      if (data.type === "reasoning" && data.delta !== undefined) {
        onReasoningDelta(data.delta);
        return "continue";
      }
      if (data.type === "stats") {
        onStats({
          promptTokens: data.prompt_tokens,
          completionTokens: data.completion_tokens,
          completionDurationMs: data.completion_duration_ms,
          tokensPerSecond: data.tokens_per_second,
        });
        return "continue";
      }
      return "continue";
    };

    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";
      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed) continue;
        try {
          const data = JSON.parse(trimmed) as StreamChunk;
          if (applyChunk(data) === "break") {
            hadStreamError = true;
            break;
          }
        } catch {
          // skip malformed JSON lines
        }
      }
      if (hadStreamError) break;
    }

    // Flush remaining buffer
    if (!hadStreamError && buffer.trim()) {
      try {
        const data = JSON.parse(buffer.trim()) as StreamChunk;
        applyChunk(data);
      } catch {
        // ignore final malformed chunk
      }
    }
  } catch (err) {
    if (err instanceof DOMException && err.name === "AbortError") {
      // User stopped generation — not an error
    } else {
      onError(defaultErrorMessage);
    }
  } finally {
    onDone();
  }
}

/** Map each tool result message to its tool_call_id for response lookup. */
export function toolResponsesById(
  messages: ChatMessage[],
): Map<string, string> {
  const map = new Map<string, string>();
  for (const m of messages) {
    if (m.role === "tool" && typeof m.tool_call_id === "string") {
      map.set(
        m.tool_call_id,
        typeof m.content === "string" ? m.content : JSON.stringify(m.content),
      );
    }
  }
  return map;
}

/** Derive the display tool calls for one assistant message. */
export function toolCallsForMessage(
  message: ChatMessage,
  responses: Map<string, string>,
): ToolCall[] {
  if (!message.tool_calls?.length) return [];
  return message.tool_calls.map((tc) => {
    let args: Record<string, unknown> | undefined;
    const raw = tc.function?.arguments;
    if (typeof raw === "string") {
      try {
        args = JSON.parse(raw) as Record<string, unknown>;
      } catch {
        args = undefined;
      }
    }
    return {
      name: tc.function?.name ?? "",
      arguments: args,
      response: responses.get(tc.id),
    };
  });
}

/**
 * Parse search_objects tool call response(s) into event ids for thumbnails.
 */
export function getEventIdsFromSearchObjectsToolCalls(
  toolCalls: ToolCall[] | undefined,
): { id: string }[] {
  if (!toolCalls?.length) return [];
  const results: { id: string }[] = [];
  for (const tc of toolCalls) {
    if (tc.name !== "search_objects" || !tc.response?.trim()) continue;
    try {
      const parsed = JSON.parse(tc.response) as unknown;
      if (!Array.isArray(parsed)) continue;
      for (const item of parsed) {
        if (
          item &&
          typeof item === "object" &&
          "id" in item &&
          typeof (item as { id: unknown }).id === "string"
        ) {
          results.push({ id: (item as { id: string }).id });
        }
      }
    } catch {
      // ignore parse errors
    }
  }
  return results;
}

const ATTACHED_EVENT_MARKER = /^\[attached_event:([A-Za-z0-9._-]+)\]\s*\n?/;

export function parseAttachedEvent(content: string): {
  eventId: string | null;
  body: string;
} {
  if (!content) return { eventId: null, body: content };
  const match = content.match(ATTACHED_EVENT_MARKER);
  if (!match) return { eventId: null, body: content };
  const body = content.slice(match[0].length).replace(/^\n+/, "");
  return { eventId: match[1], body };
}

export function prependAttachment(body: string, eventId: string): string {
  return `[attached_event:${eventId}]\n\n${body}`;
}

export type FindSimilarObjectsResult = {
  anchor: { id: string } | null;
  results: { id: string; score?: number }[];
};

/**
 * Parse find_similar_objects tool call response(s) into anchor + ranked results.
 * Returns null if no find_similar_objects call is present so the caller can
 * decide whether to render.
 */
export function getFindSimilarObjectsFromToolCalls(
  toolCalls: ToolCall[] | undefined,
): FindSimilarObjectsResult | null {
  if (!toolCalls?.length) return null;
  for (const tc of toolCalls) {
    if (tc.name !== "find_similar_objects" || !tc.response?.trim()) continue;
    try {
      const parsed = JSON.parse(tc.response) as {
        anchor?: { id?: unknown };
        results?: unknown;
      };
      const anchorId =
        parsed.anchor && typeof parsed.anchor.id === "string"
          ? parsed.anchor.id
          : null;
      const anchor = anchorId ? { id: anchorId } : null;
      const results: { id: string; score?: number }[] = [];
      if (Array.isArray(parsed.results)) {
        for (const item of parsed.results) {
          if (
            item &&
            typeof item === "object" &&
            "id" in item &&
            typeof (item as { id: unknown }).id === "string"
          ) {
            const entry: { id: string; score?: number } = {
              id: (item as { id: string }).id,
            };
            const rawScore = (item as { score?: unknown }).score;
            if (typeof rawScore === "number") entry.score = rawScore;
            results.push(entry);
          }
        }
      }
      return { anchor, results };
    } catch {
      // ignore parse errors
    }
  }
  return null;
}
