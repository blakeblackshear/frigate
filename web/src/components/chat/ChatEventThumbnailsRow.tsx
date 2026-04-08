import { useApiHost } from "@/api";
import { useTranslation } from "react-i18next";
import { LuExternalLink } from "react-icons/lu";
import { cn } from "@/lib/utils";

type ChatEvent = { id: string; score?: number };

type ChatEventThumbnailsRowProps = {
  events: ChatEvent[];
  anchor?: { id: string } | null;
  onAttach?: (eventId: string) => void;
};

/**
 * Horizontal scroll row of event thumbnail images for chat.
 * Optionally renders an anchor thumbnail with a "reference" badge above the
 * results, and per-event similarity scores when provided.
 * Clicking a thumbnail calls onAttach; a small external-link overlay opens
 * the event in Explore.
 * Renders nothing when there is nothing to show.
 */
export function ChatEventThumbnailsRow({
  events,
  anchor = null,
  onAttach,
}: ChatEventThumbnailsRowProps) {
  const apiHost = useApiHost();
  const { t } = useTranslation(["views/chat"]);

  if (events.length === 0 && !anchor) return null;

  const renderThumb = (event: ChatEvent, isAnchor = false) => (
    <div
      key={event.id}
      className={cn(
        "relative aspect-square size-32 shrink-0 overflow-hidden rounded-lg",
        isAnchor && "ring-2 ring-primary",
      )}
    >
      <button
        type="button"
        className="block size-full"
        onClick={() => onAttach?.(event.id)}
        aria-label={t("attach_event_aria", { eventId: event.id })}
      >
        <img
          className="size-full object-cover"
          src={`${apiHost}api/events/${event.id}/thumbnail.webp`}
          alt=""
          loading="lazy"
        />
      </button>
      <a
        href={`/explore?event_id=${event.id}`}
        target="_blank"
        rel="noopener noreferrer"
        onClick={(e) => e.stopPropagation()}
        className="absolute right-1 top-1 flex size-6 items-center justify-center rounded bg-black/60 text-white hover:bg-black/80"
        aria-label={t("open_in_explore")}
      >
        <LuExternalLink className="size-3" />
      </a>
      {typeof event.score === "number" && !isAnchor && (
        <span className="pointer-events-none absolute bottom-1 right-1 rounded bg-black/60 px-1 text-[10px] text-white">
          {Math.round(event.score * 100)}%
        </span>
      )}
      {isAnchor && (
        <span className="pointer-events-none absolute left-1 top-1 rounded bg-primary px-1 text-[10px] text-primary-foreground">
          {t("anchor")}
        </span>
      )}
    </div>
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
