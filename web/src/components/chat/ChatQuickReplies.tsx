import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";

type QuickReply = { labelKey: string; textKey: string };

const REPLIES: QuickReply[] = [
  {
    labelKey: "quick_reply_find_similar",
    textKey: "quick_reply_find_similar_text",
  },
  {
    labelKey: "quick_reply_tell_me_more",
    textKey: "quick_reply_tell_me_more_text",
  },
  { labelKey: "quick_reply_when_else", textKey: "quick_reply_when_else_text" },
];

type ChatQuickRepliesProps = {
  onSend: (text: string) => void;
  disabled?: boolean;
};

/**
 * Row of pill buttons shown in the composer while an attachment is pending.
 * Clicking a pill immediately calls onSend with the canned text.
 */
export function ChatQuickReplies({
  onSend,
  disabled = false,
}: ChatQuickRepliesProps) {
  const { t } = useTranslation(["views/chat"]);

  return (
    <div className="flex w-full flex-wrap gap-2">
      {REPLIES.map((reply) => (
        <Button
          key={reply.labelKey}
          variant="outline"
          size="sm"
          className="h-7 rounded-full px-3 text-xs"
          disabled={disabled}
          onClick={() => onSend(t(reply.textKey))}
        >
          {t(reply.labelKey)}
        </Button>
      ))}
    </div>
  );
}
