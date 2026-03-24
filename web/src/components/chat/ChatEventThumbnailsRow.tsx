import { useApiHost } from "@/api";

type ChatEventThumbnailsRowProps = {
  events: { id: string }[];
};

/**
 * Horizontal scroll row of event thumbnail images for chat (e.g. after search_objects).
 * Renders nothing when events is empty.
 */
export function ChatEventThumbnailsRow({
  events,
}: ChatEventThumbnailsRowProps) {
  const apiHost = useApiHost();

  if (events.length === 0) return null;

  return (
    <div className="flex min-w-0 max-w-full flex-col gap-1 self-start">
      <div className="scrollbar-container min-w-0 overflow-x-auto">
        <div className="flex w-max gap-2">
          {events.map((event) => (
            <a
              key={event.id}
              href={`/explore?event_id=${event.id}`}
              target="_blank"
              rel="noopener noreferrer"
              className="relative aspect-square size-32 shrink-0 overflow-hidden rounded-lg"
            >
              <img
                className="size-full object-cover"
                src={`${apiHost}api/events/${event.id}/thumbnail.webp`}
                alt=""
                loading="lazy"
              />
            </a>
          ))}
        </div>
      </div>
    </div>
  );
}
