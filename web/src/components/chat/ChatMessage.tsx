import { useState, useEffect, useRef } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { useTranslation } from "react-i18next";
import copy from "copy-to-clipboard";
import { toast } from "sonner";
import { FaCopy, FaPencilAlt } from "react-icons/fa";
import { FaArrowUpLong } from "react-icons/fa6";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

type MessageBubbleProps = {
  role: "user" | "assistant";
  content: string;
  messageIndex?: number;
  onEditSubmit?: (messageIndex: number, newContent: string) => void;
  isComplete?: boolean;
};

export function MessageBubble({
  role,
  content,
  messageIndex = 0,
  onEditSubmit,
  isComplete = true,
}: MessageBubbleProps) {
  const { t } = useTranslation(["views/chat", "common"]);
  const isUser = role === "user";
  const [isEditing, setIsEditing] = useState(false);
  const [draftContent, setDraftContent] = useState(content);
  const editInputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    setDraftContent(content);
  }, [content]);

  useEffect(() => {
    if (isEditing) {
      editInputRef.current?.focus();
      editInputRef.current?.setSelectionRange(
        editInputRef.current.value.length,
        editInputRef.current.value.length,
      );
    }
  }, [isEditing]);

  const handleCopy = () => {
    const text = content?.trim() || "";
    if (!text) return;
    if (copy(text)) {
      toast.success(t("button.copiedToClipboard", { ns: "common" }));
    }
  };

  const handleEditClick = () => {
    setDraftContent(content);
    setIsEditing(true);
  };

  const handleEditSubmit = () => {
    const trimmed = draftContent.trim();
    if (!trimmed || onEditSubmit == null) return;
    onEditSubmit(messageIndex, trimmed);
    setIsEditing(false);
  };

  const handleEditCancel = () => {
    setDraftContent(content);
    setIsEditing(false);
  };

  const handleEditKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleEditSubmit();
    }
    if (e.key === "Escape") {
      handleEditCancel();
    }
  };

  if (isUser && isEditing) {
    return (
      <div className="flex w-full max-w-full flex-col gap-2 self-end">
        <Textarea
          ref={editInputRef}
          value={draftContent}
          onChange={(e) => setDraftContent(e.target.value)}
          onKeyDown={handleEditKeyDown}
          className="min-h-[80px] w-full resize-y rounded-lg bg-primary px-3 py-2 text-primary-foreground placeholder:text-primary-foreground/60"
          placeholder={t("placeholder")}
          rows={3}
        />
        <div className="flex items-center gap-2 self-end">
          <Button
            variant="ghost"
            size="sm"
            className="text-muted-foreground hover:text-foreground"
            onClick={handleEditCancel}
          >
            {t("button.cancel", { ns: "common" })}
          </Button>
          <Button
            variant="select"
            size="icon"
            className="size-9 rounded-full"
            disabled={!draftContent.trim()}
            onClick={handleEditSubmit}
            aria-label={t("send")}
          >
            <FaArrowUpLong size="16" />
          </Button>
        </div>
      </div>
    );
  }

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
        {isUser ? (
          content
        ) : (
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            components={{
              table: ({ node: _n, ...props }) => (
                <table
                  className="my-2 w-full border-collapse border border-border"
                  {...props}
                />
              ),
              th: ({ node: _n, ...props }) => (
                <th
                  className="border border-border bg-muted/50 px-2 py-1 text-left text-sm font-medium"
                  {...props}
                />
              ),
              td: ({ node: _n, ...props }) => (
                <td
                  className="border border-border px-2 py-1 text-sm"
                  {...props}
                />
              ),
            }}
          >
            {content}
          </ReactMarkdown>
        )}
      </div>
      <div className="flex items-center gap-0.5">
        {isUser && onEditSubmit != null && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="size-7 text-muted-foreground hover:text-foreground"
                onClick={handleEditClick}
                aria-label={t("button.edit", { ns: "common" })}
              >
                <FaPencilAlt className="size-3" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              {t("button.edit", { ns: "common" })}
            </TooltipContent>
          </Tooltip>
        )}
        {isComplete && (
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
            <TooltipContent>
              {t("button.copy", { ns: "common" })}
            </TooltipContent>
          </Tooltip>
        )}
      </div>
    </div>
  );
}
