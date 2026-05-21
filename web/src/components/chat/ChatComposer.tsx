import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FaArrowUpLong, FaStop } from "react-icons/fa6";
import { LuBrain } from "react-icons/lu";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { ChatAttachmentChip } from "@/components/chat/ChatAttachmentChip";
import { ChatQuickReplies } from "@/components/chat/ChatQuickReplies";
import { ChatPaperclipButton } from "@/components/chat/ChatPaperclipButton";

type ChatComposerProps = {
  input: string;
  setInput: (value: string) => void;
  sendMessage: (textOverride?: string) => void;
  placeholder: string;

  supportsThinking: boolean;
  thinkingEnabled: boolean;
  setThinkingEnabled: (value: boolean | undefined) => void;

  isLoading?: boolean;
  onStop?: () => void;

  attachedEventId?: string | null;
  onClearAttachment?: () => void;
  onAttach?: (eventId: string) => void;
  recentEventIds?: string[];

  large?: boolean;
};

export function ChatComposer({
  input,
  setInput,
  sendMessage,
  placeholder,
  supportsThinking,
  thinkingEnabled,
  setThinkingEnabled,
  isLoading = false,
  onStop,
  attachedEventId,
  onClearAttachment,
  onAttach,
  recentEventIds,
  large = false,
}: ChatComposerProps) {
  const { t } = useTranslation(["views/chat"]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const showPaperclip = !!onAttach;
  const showStop = isLoading && !!onStop;

  return (
    <div className="flex w-full flex-col items-stretch justify-center gap-2 rounded-xl bg-secondary p-3">
      {attachedEventId && onClearAttachment && (
        <div className="flex items-center">
          <ChatAttachmentChip
            eventId={attachedEventId}
            mode="composer"
            onRemove={onClearAttachment}
          />
        </div>
      )}
      {attachedEventId && (
        <ChatQuickReplies
          onSend={(text) => sendMessage(text)}
          disabled={isLoading}
        />
      )}
      <div className="flex w-full flex-row items-center gap-2">
        {showPaperclip && (
          <ChatPaperclipButton
            recentEventIds={recentEventIds ?? []}
            onAttach={onAttach!}
            disabled={isLoading || attachedEventId != null}
          />
        )}
        {supportsThinking && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  type="button"
                  size="sm"
                  variant={thinkingEnabled ? "select" : "ghost"}
                  aria-pressed={thinkingEnabled}
                  aria-label={t("thinking.toggle")}
                  className={cn(
                    "flex size-9 shrink-0 items-center justify-center rounded-full p-0",
                    !thinkingEnabled && "text-secondary-foreground",
                  )}
                  onClick={() => setThinkingEnabled(!thinkingEnabled)}
                  disabled={isLoading}
                >
                  <LuBrain className="size-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>{t("thinking.toggle")}</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
        <Input
          className={cn(
            "w-full flex-1 border-transparent bg-transparent shadow-none focus-visible:ring-0 dark:bg-transparent",
            large && "h-12 text-base",
          )}
          placeholder={placeholder}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          aria-busy={isLoading}
        />
        {showStop ? (
          <Button
            variant="destructive"
            className="size-10 shrink-0 rounded-full"
            onClick={onStop}
          >
            <FaStop className="size-3" />
          </Button>
        ) : (
          <Button
            variant="select"
            className="size-10 shrink-0 rounded-full"
            disabled={!input.trim() || isLoading}
            onClick={() => sendMessage()}
          >
            <FaArrowUpLong className="size-4" />
          </Button>
        )}
      </div>
    </div>
  );
}
