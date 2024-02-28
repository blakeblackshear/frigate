import { baseUrl } from "@/api/baseUrl";
import TimeAgo from "../dynamic/TimeAgo";
import { Tooltip, TooltipContent, TooltipTrigger } from "../ui/tooltip";
import { useCallback, useMemo } from "react";
import { useApiHost } from "@/api";
import useSWR from "swr";
import { FrigateConfig } from "@/types/frigateConfig";
import { ReviewSegment } from "@/types/review";
import { useNavigate } from "react-router-dom";

type AnimatedEventThumbnailProps = {
  event: ReviewSegment;
};
export function AnimatedEventThumbnail({ event }: AnimatedEventThumbnailProps) {
  const apiHost = useApiHost();
  const { data: config } = useSWR<FrigateConfig>("config");

  // interaction

  const navigate = useNavigate();
  const onOpenReview = useCallback(() => {
    navigate("events", { state: { review: event.id } });
  }, [navigate, event]);

  // image behavior

  const imageUrl = useMemo(() => {
    if (Date.now() / 1000 < event.start_time + 20) {
      return `${apiHost}api/preview/${event.camera}/${event.start_time}/thumbnail.jpg`;
    }

    return `${baseUrl}api/review/${event.id}/preview.gif`;
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
          className="h-24 relative rounded bg-cover bg-no-repeat bg-center mr-4 cursor-pointer"
          style={{
            backgroundImage: `url(${imageUrl})`,
            aspectRatio: aspectRatio,
          }}
          onClick={onOpenReview}
        >
          <div className="absolute bottom-0 inset-x-0 h-6 bg-gradient-to-t from-slate-900/50 to-transparent rounded">
            <div className="w-full absolute left-1 bottom-0 text-xs text-white">
              <TimeAgo time={event.start_time * 1000} dense />
            </div>
          </div>
        </div>
      </TooltipTrigger>
      <TooltipContent>
        {`${[...event.data.objects, ...event.data.audio, ...(event.data.sub_labels || [])].join(", ")} detected`}
      </TooltipContent>
    </Tooltip>
  );
}
