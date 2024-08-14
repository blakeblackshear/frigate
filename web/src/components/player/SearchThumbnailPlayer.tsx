import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useApiHost } from "@/api";
import { isCurrentHour } from "@/utils/dateUtil";
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
import ActivityIndicator from "../indicators/activity-indicator";
import { capitalizeFirstLetter } from "@/utils/stringUtil";
import { VideoPreview } from "../preview/ScrubbablePreview";
import { Preview } from "@/types/preview";
import { SearchResult } from "@/types/search";
import useContextMenu from "@/hooks/use-contextmenu";
import { cn } from "@/lib/utils";

type SearchPlayerProps = {
  searchResult: SearchResult;
  allPreviews?: Preview[];
  scrollLock?: boolean;
  onClick: (searchResult: SearchResult, detail: boolean) => void;
};

export default function SearchThumbnailPlayer({
  searchResult,
  allPreviews,
  scrollLock = false,
  onClick,
}: SearchPlayerProps) {
  const apiHost = useApiHost();
  const { data: config } = useSWR<FrigateConfig>("config");
  const [imgRef, imgLoaded, onImgLoad] = useImageLoaded();

  // interaction

  const [ignoreClick, setIgnoreClick] = useState(false);
  const handleOnClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (!ignoreClick) {
        onClick(searchResult, e.metaKey);
      }
    },
    [ignoreClick, searchResult, onClick],
  );

  const swipeHandlers = useSwipeable({
    onSwipedLeft: () => setPlayback(false),
    onSwipedRight: () => setPlayback(true),
    preventScrollOnSwipe: true,
  });

  useContextMenu(imgRef, () => {
    onClick(searchResult, true);
  });

  // playback

  const relevantPreview = useMemo(() => {
    if (!allPreviews) {
      return undefined;
    }

    let multiHour = false;
    const firstIndex = Object.values(allPreviews).findIndex((preview) => {
      if (
        preview.camera != searchResult.camera ||
        preview.end < searchResult.start_time
      ) {
        return false;
      }

      if ((searchResult.end_time ?? Date.now() / 1000) > preview.end) {
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
    const firstDuration = firstPrev.end - searchResult.start_time;
    const secondDuration =
      (searchResult.end_time ?? Date.now() / 1000) - firstPrev.end;

    if (firstDuration > secondDuration) {
      // the first preview is longer than the second, return the first
      return firstPrev;
    } else {
      // the second preview is longer, return the second if it exists
      if (firstIndex < allPreviews.length - 1) {
        return allPreviews.find(
          (preview, idx) =>
            idx > firstIndex && preview.camera == searchResult.camera,
        );
      }

      return undefined;
    }
  }, [allPreviews, searchResult]);

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
    }
    // we know that these deps are correct
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isHovered, scrollLock, tooltipHovering]);

  // date

  const formattedDate = useFormattedTimestamp(
    searchResult.start_time,
    config?.ui.time_format == "24hour" ? "%b %-d, %H:%M" : "%b %-d, %I:%M %p",
  );

  return (
    <div
      className="relative size-full cursor-pointer"
      onMouseOver={isMobile ? undefined : () => setIsHovered(true)}
      onMouseLeave={isMobile ? undefined : () => setIsHovered(false)}
      onClick={handleOnClick}
      {...swipeHandlers}
    >
      {playingBack && (
        <div className="absolute inset-0 animate-in fade-in">
          <PreviewContent
            searchResult={searchResult}
            relevantPreview={relevantPreview}
            setIgnoreClick={setIgnoreClick}
            isPlayingBack={setPlayback}
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
          className={cn(
            "size-full select-none transition-opacity",
            playingBack ? "opacity-0" : "opacity-100",
            searchResult.search_source == "thumbnail" && "object-contain",
          )}
          style={
            isIOS
              ? {
                  WebkitUserSelect: "none",
                  WebkitTouchCallout: "none",
                }
              : undefined
          }
          draggable={false}
          src={`${apiHost}api/events/${searchResult.id}/thumbnail.jpg`}
          loading={isSafari ? "eager" : "lazy"}
          onLoad={() => {
            onImgLoad();
          }}
        />

        <div className="absolute left-0 top-2 z-40">
          <Tooltip>
            <div
              className="flex"
              onMouseEnter={() => setTooltipHovering(true)}
              onMouseLeave={() => setTooltipHovering(false)}
            >
              <TooltipTrigger asChild>
                <div className="mx-3 pb-1 text-sm text-white">
                  {
                    <>
                      <Chip
                        className={`flex items-start justify-between space-x-1 ${playingBack ? "hidden" : ""} "bg-gray-500 z-0 bg-gradient-to-br from-gray-400 to-gray-500`}
                        onClick={() => onClick(searchResult, true)}
                      >
                        {getIconForLabel(
                          searchResult.label,
                          "size-3 text-white",
                        )}
                      </Chip>
                    </>
                  }
                </div>
              </TooltipTrigger>
            </div>
            <TooltipContent className="capitalize">
              {[...new Set([searchResult.label])]
                .filter(
                  (item) => item !== undefined && !item.includes("-verified"),
                )
                .map((text) => capitalizeFirstLetter(text))
                .sort()
                .join(", ")
                .replaceAll("-verified", "")}{" "}
              {` Click To View Detection Details`}
            </TooltipContent>
          </Tooltip>
        </div>
        {!playingBack && (
          <>
            <div className="rounded-t-l pointer-events-none absolute inset-x-0 top-0 z-10 h-[30%] w-full bg-gradient-to-b from-black/60 to-transparent"></div>
            <div className="rounded-b-l pointer-events-none absolute inset-x-0 bottom-0 z-10 h-[20%] w-full bg-gradient-to-t from-black/60 to-transparent">
              <div className="mx-3 flex h-full items-end justify-between pb-1 text-sm text-white">
                {searchResult.end_time ? (
                  <TimeAgo time={searchResult.start_time * 1000} dense />
                ) : (
                  <div>
                    <ActivityIndicator size={24} />
                  </div>
                )}
                {formattedDate}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

type PreviewContentProps = {
  searchResult: SearchResult;
  relevantPreview: Preview | undefined;
  setIgnoreClick: (ignore: boolean) => void;
  isPlayingBack: (ended: boolean) => void;
  onTimeUpdate?: (time: number | undefined) => void;
};
function PreviewContent({
  searchResult,
  relevantPreview,
  setIgnoreClick,
  isPlayingBack,
  onTimeUpdate,
}: PreviewContentProps) {
  // preview

  if (relevantPreview) {
    return (
      <VideoPreview
        relevantPreview={relevantPreview}
        startTime={searchResult.start_time}
        endTime={searchResult.end_time}
        setIgnoreClick={setIgnoreClick}
        isPlayingBack={isPlayingBack}
        onTimeUpdate={onTimeUpdate}
        windowVisible={true}
        setReviewed={() => {}}
      />
    );
  } else if (isCurrentHour(searchResult.start_time)) {
    return (
      /*<InProgressPreview
        review={review}
        timeRange={timeRange}
        setIgnoreClick={setIgnoreClick}
        isPlayingBack={isPlayingBack}
        onTimeUpdate={onTimeUpdate}
            windowVisible={true}
            setReviewed={() => { }}
      />*/
      <div />
    );
  }
}
