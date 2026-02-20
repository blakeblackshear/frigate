import type { ChatMessage, ToolCall } from "@/types/chat";

export type StreamChatCallbacks = {
  /** Update the messages array (e.g. pass to setState). */
  updateMessages: (updater: (prev: ChatMessage[]) => ChatMessage[]) => void;
  /** Called when the stream sends an error or fetch fails. */
  onError: (message: string) => void;
  /** Called when the stream finishes (success or error). */
  onDone: () => void;
  /** Message used when fetch throws and no server error is available. */
  defaultErrorMessage?: string;
};

type StreamChunk =
  | { type: "error"; error: string }
  | { type: "tool_calls"; tool_calls: ToolCall[] }
  | { type: "content"; delta: string };

/**
 * POST to chat/completion with stream: true, parse NDJSON stream, and invoke
 * callbacks so the caller can update UI (e.g. React state).
 */
export async function streamChatCompletion(
  url: string,
  headers: Record<string, string>,
  apiMessages: { role: string; content: string }[],
  callbacks: StreamChatCallbacks,
): Promise<void> {
  const {
    updateMessages,
    onError,
    onDone,
    defaultErrorMessage = "Something went wrong. Please try again.",
  } = callbacks;

  try {
    const res = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify({ messages: apiMessages, stream: true }),
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
        updateMessages((prev) =>
          prev.filter((m) => !(m.role === "assistant" && m.content === "")),
        );
        return "break";
      }
      if (data.type === "tool_calls" && data.tool_calls?.length) {
        updateMessages((prev) => {
          const next = [...prev];
          const lastMsg = next[next.length - 1];
          if (lastMsg?.role === "assistant")
            next[next.length - 1] = {
              ...lastMsg,
              toolCalls: data.tool_calls,
            };
          return next;
        });
        return "continue";
      }
      if (data.type === "content" && data.delta !== undefined) {
        updateMessages((prev) => {
          const next = [...prev];
          const lastMsg = next[next.length - 1];
          if (lastMsg?.role === "assistant")
            next[next.length - 1] = {
              ...lastMsg,
              content: lastMsg.content + data.delta,
            };
          return next;
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
          const data = JSON.parse(trimmed) as StreamChunk & { type: string };
          const result = applyChunk(data as StreamChunk);
          if (result === "break") {
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
        const data = JSON.parse(buffer.trim()) as StreamChunk & {
          type: string;
          delta?: string;
        };
        if (data.type === "content" && data.delta !== undefined) {
          updateMessages((prev) => {
            const next = [...prev];
            const lastMsg = next[next.length - 1];
            if (lastMsg?.role === "assistant")
              next[next.length - 1] = {
                ...lastMsg,
                content: lastMsg.content + data.delta!,
              };
            return next;
          });
        }
      } catch {
        // ignore final malformed chunk
      }
    }

    if (!hadStreamError) {
      updateMessages((prev) => {
        const next = [...prev];
        const lastMsg = next[next.length - 1];
        if (lastMsg?.role === "assistant" && lastMsg.content === "")
          next[next.length - 1] = { ...lastMsg, content: " " };
        return next;
      });
    }
  } catch {
    onError(defaultErrorMessage);
    updateMessages((prev) =>
      prev.filter((m) => !(m.role === "assistant" && m.content === "")),
    );
  } finally {
    onDone();
  }
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
