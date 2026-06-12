import { Button } from "@/components/ui/button";
import { LuCircleAlert, LuMessageSquarePlus } from "react-icons/lu";
import { useTranslation } from "react-i18next";
import { useState, useCallback, useRef, useEffect, useMemo } from "react";
import axios from "axios";
import useSWR from "swr";
import { ChatEventThumbnailsRow } from "@/components/chat/ChatEventThumbnailsRow";
import { MessageBubble } from "@/components/chat/ChatMessage";
import { ReasoningBubble } from "@/components/chat/ReasoningBubble";
import { ToolCallsGroup } from "@/components/chat/ToolCallsGroup";
import { ChatStartingState } from "@/components/chat/ChatStartingState";
import { ChatComposer } from "@/components/chat/ChatComposer";
import ChatSettings from "@/components/chat/ChatSettings";
import type {
  ChatMessage,
  ChatStats,
  GenAIModelsResponse,
  ShowStatsMode,
} from "@/types/chat";
import { usePersistence } from "@/hooks/use-persistence";
import {
  getEventIdsFromSearchObjectsToolCalls,
  getFindSimilarObjectsFromToolCalls,
  prependAttachment,
  streamChatCompletion,
  toolCallsForMessage,
  toolResponsesById,
} from "@/utils/chatUtil";

type StreamingTurn = {
  content: string;
  reasoning: string;
  chain: ChatMessage[];
  stats?: ChatStats;
};

const hasText = (content: unknown): content is string =>
  typeof content === "string" && content.trim().length > 0;

const toWire = (messages: ChatMessage[]): ChatMessage[] =>
  messages.map(({ reasoning: _r, stats: _s, ...rest }) => rest);

