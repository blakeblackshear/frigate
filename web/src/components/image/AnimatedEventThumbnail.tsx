import { baseUrl } from "@/api/baseUrl";
import { Event as FrigateEvent } from "@/types/event";
import TimeAgo from "../dynamic/TimeAgo";
import { Tooltip, TooltipContent, TooltipTrigger } from "../ui/tooltip";
import { useMemo } from "react";
import { useApiHost } from "@/api";
import useSWR from "swr";
import { FrigateConfig } from "@/types/frigateConfig";

type AnimatedEventThumbnailProps = {
  event: FrigateEvent;
};
export function AnimatedEventThumbnail({ event }: AnimatedEventThumbnailProps) {
  const apiHost = useApiHost();
  const { data: config } = useSWR<FrigateConfig>("config");

  const imageUrl = useMemo(() => {
    if (Date.now() / 1000 < event.start_time + 20) {
      return `${apiHost}api/preview/${event.camera}/${event.start_time}/thumbnail.jpg`;
    }

    return `${baseUrl}api/events/${event.id}/preview.gif`;
  }, [event]);

  const aspectRatio = useMemo(() => {
    if (!config) {
      return 1;
    }

    const detect = config.cameras[event.camera].detect;
    return detect.width / detect.height;
  }, [config]);

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div
          className="h-24 relative rounded bg-cover bg-no-repeat bg-center mr-4"
          style={{
            backgroundImage: `url(${imageUrl})`,
            aspectRatio: aspectRatio,
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
