import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FaArrowUpLong } from "react-icons/fa6";
import { useTranslation } from "react-i18next";
import { useState, useCallback } from "react";
import axios from "axios";
import { MessageBubble } from "@/components/chat/ChatMessage";
import { ToolCallBubble } from "@/components/chat/ToolCallBubble";
import type { ChatMessage, ToolCall } from "@/types/chat";

export default function ChatPage() {
  const { t } = useTranslation(["views/chat"]);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sendMessage = useCallback(async () => {
    const text = input.trim();
    if (!text || isLoading) return;

    const userMessage: ChatMessage = { role: "user", content: text };
    setInput("");
    setError(null);
    setMessages((prev) => [...prev, userMessage]);
    setIsLoading(true);

    try {
      const apiMessages = [...messages, userMessage].map((m) => ({
        role: m.role,
        content: m.content,
      }));
      const { data } = await axios.post<{
        message: { role: string; content: string | null };
        tool_calls?: ToolCall[];
      }>("chat/completion", { messages: apiMessages });

      const content = data.message?.content ?? "";
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: content || " ",
          toolCalls: data.tool_calls?.length ? data.tool_calls : undefined,
        },
      ]);
    } catch {
      setError(t("error"));
    } finally {
      setIsLoading(false);
    }
  }, [input, isLoading, messages, t]);

  return (
    <div className="flex size-full justify-center p-2">
      <div className="flex size-full flex-col xl:w-[50%] 3xl:w-[35%]">
        <div className="flex min-h-0 w-full flex-1 flex-col gap-2 overflow-y-auto">
          {messages.map((msg, i) => (
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
              <MessageBubble role={msg.role} content={msg.content} />
            </div>
          ))}
          {isLoading && (
            <div className="self-start rounded-lg bg-muted px-3 py-2 text-muted-foreground">
              {t("processing")}
            </div>
          )}
          {error && (
            <p className="self-start text-sm text-destructive" role="alert">
              {error}
            </p>
          )}
        </div>
        <ChatEntry
          input={input}
          setInput={setInput}
          sendMessage={sendMessage}
          isLoading={isLoading}
          placeholder={t("placeholder")}
        />
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
          disabled={isLoading}
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