export default function ChatPage() {
  const { t } = useTranslation(["views/chat"]);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [streaming, setStreaming] = useState<StreamingTurn | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [attachedEventId, setAttachedEventId] = useState<string | null>(null);
  const [showStats, setShowStats] = usePersistence<ShowStatsMode>(
    "chat-show-stats",
    "while_generating",
  );
  const [autoScroll, setAutoScroll] = usePersistence<boolean>(
    "chat-auto-scroll",
    true,
  );
  const [thinkingEnabled, setThinkingEnabled] = usePersistence<boolean>(
    "chat-thinking-enabled",
    false,
  );
  const scrollRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  const { data: genaiInfo } = useSWR<GenAIModelsResponse>("genai/models", {
    revalidateOnFocus: false,
  });
  const supportsThinking = useMemo(() => {
    if (!genaiInfo) return false;
    for (const entry of Object.values(genaiInfo)) {
      if (entry.roles?.includes("chat") && entry.supports_toggleable_thinking) {
        return true;
      }
    }
    return false;
  }, [genaiInfo]);

  useEffect(() => {
    document.title = t("documentTitle");
  }, [t]);

  // Auto-scroll to bottom when messages change, but only if near bottom
  useEffect(() => {
    if (!autoScroll) return;
    const el = scrollRef.current;
    if (!el) return;
    const isNearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 150;
    if (isNearBottom) {
      el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
    }
  }, [messages, streaming, autoScroll]);

  const submitConversation = useCallback(
    async (messagesToSend: ChatMessage[]) => {
      if (isLoading) return;
      const last = messagesToSend[messagesToSend.length - 1];
      if (!last || last.role !== "user" || !hasText(last.content)) return;

      setError(null);
      setMessages(messagesToSend);
      setStreaming({ content: "", reasoning: "", chain: [] });
      setIsLoading(true);

      const baseURL = axios.defaults.baseURL ?? "";
      const url = `${baseURL}chat/completion`;
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
        ...(axios.defaults.headers.common as Record<string, string>),
      };

      const controller = new AbortController();
      abortRef.current = controller;

      let chain: ChatMessage[] = [];
      let stats: ChatStats | undefined;
      let reasoning = "";
      let hadError = false;

      await streamChatCompletion(
        url,
        headers,
        toWire(messagesToSend),
        {
          onContentDelta: (delta) =>
            setStreaming((s) => (s ? { ...s, content: s.content + delta } : s)),
          onReasoningDelta: (delta) => {
            reasoning += delta;
            setStreaming((s) =>
              s ? { ...s, reasoning: s.reasoning + delta } : s,
            );
          },
          onChain: (fullChain) => {
            chain = fullChain;
            setStreaming((s) => (s ? { ...s, chain: fullChain } : s));
          },
          onStats: (s) => {
            stats = s;
            setStreaming((cur) => (cur ? { ...cur, stats: s } : cur));
          },
          onError: (message) => {
            hadError = true;
            setError(message);
          },
          onDone: () => {
            abortRef.current = null;
            setIsLoading(false);
            setStreaming(null);
            const lastMsg = chain[chain.length - 1];
            if (!hadError && lastMsg?.role === "assistant") {
              setMessages(
                chain.map((m, i) =>
                  i === chain.length - 1
                    ? { ...m, reasoning: reasoning || undefined, stats }
                    : m,
                ),
              );
            }
          },
          defaultErrorMessage: t("error"),
        },
        controller.signal,
        supportsThinking ? { enableThinking: !!thinkingEnabled } : {},
      );
    },
    [isLoading, supportsThinking, t, thinkingEnabled],
  );

  const recentEventIds = useMemo(() => {
    const responses = toolResponsesById(messages);
    for (let i = messages.length - 1; i >= 0; i--) {
      const msg = messages[i];
      if (msg.role !== "assistant" || !msg.tool_calls?.length) continue;
      const calls = toolCallsForMessage(msg, responses);
      const similar = getFindSimilarObjectsFromToolCalls(calls);
      if (similar) return similar.results.map((e) => e.id);
      const events = getEventIdsFromSearchObjectsToolCalls(calls);
      if (events.length > 0) return events.map((e) => e.id);
    }
    return [];
  }, [messages]);

  const sendMessage = useCallback(
    (textOverride?: string) => {
      const text = (textOverride ?? input).trim();
      if (!text || isLoading) return;
      const wireText = attachedEventId
        ? prependAttachment(text, attachedEventId)
        : text;
      setInput("");
      setAttachedEventId(null);
      submitConversation([...messages, { role: "user", content: wireText }]);
    },
    [attachedEventId, input, isLoading, messages, submitConversation],
  );

  const stopGeneration = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    setIsLoading(false);
    setStreaming(null);
  }, []);

  const startNewChat = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    setIsLoading(false);
    setStreaming(null);
    setMessages([]);
    setInput("");
    setAttachedEventId(null);
    setError(null);
  }, []);

  const handleEditSubmit = useCallback(
    (messageIndex: number, newContent: string) => {
      const newList: ChatMessage[] = [
        ...messages.slice(0, messageIndex),
        { role: "user", content: newContent },
      ];
      submitConversation(newList);
    },
    [messages, submitConversation],
  );

  const handleClearAttachment = useCallback(() => {
    setAttachedEventId(null);
  }, []);

  const hasStarted = messages.length > 0 || streaming != null;

  // While streaming, the backend's in-flight chain is the source of truth;
  // otherwise the committed conversation is.
  const renderList =
    streaming && streaming.chain.length ? streaming.chain : messages;
  const responses = toolResponsesById(renderList);
  const renderTail = renderList[renderList.length - 1];
  const finalShown =
    renderTail?.role === "assistant" && hasText(renderTail.content);

  const renderMessage = (msg: ChatMessage, i: number) => {
    if (msg.role === "system" || msg.role === "tool") return null;

    if (msg.role === "user") {
      if (!hasText(msg.content)) return null;
      return (
        <div key={i} className="flex flex-col gap-2">
          <MessageBubble
            role="user"
            content={msg.content}
            messageIndex={i}
            onEditSubmit={handleEditSubmit}
            isComplete
            showStats={showStats}
          />
        </div>
      );
    }

    const calls = toolCallsForMessage(msg, responses);
    const contentText = hasText(msg.content) ? msg.content : "";
    const similar = getFindSimilarObjectsFromToolCalls(calls);
    const events = similar ? [] : getEventIdsFromSearchObjectsToolCalls(calls);

    return (
      <div key={i} className="flex flex-col gap-2">
        {calls.length > 0 && <ToolCallsGroup toolCalls={calls} />}
        {hasText(msg.reasoning) && (
          <ReasoningBubble
            reasoning={msg.reasoning}
            answerStarted={!!contentText}
          />
        )}
        {contentText && (
          <MessageBubble
            role="assistant"
            content={contentText}
            messageIndex={i}
            isComplete
            stats={msg.stats}
            showStats={showStats}
          />
        )}
        {similar ? (
          <ChatEventThumbnailsRow
            events={similar.results}
            anchor={similar.anchor}
            onAttach={setAttachedEventId}
          />
        ) : (
          <ChatEventThumbnailsRow
            events={events}
            onAttach={setAttachedEventId}
          />
        )}
      </div>
    );
  };

  const processingDots = (
    <div className="flex items-center gap-2 self-start rounded-2xl bg-muted px-5 py-4">
      <span className="size-2.5 animate-bounce rounded-full bg-muted-foreground/60 [animation-delay:-0.32s]" />
      <span className="size-2.5 animate-bounce rounded-full bg-muted-foreground/60 [animation-delay:-0.16s]" />
      <span className="size-2.5 animate-bounce rounded-full bg-muted-foreground/60" />
    </div>
  );

  return (
    <div className="flex size-full flex-col">
      <div className="flex shrink-0 items-center justify-end gap-2 px-2 pb-3 pt-2 md:px-4 md:pt-4">
        {hasStarted && (
          <Button
            className="flex items-center md:gap-2"
            aria-label={t("new_chat")}
            size="sm"
            onClick={startNewChat}
          >
            <LuMessageSquarePlus className="text-secondary-foreground" />
            <span className="hidden md:inline">{t("new_chat")}</span>
          </Button>
        )}
        <ChatSettings
          showStats={showStats ?? "while_generating"}
          setShowStats={setShowStats}
          autoScroll={autoScroll ?? true}
          setAutoScroll={setAutoScroll}
        />
      </div>
      <div
        ref={scrollRef}
        className="scrollbar-container flex min-h-0 flex-1 flex-col overflow-y-auto"
      >
        <div className="flex flex-1 justify-center px-2 md:px-4">
          <div className="flex w-full flex-col xl:w-[50%] 3xl:w-[35%]">
            {hasStarted ? (
              <div className="flex w-full flex-1 flex-col gap-3 pb-3">
                {renderList.map((msg, i) => renderMessage(msg, i))}
                {streaming &&
                  !finalShown &&
                  (streaming.content || streaming.reasoning ? (
                    <div className="flex flex-col gap-2">
                      {hasText(streaming.reasoning) && (
                        <ReasoningBubble
                          reasoning={streaming.reasoning}
                          answerStarted={!!streaming.content}
                        />
                      )}
                      {streaming.content && (
                        <MessageBubble
                          role="assistant"
                          content={streaming.content}
                          messageIndex={-1}
                          isComplete={false}
                          stats={streaming.stats}
                          showStats={showStats}
                        />
                      )}
                    </div>
                  ) : (
                    processingDots
                  ))}
                {error && (
                  <p
                    className="flex items-center gap-1.5 self-start text-sm text-destructive"
                    role="alert"
                  >
                    <LuCircleAlert className="size-3.5 shrink-0" />
                    {error}
                  </p>
                )}
              </div>
            ) : (
              <ChatStartingState
                onSendMessage={(message) => {
                  setInput("");
                  submitConversation([{ role: "user", content: message }]);
                }}
                supportsThinking={supportsThinking}
                thinkingEnabled={!!thinkingEnabled}
                setThinkingEnabled={setThinkingEnabled}
              />
            )}
          </div>
        </div>
      </div>
      {hasStarted && (
        <div className="flex shrink-0 justify-center p-2 md:px-4 md:pb-4">
          <div className="flex w-full xl:w-[50%] 3xl:w-[35%]">
            <ChatComposer
              input={input}
              setInput={setInput}
              sendMessage={sendMessage}
              isLoading={isLoading}
              placeholder={t("placeholder")}
              attachedEventId={attachedEventId}
              onClearAttachment={handleClearAttachment}
              onAttach={setAttachedEventId}
              onStop={stopGeneration}
              recentEventIds={recentEventIds}
              supportsThinking={supportsThinking}
              thinkingEnabled={!!thinkingEnabled}
              setThinkingEnabled={setThinkingEnabled}
            />
          </div>
        </div>
      )}
    </div>
  );
}
