import { baseUrl } from "@/api/baseUrl";
import { Event as FrigateEvent } from "@/types/event";
import TimeAgo from "../dynamic/TimeAgo";
import { Tooltip, TooltipContent, TooltipTrigger } from "../ui/tooltip";

type AnimatedEventThumbnailProps = {
  event: FrigateEvent;
};
export function AnimatedEventThumbnail({ event }: AnimatedEventThumbnailProps) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div
          className="relative rounded bg-cover aspect-video h-24 bg-no-repeat bg-center mr-4"
          style={{
            backgroundImage: `url(${baseUrl}api/events/${event.id}/preview.gif)`,
          }}
        >
          <div className="absolute bottom-0 w-full h-6 bg-gradient-to-t from-slate-900/50 to-transparent rounded">
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
