import TimeAgo from "../dynamic/TimeAgo";
import { Tooltip, TooltipContent, TooltipTrigger } from "../ui/tooltip";
import { useCallback, useEffect, useMemo, useState } from "react";
import useSWR from "swr";
import { FrigateConfig } from "@/types/frigateConfig";
import { REVIEW_PADDING, ReviewSegment } from "@/types/review";
import { useNavigate } from "react-router-dom";
import { RecordingStartingPoint } from "@/types/record";
import axios from "axios";
import { isCurrentHour } from "@/utils/dateUtil";
import { useCameraPreviews } from "@/hooks/use-camera-previews";
import { baseUrl } from "@/api/baseUrl";
import { VideoPreview } from "../preview/ScrubbablePreview";
import { useApiHost } from "@/api";
import { isSafari } from "react-device-detect";
import { useUserPersistence } from "@/hooks/use-user-persistence";
import { Skeleton } from "../ui/skeleton";
import { Button } from "../ui/button";
import { FaCircleCheck } from "react-icons/fa6";
import { cn } from "@/lib/utils";
import { useTranslation } from "react-i18next";

type AnimatedEventCardProps = {
  event: ReviewSegment;
  selectedGroup?: string;
  updateEvents: () => void;
};
export function AnimatedEventCard({
  event,
  selectedGroup,
  updateEvents,
}: AnimatedEventCardProps) {
  const { t } = useTranslation(["views/events"]);
  const { data: config } = useSWR<FrigateConfig>("config");
  const apiHost = useApiHost();

  const currentHour = useMemo(() => isCurrentHour(event.start_time), [event]);

  const initialTimeRange = useMemo(() => {
    return {
      after: Math.round(event.start_time),
      before: Math.round(event.end_time || event.start_time + 20),
    };
  }, [event]);

  // preview

  const previews = useCameraPreviews(initialTimeRange, {
    camera: event.camera,
    fetchPreviews: !currentHour,
  });

  const tooltipText = useMemo(() => {
    if (event?.data?.metadata?.title) {
      return event.data.metadata.title;
    }

    return (
      `${[
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
        .replaceAll("-verified", "")} ` + t("detected")
    );
  }, [event, t]);

  // visibility

  const [windowVisible, setWindowVisible] = useState(true);
  const visibilityListener = useCallback(() => {
    setWindowVisible(document.visibilityState == "visible");
  }, []);

  useEffect(() => {
    addEventListener("visibilitychange", visibilityListener);

    return () => {
      removeEventListener("visibilitychange", visibilityListener);
    };
  }, [visibilityListener]);

  const [isLoaded, setIsLoaded] = useState(false);

  // interaction

  const navigate = useNavigate();
  const onOpenReview = useCallback(() => {
    const url =
      selectedGroup && selectedGroup != "default"
        ? `review?group=${selectedGroup}`
        : "review";
    navigate(url, {
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
  }, [navigate, selectedGroup, event]);

  // image behavior

  const [alertVideos, _, alertVideosLoaded] = useUserPersistence(
    "alertVideos",
    true,
  );

  const aspectRatio = useMemo(() => {
    if (
      !config ||
      !alertVideos ||
      !Object.keys(config.cameras).includes(event.camera)
    ) {
      return 16 / 9;
    }

    const detect = config.cameras[event.camera].detect;
    return detect.width / detect.height;
  }, [alertVideos, config, event]);

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div
          className="group relative h-24 flex-shrink-0 overflow-hidden rounded md:rounded-lg 4k:h-32"
          style={{
            aspectRatio: alertVideos ? aspectRatio : undefined,
          }}
        >
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                className="pointer-events-none absolute left-2 top-1 z-40 bg-gray-500 bg-gradient-to-br from-gray-400 to-gray-500 opacity-0 transition-opacity group-hover:pointer-events-auto group-hover:opacity-100"
                size="xs"
                aria-label={t("markAsReviewed")}
                onClick={async () => {
                  await axios.post(`reviews/viewed`, { ids: [event.id] });
                  updateEvents();
                }}
              >
                <FaCircleCheck className="size-3 text-white" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>{t("markAsReviewed")}</TooltipContent>
          </Tooltip>
          {previews != undefined && alertVideosLoaded && (
            <div
              className="size-full cursor-pointer"
              onClick={onOpenReview}
              onAuxClick={(e) => {
                if (e.button === 1) {
                  window
                    .open(`${baseUrl}review?id=${event.id}`, "_blank")
                    ?.focus();
                }
              }}
            >
              {!alertVideos ? (
                <img
                  className={cn(
                    "h-full w-auto min-w-10 select-none object-contain",
                    isSafari && !isLoaded ? "hidden" : "visible",
                  )}
                  src={`${apiHost}${event.thumb_path.replace("/media/frigate/", "")}`}
                  loading={isSafari ? "eager" : "lazy"}
                  onLoad={() => setIsLoaded(true)}
                />
              ) : (
                <>
                  {previews.length ? (
                    <VideoPreview
                      relevantPreview={previews[previews.length - 1]}
                      startTime={event.start_time}
                      endTime={event.end_time}
                      loop
                      showProgress={false}
                      setReviewed={() => {}}
                      setIgnoreClick={() => {}}
                      isPlayingBack={() => {}}
                      onTimeUpdate={() => {
                        if (!isLoaded) {
                          setIsLoaded(true);
                        }
                      }}
                      windowVisible={windowVisible}
                    />
                  ) : (
                    <video
                      preload="auto"
                      autoPlay
                      playsInline
                      muted
                      disableRemotePlayback
                      loop
                      onTimeUpdate={() => {
                        if (!isLoaded) {
                          setIsLoaded(true);
                        }
                      }}
                    >
                      <source
                        src={`${baseUrl}api/review/${event.id}/preview?format=mp4`}
                        type="video/mp4"
                      />
                    </video>
                  )}
                </>
              )}
            </div>
          )}
          {isLoaded && (
            <div className="absolute inset-x-0 bottom-0 h-6 rounded bg-gradient-to-t from-slate-900/50 to-transparent">
              <div className="absolute bottom-0 left-1 w-full text-xs text-white">
                <TimeAgo time={event.start_time * 1000} dense />
              </div>
            </div>
          )}
          {!isLoaded && (
            <Skeleton
              style={{
                aspectRatio: alertVideos ? aspectRatio : 16 / 9,
              }}
              className="size-full"
            />
          )}
        </div>
      </TooltipTrigger>
      <TooltipContent>{tooltipText}</TooltipContent>
    </Tooltip>
  );
}
