import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useApiHost } from "@/api";
import { isCurrentHour } from "@/utils/dateUtil";
import {
  ReviewSegment,
  ThreatLevel,
  THREAT_LEVEL_LABELS,
} from "@/types/review";
import { getIconForLabel } from "@/utils/iconUtil";
import TimeAgo from "../dynamic/TimeAgo";
import useSWR from "swr";
import { FrigateConfig } from "@/types/frigateConfig";
import { isIOS, isMobile, isSafari } from "react-device-detect";
import Chip from "@/components/indicators/Chip";
import { useFormattedTimestamp } from "@/hooks/use-date-utils";
import useImageLoaded from "@/hooks/use-image-loaded";
import { useSwipeable } from "react-swipeable";
import { Tooltip, TooltipContent, TooltipTrigger } from "../ui/tooltip";
import ImageLoadingIndicator from "../indicators/ImageLoadingIndicator";
import useContextMenu from "@/hooks/use-contextmenu";
import ActivityIndicator from "../indicators/activity-indicator";
import { TimeRange } from "@/types/timeline";
import { cn } from "@/lib/utils";
import { InProgressPreview, VideoPreview } from "../preview/ScrubbablePreview";
import { Preview } from "@/types/preview";
import { baseUrl } from "@/api/baseUrl";
import { useTranslation } from "react-i18next";
import { FaExclamationTriangle } from "react-icons/fa";
import { MdOutlinePersonSearch } from "react-icons/md";
import { getTranslatedLabel } from "@/utils/i18n";
import { formatList } from "@/utils/stringUtil";

type PreviewPlayerProps = {
  review: ReviewSegment;
  allPreviews?: Preview[];
  scrollLock?: boolean;
  timeRange: TimeRange;
  onTimeUpdate?: (time: number | undefined) => void;
  setReviewed: (review: ReviewSegment) => void;
  onClick: (review: ReviewSegment, ctrl: boolean, detail: boolean) => void;
};

