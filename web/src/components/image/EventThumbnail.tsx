import { baseUrl } from "@/api/baseUrl";
import { Event as FrigateEvent } from "@/types/event";
import { LuStar } from "react-icons/lu";

type EventThumbnailProps = {
  event: FrigateEvent;
  onFavorite?: (e: Event, event: FrigateEvent) => void;
};
export function EventThumbnail({ event, onFavorite }: EventThumbnailProps) {
  return (
    <div
      className="relative rounded bg-cover w-40 h-24 bg-no-repeat bg-center mr-4"
      style={{
        backgroundImage: `url(${baseUrl}api/events/${event.id}/thumbnail.jpg)`,
      }}
    >
      <LuStar
        className="h-6 w-6 text-yellow-300 absolute top-1 right-1 cursor-pointer"
        onClick={(e: Event) => (onFavorite ? onFavorite(e, event) : null)}
        fill={event.retain_indefinitely ? "currentColor" : "none"}
      />
    </div>
  );
}
