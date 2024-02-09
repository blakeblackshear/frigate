import { baseUrl } from "@/api/baseUrl";
import { Event as FrigateEvent } from "@/types/event";
import { LuStar } from "react-icons/lu";
import TimeAgo from "../dynamic/TimeAgo";
import { Tooltip, TooltipContent, TooltipTrigger } from "../ui/tooltip";

type EventThumbnailProps = {
  event: FrigateEvent;
  onFavorite?: (e: Event, event: FrigateEvent) => void;
};
export function EventThumbnail({ event, onFavorite }: EventThumbnailProps) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div
          className="relative rounded bg-cover aspect-square h-24 bg-no-repeat bg-center mr-4"
          style={{
            backgroundImage: `url(${baseUrl}api/events/${event.id}/thumbnail.jpg)`,
          }}
        >
          <LuStar
            className="absolute h-6 w-6 text-yellow-300 top-1 right-1 cursor-pointer"
            onClick={(e: Event) => (onFavorite ? onFavorite(e, event) : null)}
            fill={event.retain_indefinitely ? "currentColor" : "none"}
          />
          <div className="absolute bottom-0 w-full h-6 bg-gradient-to-t from-slate-900/50 to-transparent">
            <div className="absolute left-1 bottom-0 text-xs text-white w-full">
              <TimeAgo time={event.start_time * 1000} dense />
            </div>
          </div>
        </div>
      </TooltipTrigger>
      <TooltipContent>
        {`${event.label} ${
          event.sub_label ? `(${event.sub_label})` : ""
        } detected with score of ${(event.data.score * 100).toFixed(0)}% ${
          event.data.sub_label_score
            ? `(${event.data.sub_label_score * 100}%)`
            : ""
        }`}
      </TooltipContent>
    </Tooltip>
  );
}
