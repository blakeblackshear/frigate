import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FaArrowUpLong } from "react-icons/fa6";
import { LuCircleAlert } from "react-icons/lu";
import { useTranslation } from "react-i18next";
import { useState, useCallback, useRef, useEffect } from "react";
import axios from "axios";
import { ChatEventThumbnailsRow } from "@/components/chat/ChatEventThumbnailsRow";
import { MessageBubble } from "@/components/chat/ChatMessage";
import { ToolCallsGroup } from "@/components/chat/ToolCallsGroup";
import { ChatStartingState } from "@/components/chat/ChatStartingState";
import type { ChatMessage } from "@/types/chat";
import {
  getEventIdsFromSearchObjectsToolCalls,
  streamChatCompletion,
} from "@/utils/chatUtil";

export default function ChatPage() {
  const { t } = useTranslation(["views/chat"]);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    document.title = t("documentTitle");
  }, [t]);

  // Auto-scroll to bottom when messages change, but only if near bottom
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const isNearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 150;
    if (isNearBottom) {
      el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
    }
  }, [messages]);

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

      await streamChatCompletion(url, headers, apiMessages, {
        updateMessages: (updater) => setMessages(updater),
        onError: (message) => setError(message),
        onDone: () => setIsLoading(false),
        defaultErrorMessage: t("error"),
      });
    },
    [isLoading, t],
  );

  const sendMessage = useCallback(() => {
    const text = input.trim();
    if (!text || isLoading) return;
    setInput("");
    submitConversation([...messages, { role: "user", content: text }]);
  }, [input, isLoading, messages, submitConversation]);

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

  return (
    <div className="flex size-full justify-center p-2 md:p-4">
      <div className="flex size-full flex-col xl:w-[50%] 3xl:w-[35%]">
        {messages.length === 0 ? (
          <ChatStartingState
            onSendMessage={(message) => {
              setInput("");
              submitConversation([{ role: "user", content: message }]);
            }}
          />
        ) : (
          <>
            <div
              ref={scrollRef}
              className="scrollbar-container flex min-h-0 w-full flex-1 flex-col gap-3 overflow-y-auto"
            >
              {messages.map((msg, i) => {
                const isLastAssistant =
                  i === messages.length - 1 && msg.role === "assistant";
                const isComplete =
                  msg.role === "user" || !isLoading || !isLastAssistant;
                const hasToolCalls = msg.toolCalls && msg.toolCalls.length > 0;
                const hasContent = !!msg.content?.trim();
                const showProcessing =
                  isLastAssistant && isLoading && !hasContent;

                // Hide empty placeholder only when there are no tool calls yet
                if (
                  isLastAssistant &&
                  isLoading &&
                  !hasContent &&
                  !hasToolCalls
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
                    {showProcessing ? (
                      <div className="flex items-center gap-2 self-start rounded-2xl bg-muted px-5 py-4">
                        <span className="size-2 animate-bounce rounded-full bg-muted-foreground/60 [animation-delay:-0.3s]" />
                        <span className="size-2 animate-bounce rounded-full bg-muted-foreground/60 [animation-delay:-0.15s]" />
                        <span className="size-2 animate-bounce rounded-full bg-muted-foreground/60" />
                      </div>
                    ) : (
                      <MessageBubble
                        role={msg.role}
                        content={msg.content}
                        messageIndex={i}
                        onEditSubmit={
                          msg.role === "user" ? handleEditSubmit : undefined
                        }
                        isComplete={isComplete}
                      />
                    )}
                    {msg.role === "assistant" &&
                      isComplete &&
                      (() => {
                        const events = getEventIdsFromSearchObjectsToolCalls(
                          msg.toolCalls,
                        );
                        return <ChatEventThumbnailsRow events={events} />;
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
          </>
        )}
        {messages.length > 0 && (
          <ChatEntry
            input={input}
            setInput={setInput}
            sendMessage={sendMessage}
            isLoading={isLoading}
            placeholder={t("placeholder")}
          />
        )}
      </div>
    </div>
  );
}

type ChatEntryProps = {
  input: string;
  setInput: (value: string) => void;
  sendMessage: () => void;
  isLoading: boolean;
  placeholder: string;
};

function ChatEntry({
  input,
  setInput,
  sendMessage,
  isLoading,
  placeholder,
}: ChatEntryProps) {
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div className="mt-2 flex w-full flex-col items-center justify-center rounded-xl bg-secondary p-3">
      <div className="flex w-full flex-row items-center gap-2">
        <Input
          className="w-full flex-1 border-transparent bg-transparent shadow-none focus-visible:ring-0 dark:bg-transparent"
          placeholder={placeholder}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          aria-busy={isLoading}
        />
        <Button
          variant="select"
          className="size-10 shrink-0 rounded-full"
          disabled={!input.trim() || isLoading}
          onClick={sendMessage}
        >
          <FaArrowUpLong size="16" />
        </Button>
      </div>
    </div>
  );
}
