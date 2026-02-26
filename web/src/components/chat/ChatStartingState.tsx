import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FaArrowUpLong } from "react-icons/fa6";
import { useTranslation } from "react-i18next";
import { useState } from "react";
import type { StartingRequest } from "@/types/chat";

type ChatStartingStateProps = {
  onSendMessage: (message: string) => void;
};

export function ChatStartingState({ onSendMessage }: ChatStartingStateProps) {
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
  ];

  const handleRequestClick = (prompt: string) => {
    onSendMessage(prompt);
  };

  const handleSubmit = () => {
    const text = input.trim();
    if (!text) return;
    onSendMessage(text);
    setInput("");
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className="flex size-full flex-col items-center justify-center gap-6 p-8">
      <div className="flex flex-col items-center gap-2">
        <h1 className="text-4xl font-bold text-foreground">{t("title")}</h1>
        <p className="text-muted-foreground">{t("subtitle")}</p>
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

      <div className="flex w-full max-w-2xl flex-row items-center gap-2 rounded-xl bg-secondary p-4">
        <Input
          className="h-12 w-full flex-1 border-transparent bg-transparent text-base shadow-none focus-visible:ring-0 dark:bg-transparent"
          placeholder={t("placeholder")}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
        />
        <Button
          variant="select"
          className="size-10 shrink-0 rounded-full"
          disabled={!input.trim()}
          onClick={handleSubmit}
        >
          <FaArrowUpLong size="18" />
        </Button>
      </div>
    </div>
  );
}
