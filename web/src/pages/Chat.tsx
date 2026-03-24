import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FaArrowUpLong } from "react-icons/fa6";
import { useTranslation } from "react-i18next";
import { useState, useCallback } from "react";
import axios from "axios";
import { ChatEventThumbnailsRow } from "@/components/chat/ChatEventThumbnailsRow";
import { MessageBubble } from "@/components/chat/ChatMessage";
import { ToolCallBubble } from "@/components/chat/ToolCallBubble";
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
    <div className="flex size-full justify-center p-2">
      <div className="flex size-full flex-col xl:w-[50%] 3xl:w-[35%]">
        {messages.length === 0 ? (
          <ChatStartingState
            onSendMessage={(message) => {
              setInput("");
              submitConversation([{ role: "user", content: message }]);
            }}
          />
        ) : (
          <div className="scrollbar-container flex min-h-0 w-full flex-1 flex-col gap-2 overflow-y-auto">
            {messages.map((msg, i) => {
              const isStreamingPlaceholder =
                i === messages.length - 1 &&
                msg.role === "assistant" &&
                isLoading &&
                !msg.content?.trim() &&
                !(msg.toolCalls && msg.toolCalls.length > 0);
              if (isStreamingPlaceholder) {
                return <div key={i} />;
              }
              return (
                <div key={i} className="flex flex-col gap-2">
                  {msg.role === "assistant" && msg.toolCalls && (
                    <>
                      {msg.toolCalls.map((tc, tcIdx) => (
                        <div key={tcIdx} className="flex flex-col gap-2">
                          <ToolCallBubble
                            name={tc.name}
                            arguments={tc.arguments}
                            side="left"
                          />
                          {tc.response && (
                            <ToolCallBubble
                              name={tc.name}
                              response={tc.response}
                              side="right"
                            />
                          )}
                        </div>
                      ))}
                    </>
                  )}
                  <MessageBubble
                    role={msg.role}
                    content={msg.content}
                    messageIndex={i}
                    onEditSubmit={
                      msg.role === "user" ? handleEditSubmit : undefined
                    }
                    isComplete={
                      msg.role === "user" ||
                      !isLoading ||
                      i < messages.length - 1
                    }
                  />
                  {msg.role === "assistant" &&
                    (() => {
                      const isComplete = !isLoading || i < messages.length - 1;
                      if (!isComplete) return null;
                      const events = getEventIdsFromSearchObjectsToolCalls(
                        msg.toolCalls,
                      );
                      return <ChatEventThumbnailsRow events={events} />;
                    })()}
                </div>
              );
            })}
            {(() => {
              const lastMsg = messages[messages.length - 1];
              const showProcessing =
                isLoading &&
                lastMsg?.role === "assistant" &&
                !lastMsg.content?.trim() &&
                !(lastMsg.toolCalls && lastMsg.toolCalls.length > 0);
              return showProcessing ? (
                <div className="self-start rounded-lg bg-muted px-3 py-2 text-muted-foreground">
                  {t("processing")}
                </div>
              ) : null;
            })()}
            {error && (
              <p className="self-start text-sm text-destructive" role="alert">
                {error}
              </p>
            )}
          </div>
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
    <div className="flex w-full flex-col items-center justify-center rounded-xl bg-secondary p-2">
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