export default function PreviewThumbnailPlayer({
  review,
  allPreviews,
  scrollLock = false,
  timeRange,
  setReviewed,
  onClick,
  onTimeUpdate,
}: PreviewPlayerProps) {
  const { t } = useTranslation(["components/player", "views/events"]);
  const apiHost = useApiHost();
  const { data: config } = useSWR<FrigateConfig>("config");
  const [imgRef, imgLoaded, onImgLoad] = useImageLoaded();

  // interaction

  const [ignoreClick, setIgnoreClick] = useState(false);
  const handleOnClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (!ignoreClick) {
        onClick(review, e.metaKey, false);
      }
    },
    [ignoreClick, review, onClick],
  );

  const handleSetReviewed = useCallback(() => {
    if (review.end_time && !review.has_been_reviewed) {
      review.has_been_reviewed = true;
      setReviewed(review);
    }
  }, [review, setReviewed]);

  const swipeHandlers = useSwipeable({
    onSwipedLeft: () => {
      setPlayback(false);
      handleSetReviewed();
    },
    onSwipedRight: () => setPlayback(true),
    preventScrollOnSwipe: true,
  });

  useContextMenu(imgRef, () => {
    onClick(review, true, false);
  });

  // playback

  const relevantPreview = useMemo(() => {
    if (!allPreviews) {
      return undefined;
    }

    let multiHour = false;
    const firstIndex = Object.values(allPreviews).findIndex((preview) => {
      if (preview.camera != review.camera || preview.end < review.start_time) {
        return false;
      }

      if ((review.end_time ?? timeRange.before) > preview.end) {
        multiHour = true;
      }

      return true;
    });

    if (firstIndex == -1) {
      return undefined;
    }

    if (!multiHour) {
      return allPreviews[firstIndex];
    }

    const firstPrev = allPreviews[firstIndex];
    const firstDuration = firstPrev.end - review.start_time;
    const secondDuration =
      (review.end_time ?? timeRange.before) - firstPrev.end;

    if (firstDuration > secondDuration) {
      // the first preview is longer than the second, return the first
      return firstPrev;
    } else {
      // the second preview is longer, return the second if it exists
      if (firstIndex < allPreviews.length - 1) {
        return allPreviews.find(
          (preview, idx) => idx > firstIndex && preview.camera == review.camera,
        );
      }

      return undefined;
    }
  }, [allPreviews, review, timeRange]);

  // Hover Playback

  const [hoverTimeout, setHoverTimeout] = useState<NodeJS.Timeout | null>();
  const [playback, setPlayback] = useState(false);
  const [tooltipHovering, setTooltipHovering] = useState(false);
  const playingBack = useMemo(
    () => playback && !tooltipHovering,
    [playback, tooltipHovering],
  );
  const [isHovered, setIsHovered] = useState(false);

  useEffect(() => {
    if (isHovered && scrollLock) {
      return;
    }

    if (isHovered && !tooltipHovering) {
      setHoverTimeout(
        setTimeout(() => {
          setPlayback(true);
          setHoverTimeout(null);
        }, 500),
      );
    } else {
      if (hoverTimeout) {
        clearTimeout(hoverTimeout);
      }

      setPlayback(false);

      if (onTimeUpdate) {
        onTimeUpdate(undefined);
      }
    }
    // we know that these deps are correct
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isHovered, scrollLock, tooltipHovering]);

  // date

  const formattedDate = useFormattedTimestamp(
    review.start_time,
    config?.ui.time_format == "24hour"
      ? t("time.formattedTimestampMonthDayHourMinute.24hour", { ns: "common" })
      : t("time.formattedTimestampMonthDayHourMinute.12hour", { ns: "common" }),
    config?.ui?.timezone,
  );

  const getEventType = (text: string) => {
    if (review.data.sub_labels?.includes(text)) return "manual";
    if (review.data.audio.includes(text)) return "audio";
    return "object";
  };

  return (
    <div
      className="relative size-full cursor-pointer"
      onMouseOver={isMobile ? undefined : () => setIsHovered(true)}
      onMouseLeave={isMobile ? undefined : () => setIsHovered(false)}
      onClick={handleOnClick}
      onAuxClick={(e) => {
        if (e.button === 1) {
          window.open(`${baseUrl}review?id=${review.id}`, "_blank")?.focus();
        }
      }}
      {...swipeHandlers}
    >
      {playingBack && (
        <div className="absolute inset-0 animate-in fade-in">
          <PreviewContent
            review={review}
            relevantPreview={relevantPreview}
            timeRange={timeRange}
            setReviewed={handleSetReviewed}
            setIgnoreClick={setIgnoreClick}
            isPlayingBack={setPlayback}
            onTimeUpdate={onTimeUpdate}
          />
        </div>
      )}
      <ImageLoadingIndicator
        className="absolute inset-0"
        imgLoaded={imgLoaded}
      />
      <div className={`${imgLoaded ? "visible" : "invisible"}`}>
        <img
          ref={imgRef}
          className={`size-full select-none transition-opacity ${
            playingBack ? "opacity-0" : "opacity-100"
          }`}
          style={
            isIOS
              ? {
                  WebkitUserSelect: "none",
                  WebkitTouchCallout: "none",
                }
              : undefined
          }
          draggable={false}
          src={`${apiHost}${review.thumb_path.replace("/media/frigate/", "")}`}
          loading={isSafari ? "eager" : "lazy"}
          onLoad={() => {
            onImgLoad();
          }}
        />
        {!playingBack && (
          <div
            className={cn(
              "rounded-t-l pointer-events-none absolute inset-x-0 top-0 h-[30%] w-full bg-gradient-to-b from-black/60 to-transparent",
              !isSafari && "z-10",
            )}
          />
        )}
        <div
          className={cn(
            "absolute left-0 top-2 flex gap-2",
            !isSafari && "z-40",
          )}
        >
          <Tooltip>
            <div
              className="flex"
              onMouseEnter={() => setTooltipHovering(true)}
              onMouseLeave={() => setTooltipHovering(false)}
            >
              <TooltipTrigger asChild>
                <div className="ml-3 pb-1 text-sm text-white">
                  {(review.severity == "alert" ||
                    review.severity == "detection") && (
                    <>
                      <Chip
                        className={`flex items-start justify-between space-x-1 ${playingBack ? "hidden" : ""} bg-gradient-to-br ${review.has_been_reviewed ? "bg-green-600 from-green-600 to-green-700" : "bg-gray-500 from-gray-400 to-gray-500"} z-0`}
                        onClick={() => onClick(review, false, true)}
                      >
                        {review.data.objects
                          .sort()
                          .map((object, idx) =>
                            getIconForLabel(
                              object,
                              "object",
                              "size-3 text-white",
                              `${object}-${idx}`,
                            ),
                          )}
                        {review.data.audio.map((audio) => {
                          return getIconForLabel(
                            audio,
                            "audio",
                            "size-3 text-white",
                          );
                        })}
                      </Chip>
                    </>
                  )}
                </div>
              </TooltipTrigger>
            </div>
            <TooltipContent>
              {review.data.metadata
                ? review.data.metadata.title
                : formatList(
                    [
                      ...new Set([
                        ...(review.data.objects || []),
                        ...(review.data.sub_labels || []),
                        ...(review.data.audio || []),
                      ]),
                    ]
                      .filter(
                        (item) =>
                          item !== undefined && !item.includes("-verified"),
                      )
                      .map((text) =>
                        getTranslatedLabel(text, getEventType(text)),
                      )
                      .sort(),
                  )}
            </TooltipContent>
          </Tooltip>
          {!!(
            review.data.metadata?.potential_threat_level &&
            !review.has_been_reviewed
          ) && (
            <Tooltip>
              <div
                className="flex"
                onMouseEnter={() => setTooltipHovering(true)}
                onMouseLeave={() => setTooltipHovering(false)}
              >
                <TooltipTrigger asChild>
                  <div className="pb-1 text-sm text-white">
                    {(review.severity == "alert" ||
                      review.severity == "detection") && (
                      <>
                        <Chip
                          className={`flex items-start justify-between space-x-1 ${playingBack ? "hidden" : ""} z-0 bg-gray-500 bg-gradient-to-br from-gray-400 to-gray-500`}
                          onClick={() => onClick(review, false, true)}
                        >
                          {review.data.metadata.potential_threat_level == 1 ? (
                            <MdOutlinePersonSearch className="size-3" />
                          ) : (
                            <FaExclamationTriangle className="size-3" />
                          )}
                        </Chip>
                      </>
                    )}
                  </div>
                </TooltipTrigger>
              </div>
              <TooltipContent className="smart-capitalize">
                {(() => {
                  const threatLevel =
                    review.data.metadata.potential_threat_level ?? 0;
                  switch (threatLevel) {
                    case ThreatLevel.NEEDS_REVIEW:
                      return t("needsReview", { ns: "views/events" });
                    case ThreatLevel.SECURITY_CONCERN:
                      return t("securityConcern", { ns: "views/events" });
                    default:
                      return (
                        THREAT_LEVEL_LABELS[threatLevel as ThreatLevel] ||
                        t("details.unknown", {
                          ns: "views/classificationModel",
                        })
                      );
                  }
                })()}
              </TooltipContent>
            </Tooltip>
          )}
        </div>
        {!playingBack && (
          <div
            className={cn(
              "rounded-b-l pointer-events-none absolute inset-x-0 bottom-0 h-[20%] w-full bg-gradient-to-t from-black/60 to-transparent",
              !isSafari && "z-10",
            )}
          >
            <div className="mx-3 flex h-full items-end justify-between pb-1 text-sm text-white">
              {review.end_time ? (
                <TimeAgo time={review.start_time * 1000} dense />
              ) : (
                <div>
                  <ActivityIndicator size={24} />
                </div>
              )}
              {formattedDate}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

type PreviewContentProps = {
  review: ReviewSegment;
  relevantPreview: Preview | undefined;
  timeRange: TimeRange;
  setReviewed: () => void;
  setIgnoreClick: (ignore: boolean) => void;
  isPlayingBack: (ended: boolean) => void;
  onTimeUpdate?: (time: number | undefined) => void;
};
function PreviewContent({
  review,
  relevantPreview,
  timeRange,
  setReviewed,
  setIgnoreClick,
  isPlayingBack,
  onTimeUpdate,
}: PreviewContentProps) {
  // preview

  if (relevantPreview) {
    return (
      <VideoPreview
        relevantPreview={relevantPreview}
        startTime={review.start_time}
        endTime={review.end_time}
        setReviewed={setReviewed}
        setIgnoreClick={setIgnoreClick}
        isPlayingBack={isPlayingBack}
        onTimeUpdate={onTimeUpdate}
        windowVisible={true}
      />
    );
  } else if (isCurrentHour(review.start_time)) {
    return (
      <InProgressPreview
        camera={review.camera}
        startTime={review.start_time}
        endTime={review.end_time}
        timeRange={timeRange}
        setReviewed={setReviewed}
        setIgnoreClick={setIgnoreClick}
        isPlayingBack={isPlayingBack}
        onTimeUpdate={onTimeUpdate}
        windowVisible={true}
      />
    );
  }
}
