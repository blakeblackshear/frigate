import { useState, useEffect, useRef, useCallback } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { useTranslation } from "react-i18next";
import copy from "copy-to-clipboard";
import { toast } from "sonner";
import { FaCopy, FaPencilAlt } from "react-icons/fa";
import { FaArrowUpLong } from "react-icons/fa6";
import { LuCheck } from "react-icons/lu";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { ChatAttachmentChip } from "@/components/chat/ChatAttachmentChip";
import { parseAttachedEvent } from "@/utils/chatUtil";

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

  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(() => {
    const text = content?.trim() || "";
    if (!text) return;
    if (copy(text)) {
      setCopied(true);
      toast.success(t("button.copiedToClipboard", { ns: "common" }));
      setTimeout(() => setCopied(false), 2000);
    }
  }, [content, t]);

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
          className="min-h-[80px] w-full resize-y rounded-2xl bg-primary px-4 py-3 text-primary-foreground placeholder:text-primary-foreground/60"
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

  const { eventId: attachedEventId, body: displayContent } = isUser
    ? parseAttachedEvent(content)
    : { eventId: null, body: content };

  return (
    <div
      className={cn(
        "flex max-w-[85%] flex-col gap-1",
        isUser ? "items-end self-end" : "items-start self-start",
      )}
    >
      <div
        className={cn(
          "rounded-2xl px-4 py-3",
          isUser ? "bg-primary text-primary-foreground" : "bg-muted",
        )}
      >
        {isUser ? (
          <div className="flex flex-col gap-2">
            {attachedEventId && (
              <ChatAttachmentChip eventId={attachedEventId} mode="bubble" />
            )}
            <div className="whitespace-pre-wrap">{displayContent}</div>
          </div>
        ) : (
          <div
            className={cn(
              !isComplete &&
                "[&>p:last-child]:inline after:ml-0.5 after:inline-block after:h-4 after:w-2 after:animate-cursor-blink after:rounded-sm after:bg-foreground after:align-middle after:content-['']",
            )}
          >
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              components={{
                p: ({ node: _n, ...props }) => (
                  <p className="my-2 first:mt-0 last:mb-0" {...props} />
                ),
                ul: ({ node: _n, ...props }) => (
                  <ul
                    className="my-2 list-disc space-y-1 pl-6 first:mt-0 last:mb-0"
                    {...props}
                  />
                ),
                ol: ({ node: _n, ...props }) => (
                  <ol
                    className="my-2 list-decimal space-y-1 pl-6 first:mt-0 last:mb-0"
                    {...props}
                  />
                ),
                li: ({ node: _n, ...props }) => (
                  <li className="pl-1" {...props} />
                ),
                code: ({ node: _n, className, ...props }) => (
                  <code
                    className={cn(
                      "rounded bg-foreground/10 px-1 py-0.5 font-mono text-sm",
                      className,
                    )}
                    {...props}
                  />
                ),
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
          </div>
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
                {copied ? (
                  <LuCheck className="size-3" />
                ) : (
                  <FaCopy className="size-3" />
                )}
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
