import { useApiHost } from "@/api";
import { useTranslation } from "react-i18next";
import { LuX, LuExternalLink } from "react-icons/lu";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

type ChatAttachmentChipProps = {
  eventId: string;
  mode: "composer" | "bubble";
  onRemove?: () => void;
};

/**
 * Small horizontal chip rendering an event as an "attachment": a thumbnail,
 * a short label, an optional remove X (composer mode), and an external-link
 * icon that opens the event in Explore.
 */
export function ChatAttachmentChip({
  eventId,
  mode,
  onRemove,
}: ChatAttachmentChipProps) {
  const apiHost = useApiHost();
  const { t } = useTranslation(["views/chat"]);

  return (
    <div
      className={cn(
        "inline-flex max-w-full items-center gap-2 rounded-lg border border-border bg-background/80 p-1.5 pr-2",
        mode === "bubble" && "border-primary-foreground/30 bg-transparent",
      )}
    >
      <div className="relative size-10 shrink-0 overflow-hidden rounded-md">
        <img
          className="size-full object-cover"
          src={`${apiHost}api/events/${eventId}/thumbnail.webp`}
          alt=""
          loading="lazy"
          onError={(e) => {
            (e.currentTarget as HTMLImageElement).style.visibility = "hidden";
          }}
        />
      </div>
      <span
        className={cn(
          "truncate text-xs",
          mode === "bubble" ? "text-primary-foreground/90" : "text-foreground",
        )}
        title={eventId}
      >
        {eventId}
      </span>
      <Tooltip>
        <TooltipTrigger asChild>
          <a
            href={`/explore?event_id=${eventId}`}
            target="_blank"
            rel="noopener noreferrer"
            className={cn(
              "flex size-6 shrink-0 items-center justify-center rounded text-muted-foreground hover:text-foreground",
              mode === "bubble" &&
                "text-primary-foreground/70 hover:text-primary-foreground",
            )}
            onClick={(e) => e.stopPropagation()}
            aria-label={t("open_in_explore")}
          >
            <LuExternalLink className="size-3.5" />
          </a>
        </TooltipTrigger>
        <TooltipContent>{t("open_in_explore")}</TooltipContent>
      </Tooltip>
      {mode === "composer" && onRemove && (
        <Button
          variant="ghost"
          size="icon"
          className="size-6 shrink-0 text-muted-foreground hover:text-foreground"
          onClick={onRemove}
          aria-label={t("attachment_chip_remove")}
        >
          <LuX className="size-3.5" />
        </Button>
      )}
    </div>
  );
}
