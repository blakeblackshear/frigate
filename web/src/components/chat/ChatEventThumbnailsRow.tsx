import { useApiHost } from "@/api";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";

type ChatEvent = { id: string; score?: number };

type ChatEventThumbnailsRowProps = {
  events: ChatEvent[];
  anchor?: { id: string } | null;
};

/**
 * Horizontal scroll row of event thumbnail images for chat.
 * Optionally renders an anchor thumbnail with a "reference" badge above the
 * results, and per-event similarity scores when provided.
 * Renders nothing when there is nothing to show.
 */
export function ChatEventThumbnailsRow({
  events,
  anchor = null,
}: ChatEventThumbnailsRowProps) {
  const apiHost = useApiHost();
  const { t } = useTranslation(["views/chat"]);

  if (events.length === 0 && !anchor) return null;

  const renderThumb = (event: ChatEvent, isAnchor = false) => (
    <a
      key={event.id}
      href={`/explore?event_id=${event.id}`}
      target="_blank"
      rel="noopener noreferrer"
      className={cn(
        "relative aspect-square size-32 shrink-0 overflow-hidden rounded-lg",
        isAnchor && "ring-2 ring-primary",
      )}
    >
      <img
        className="size-full object-cover"
        src={`${apiHost}api/events/${event.id}/thumbnail.webp`}
        alt=""
        loading="lazy"
      />
      {typeof event.score === "number" && !isAnchor && (
        <span className="absolute bottom-1 right-1 rounded bg-black/60 px-1 text-[10px] text-white">
          {Math.round(event.score * 100)}%
        </span>
      )}
      {isAnchor && (
        <span className="absolute left-1 top-1 rounded bg-primary px-1 text-[10px] text-primary-foreground">
          {t("anchor")}
        </span>
      )}
    </a>
  );

  return (
    <div className="flex min-w-0 max-w-full flex-col gap-2 self-start">
      {anchor && (
        <div className="scrollbar-container min-w-0 overflow-x-auto">
          <div className="flex w-max gap-2">{renderThumb(anchor, true)}</div>
        </div>
      )}
      {events.length > 0 && (
        <div className="scrollbar-container min-w-0 overflow-x-auto">
          <div className="flex w-max gap-2">
            {events.map((event) => renderThumb(event))}
          </div>
        </div>
      )}
    </div>
  );
}
