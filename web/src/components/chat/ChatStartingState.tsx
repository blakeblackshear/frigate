import { Button } from "@/components/ui/button";
import { useTranslation } from "react-i18next";
import { useState } from "react";
import type { StartingRequest } from "@/types/chat";
import { ChatComposer } from "@/components/chat/ChatComposer";

type ChatStartingStateProps = {
  onSendMessage: (message: string) => void;
  supportsThinking: boolean;
  thinkingEnabled: boolean;
  setThinkingEnabled: (value: boolean | undefined) => void;
};

export function ChatStartingState({
  onSendMessage,
  supportsThinking,
  thinkingEnabled,
  setThinkingEnabled,
}: ChatStartingStateProps) {
  const { t } = useTranslation(["views/chat"]);
  const [input, setInput] = useState("");

  const defaultRequests: StartingRequest[] = [
    {
      label: t("starting_requests.show_recent_events"),
      prompt: t("starting_requests_prompts.show_recent_events"),
    },
    {
      label: t("starting_requests.show_camera_status"),
      prompt: t("starting_requests_prompts.show_camera_status"),
    },
    {
      label: t("starting_requests.recap"),
      prompt: t("starting_requests_prompts.recap"),
    },
    {
      label: t("starting_requests.watch_camera"),
      prompt: t("starting_requests_prompts.watch_camera"),
    },
  ];

  const handleRequestClick = (prompt: string) => {
    onSendMessage(prompt);
  };

  const handleSend = (textOverride?: string) => {
    const text = (textOverride ?? input).trim();
    if (!text) return;
    onSendMessage(text);
    setInput("");
  };

  return (
    <div className="flex size-full flex-col items-center justify-center gap-6 p-8">
      <div className="flex flex-col items-center gap-2">
        <h1 className="text-4xl font-bold text-foreground">{t("title")}</h1>
        <p className="text-center text-muted-foreground md:text-left">
          {t("subtitle")}
        </p>
      </div>

      <div className="flex w-full max-w-2xl flex-col items-center gap-4">
        <p className="text-center text-sm text-muted-foreground">
          {t("suggested_requests")}
        </p>
        <div className="flex w-full flex-wrap justify-center gap-2">
          {defaultRequests.map((request, idx) => (
            <Button
              key={idx}
              variant="outline"
              className="max-w-sm text-sm"
              onClick={() => handleRequestClick(request.prompt)}
            >
              {request.label}
            </Button>
          ))}
        </div>
      </div>

      <div className="w-full max-w-2xl">
        <ChatComposer
          input={input}
          setInput={setInput}
          sendMessage={handleSend}
          placeholder={t("placeholder")}
          supportsThinking={supportsThinking}
          thinkingEnabled={thinkingEnabled}
          setThinkingEnabled={setThinkingEnabled}
          large
        />
      </div>
    </div>
  );
}
