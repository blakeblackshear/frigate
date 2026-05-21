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
  GenAIModelsResponse,
  ShowStatsMode,
} from "@/types/chat";
import { usePersistence } from "@/hooks/use-persistence";
import {
  getEventIdsFromSearchObjectsToolCalls,
  getFindSimilarObjectsFromToolCalls,
  prependAttachment,
  streamChatCompletion,
} from "@/utils/chatUtil";

export default function ChatPage() {
  const { t } = useTranslation(["views/chat"]);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
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
  }, [messages, autoScroll]);

  const submitConversation = useCallback(
    async (messagesToSend: ChatMessage[]) => {
      if (isLoading) return;
      const last = messagesToSend[messagesToSend.length - 1];
      if (!last || last.role !== "user" || !last.content.trim()) return;

      setError(null);
      const assistantPlaceholder: ChatMessage = {
        role: "assistant",
        content: "",
        toolCalls: undefined,
      };
      setMessages([...messagesToSend, assistantPlaceholder]);
      setIsLoading(true);

      const apiMessages = messagesToSend.map((m) => ({
        role: m.role,
        content: m.content,
      }));

      const baseURL = axios.defaults.baseURL ?? "";
      const url = `${baseURL}chat/completion`;
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
        ...(axios.defaults.headers.common as Record<string, string>),
      };

      const controller = new AbortController();
      abortRef.current = controller;

      await streamChatCompletion(
        url,
        headers,
        apiMessages,
        {
          updateMessages: (updater) => setMessages(updater),
          onError: (message) => setError(message),
          onDone: () => {
            abortRef.current = null;
            setIsLoading(false);
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
    for (let i = messages.length - 1; i >= 0; i--) {
      const msg = messages[i];
      if (msg.role !== "assistant" || !msg.toolCalls) continue;
      const similar = getFindSimilarObjectsFromToolCalls(msg.toolCalls);
      if (similar) return similar.results.map((e) => e.id);
      const events = getEventIdsFromSearchObjectsToolCalls(msg.toolCalls);
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
  }, []);

  const startNewChat = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    setIsLoading(false);
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

  const hasStarted = messages.length > 0;

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
                {messages.map((msg, i) => {
                  const isLastAssistant =
                    i === messages.length - 1 && msg.role === "assistant";
                  const isComplete =
                    msg.role === "user" || !isLoading || !isLastAssistant;
                  const hasToolCalls =
                    msg.toolCalls && msg.toolCalls.length > 0;
                  const hasContent = !!msg.content?.trim();
                  const hasReasoning = !!msg.reasoning?.trim();
                  const showProcessing =
                    isLastAssistant &&
                    isLoading &&
                    !hasContent &&
                    !hasReasoning;

                  // Hide empty placeholder only when there are no tool calls
                  // and no reasoning streaming yet
                  if (
                    isLastAssistant &&
                    isLoading &&
                    !hasContent &&
                    !hasToolCalls &&
                    !hasReasoning
                  )
                    return (
                      <div
                        key={i}
                        className="flex items-center gap-2 self-start rounded-2xl bg-muted px-5 py-4"
                      >
                        <span className="size-2.5 animate-bounce rounded-full bg-muted-foreground/60 [animation-delay:-0.32s]" />
                        <span className="size-2.5 animate-bounce rounded-full bg-muted-foreground/60 [animation-delay:-0.16s]" />
                        <span className="size-2.5 animate-bounce rounded-full bg-muted-foreground/60" />
                      </div>
                    );

                  return (
                    <div key={i} className="flex flex-col gap-2">
                      {msg.role === "assistant" && hasToolCalls && (
                        <ToolCallsGroup toolCalls={msg.toolCalls!} />
                      )}
                      {msg.role === "assistant" && hasReasoning && (
                        <ReasoningBubble
                          reasoning={msg.reasoning!}
                          answerStarted={hasContent}
                        />
                      )}
                      {showProcessing ? (
                        <div className="flex items-center gap-2 self-start rounded-2xl bg-muted px-5 py-4">
                          <span className="size-2 animate-bounce rounded-full bg-muted-foreground/60 [animation-delay:-0.3s]" />
                          <span className="size-2 animate-bounce rounded-full bg-muted-foreground/60 [animation-delay:-0.15s]" />
                          <span className="size-2 animate-bounce rounded-full bg-muted-foreground/60" />
                        </div>
                      ) : msg.role === "assistant" &&
                        !hasContent &&
                        hasReasoning &&
                        !isComplete ? null : (
                        <MessageBubble
                          role={msg.role}
                          content={msg.content}
                          messageIndex={i}
                          onEditSubmit={
                            msg.role === "user" ? handleEditSubmit : undefined
                          }
                          isComplete={isComplete}
                          stats={msg.stats}
                          showStats={showStats}
                        />
                      )}
                      {msg.role === "assistant" &&
                        isComplete &&
                        (() => {
                          const similar = getFindSimilarObjectsFromToolCalls(
                            msg.toolCalls,
                          );
                          if (similar) {
                            return (
                              <ChatEventThumbnailsRow
                                events={similar.results}
                                anchor={similar.anchor}
                                onAttach={setAttachedEventId}
                              />
                            );
                          }
                          const events = getEventIdsFromSearchObjectsToolCalls(
                            msg.toolCalls,
                          );
                          return (
                            <ChatEventThumbnailsRow
                              events={events}
                              onAttach={setAttachedEventId}
                            />
                          );
                        })()}
                    </div>
                  );
                })}
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
