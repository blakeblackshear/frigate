import TimeAgo from "../dynamic/TimeAgo";
import { Tooltip, TooltipContent, TooltipTrigger } from "../ui/tooltip";
import { useCallback, useMemo } from "react";
import useSWR from "swr";
import { FrigateConfig } from "@/types/frigateConfig";
import { REVIEW_PADDING, ReviewSegment } from "@/types/review";
import { useNavigate } from "react-router-dom";
import { RecordingStartingPoint } from "@/types/record";
import axios from "axios";
import {
  InProgressPreview,
  VideoPreview,
} from "../player/PreviewThumbnailPlayer";
import { isCurrentHour } from "@/utils/dateUtil";
import { useCameraPreviews } from "@/hooks/use-camera-previews";

type AnimatedEventCardProps = {
  event: ReviewSegment;
};
export function AnimatedEventCard({ event }: AnimatedEventCardProps) {
  const { data: config } = useSWR<FrigateConfig>("config");

  const currentHour = useMemo(() => isCurrentHour(event.start_time), [event]);

  // preview

  const previews = useCameraPreviews(
    {
      after: Math.round(event.start_time),
      before: Math.round(event.end_time || event.start_time + 20),
    },
    {
      camera: event.camera,
      fetchPreviews: !currentHour,
    },
  );

  // interaction

  const navigate = useNavigate();
  const onOpenReview = useCallback(() => {
    navigate("review", {
      state: {
        severity: event.severity,
        recording: {
          camera: event.camera,
          startTime: event.start_time - REVIEW_PADDING,
          severity: event.severity,
        } as RecordingStartingPoint,
      },
    });
    axios.post(`reviews/viewed`, { ids: [event.id] });
  }, [navigate, event]);

  // image behavior

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
        <div
          className="relative h-24 4k:h-32"
          style={{
            aspectRatio: aspectRatio,
          }}
        >
          <div
            className="size-full cursor-pointer overflow-hidden rounded md:rounded-lg"
            onClick={onOpenReview}
          >
            {previews ? (
              <VideoPreview
                relevantPreview={previews[previews.length - 1]}
                startTime={event.start_time}
                endTime={event.end_time}
                loop
                showProgress={false}
                setReviewed={() => {}}
                setIgnoreClick={() => {}}
                isPlayingBack={() => {}}
              />
            ) : (
              <InProgressPreview
                review={event}
                timeRange={{
                  after: event.start_time,
                  before: event.end_time ?? event.start_time + 20,
                }}
                loop
                showProgress={false}
                setReviewed={() => {}}
                setIgnoreClick={() => {}}
                isPlayingBack={() => {}}
              />
            )}
          </div>
          <div className="absolute inset-x-0 bottom-0 h-6 rounded bg-gradient-to-t from-slate-900/50 to-transparent">
            <div className="absolute bottom-0 left-1 w-full text-xs text-white">
              <TimeAgo time={event.start_time * 1000} dense />
            </div>
          </div>
        </div>
      </TooltipTrigger>
      <TooltipContent>
        {`${[
          ...new Set([
            ...(event.data.objects || []),
            ...(event.data.sub_labels || []),
            ...(event.data.audio || []),
          ]),
        ]
          .filter((item) => item !== undefined && !item.includes("-verified"))
          .map((text) => text.charAt(0).toUpperCase() + text.substring(1))
          .sort()
          .join(", ")
          .replaceAll("-verified", "")} detected`}
      </TooltipContent>
    </Tooltip>
  );
}
