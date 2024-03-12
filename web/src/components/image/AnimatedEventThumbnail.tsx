import { baseUrl } from "@/api/baseUrl";
import TimeAgo from "../dynamic/TimeAgo";
import { Tooltip, TooltipContent, TooltipTrigger } from "../ui/tooltip";
import { useCallback, useMemo, useState } from "react";
import useSWR from "swr";
import { FrigateConfig } from "@/types/frigateConfig";
import { ReviewSegment } from "@/types/review";
import { useNavigate } from "react-router-dom";
import { Skeleton } from "../ui/skeleton";

type AnimatedEventThumbnailProps = {
  event: ReviewSegment;
};
export function AnimatedEventThumbnail({ event }: AnimatedEventThumbnailProps) {
  const { data: config } = useSWR<FrigateConfig>("config");

  // interaction

  const navigate = useNavigate();
  const onOpenReview = useCallback(() => {
    navigate("events", { state: { review: event.id } });
  }, [navigate, event]);

  // image behavior

  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(0);
  const imageUrl = useMemo(() => {
    if (error > 0) {
      return `${baseUrl}api/review/${event.id}/preview.gif?key=${error}`;
    }

    return `${baseUrl}api/review/${event.id}/preview.gif`;
  }, [error, event]);

  const aspectRatio = useMemo(() => {
    if (!config) {
      return 1;
    }

    const detect = config.cameras[event.camera].detect;
    return detect.width / detect.height;
  }, [config, event]);

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div className="h-24 relative">
          <img
            className="size-full rounded object-cover object-center cursor-pointer"
            src={imageUrl}
            style={{
              aspectRatio: aspectRatio,
            }}
            onClick={onOpenReview}
            onLoad={() => setLoaded(true)}
            onError={() => {
              if (error < 2) {
                setError(error + 1);
              }
            }}
          />
          {!loaded && <Skeleton className="absolute inset-0" />}
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
