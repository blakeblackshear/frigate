import { StatusMessage } from "@/context/statusbar-context";
import { cn } from "@/lib/utils";
import { ProblemSeverity } from "@/types/stats";
import { IoIosWarning } from "react-icons/io";
import { Link } from "react-router-dom";

const SEVERITY_COLOR: Record<ProblemSeverity, string> = {
  error: "text-danger",
  warning: "text-orange-400",
  info: "text-selected",
};

type StatusMessageItemProps = {
  message: StatusMessage;
  className?: string;
  onNavigate?: () => void;
};

/** One status bar message, a link when it has one. */
export function StatusMessageItem({
  message,
  className,
  onNavigate,
}: StatusMessageItemProps) {
  const content = (
    <div
      className={cn(
        "flex items-center gap-2 text-sm",
        message.link && "cursor-pointer hover:underline",
        className,
      )}
    >
      <IoIosWarning
        className={cn("size-5 shrink-0", SEVERITY_COLOR[message.severity])}
      />
      {message.text}
    </div>
  );

  if (!message.link) {
    return content;
  }

  return (
    <Link to={message.link} onClick={onNavigate}>
      {content}
    </Link>
  );
}

type StatusMessageListProps = {
  messages: StatusMessage[];
  className?: string;
  onNavigate?: () => void;
};

/** Status bar messages stacked one per line. */
export default function StatusMessageList({
  messages,
  className,
  onNavigate,
}: StatusMessageListProps) {
  return (
    <div
      className={cn("flex flex-col gap-2", className)}
      data-testid="status-message-list"
    >
      {messages.map((message, index) => (
        // ids are unique only within a message key
        <StatusMessageItem
          key={`${index}:${message.id}`}
          message={message}
          onNavigate={onNavigate}
        />
      ))}
    </div>
  );
}
