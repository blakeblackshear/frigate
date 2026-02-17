import ReactMarkdown from "react-markdown";
import { useTranslation } from "react-i18next";
import copy from "copy-to-clipboard";
import { toast } from "sonner";
import { FaCopy } from "react-icons/fa";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

type MessageBubbleProps = {
  role: "user" | "assistant";
  content: string;
};

export function MessageBubble({ role, content }: MessageBubbleProps) {
  const { t } = useTranslation(["views/chat", "common"]);
  const isUser = role === "user";

  const handleCopy = () => {
    const text = content?.trim() || "";
    if (!text) return;
    if (copy(text)) {
      toast.success(t("button.copiedToClipboard", { ns: "common" }));
    }
  };

  return (
    <div
      className={cn(
        "flex flex-col gap-1",
        isUser ? "items-end self-end" : "items-start self-start",
      )}
    >
      <div
        className={cn(
          "rounded-lg px-3 py-2",
          isUser ? "bg-primary text-primary-foreground" : "bg-muted",
        )}
      >
        {isUser ? content : <ReactMarkdown>{content}</ReactMarkdown>}
      </div>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="size-7 text-muted-foreground hover:text-foreground"
            onClick={handleCopy}
            disabled={!content?.trim()}
            aria-label={t("button.copy", { ns: "common" })}
          >
            <FaCopy className="size-3" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>{t("button.copy", { ns: "common" })}</TooltipContent>
      </Tooltip>
    </div>
  );
}
