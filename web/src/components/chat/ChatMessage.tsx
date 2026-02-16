import ReactMarkdown from "react-markdown";
import { cn } from "@/lib/utils";

type MessageBubbleProps = {
  role: "user" | "assistant";
  content: string;
};

export function MessageBubble({ role, content }: MessageBubbleProps) {
  const isUser = role === "user";

  return (
    <div
      className={cn(
        "rounded-lg px-3 py-2",
        isUser
          ? "self-end bg-primary text-primary-foreground"
          : "self-start bg-muted",
      )}
    >
      {isUser ? content : <ReactMarkdown>{content}</ReactMarkdown>}
    </div>
  );
}
