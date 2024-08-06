import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useApiHost } from "@/api";
import { isCurrentHour } from "@/utils/dateUtil";
import { ReviewSegment } from "@/types/review";
import { getIconForLabel } from "@/utils/iconUtil";
import TimeAgo from "../dynamic/TimeAgo";
import useSWR from "swr";
import { FrigateConfig } from "@/types/frigateConfig";
import { isFirefox, isIOS, isMobile, isSafari } from "react-device-detect";
import Chip from "@/components/indicators/Chip";
import { useFormattedTimestamp } from "@/hooks/use-date-utils";
import useImageLoaded from "@/hooks/use-image-loaded";
import { useSwipeable } from "react-swipeable";
import { Tooltip, TooltipContent, TooltipTrigger } from "../ui/tooltip";
import ImageLoadingIndicator from "../indicators/ImageLoadingIndicator";
import useContextMenu from "@/hooks/use-contextmenu";
import ActivityIndicator from "../indicators/activity-indicator";
import { TimelineScrubMode, TimeRange } from "@/types/timeline";
import { NoThumbSlider } from "../ui/slider";
import { PREVIEW_FPS, PREVIEW_PADDING } from "@/types/preview";
import { capitalizeFirstLetter } from "@/utils/stringUtil";
import { baseUrl } from "@/api/baseUrl";
import { cn } from "@/lib/utils";

type PreviewPlayerProps = {
  review: ReviewSegment;
  allPreviews?: Preview[];
  scrollLock?: boolean;
  timeRange: TimeRange;
  onTimeUpdate?: (time: number | undefined) => void;
  setReviewed: (review: ReviewSegment) => void;
  onClick: (review: ReviewSegment, ctrl: boolean) => void;
};

type Preview = {
  camera: string;
  src: string;
  type: string;
  start: number;
  end: number;
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
  const apiHost = useApiHost();
  const { data: config } = useSWR<FrigateConfig>("config");
  const [imgRef, imgLoaded, onImgLoad] = useImageLoaded();

  // interaction

  const [ignoreClick, setIgnoreClick] = useState(false);
  const handleOnClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (!ignoreClick) {
        onClick(review, e.metaKey);
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
    onClick(review, true);
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
        <div className={cn("absolute left-0 top-2", !isSafari && "z-40")}>
          <Tooltip>
            <div
              className="flex"
              onMouseEnter={() => setTooltipHovering(true)}
              onMouseLeave={() => setTooltipHovering(false)}
            >
              <TooltipTrigger asChild>
                <div className="mx-3 pb-1 text-sm text-white">
                  {(review.severity == "alert" ||
                    review.severity == "detection") && (
                    <>
                      <Chip
                        className={`flex items-start justify-between space-x-1 ${playingBack ? "hidden" : ""} bg-gradient-to-br ${review.has_been_reviewed ? "bg-green-600 from-green-600 to-green-700" : "bg-gray-500 from-gray-400 to-gray-500"} z-0`}
                      >
                        {review.data.objects.sort().map((object) => {
                          return getIconForLabel(object, "size-3 text-white");
                        })}
                        {review.data.audio.map((audio) => {
                          return getIconForLabel(audio, "size-3 text-white");
                        })}
                      </Chip>
                    </>
                  )}
                </div>
              </TooltipTrigger>
            </div>
            <TooltipContent className="capitalize">
              {[
                ...new Set([
                  ...(review.data.objects || []),
                  ...(review.data.sub_labels || []),
                  ...(review.data.audio || []),
                ]),
              ]
                .filter(
                  (item) => item !== undefined && !item.includes("-verified"),
                )
                .map((text) => capitalizeFirstLetter(text))
                .sort()
                .join(", ")
                .replaceAll("-verified", "")}
            </TooltipContent>
          </Tooltip>
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
        review={review}
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

type VideoPreviewProps = {
  relevantPreview: Preview;
  startTime: number;
  endTime?: number;
  showProgress?: boolean;
  loop?: boolean;
  setReviewed: () => void;
  setIgnoreClick: (ignore: boolean) => void;
  isPlayingBack: (ended: boolean) => void;
  onTimeUpdate?: (time: number | undefined) => void;
  windowVisible: boolean;
};
export function VideoPreview({
  relevantPreview,
  startTime,
  endTime,
  showProgress = true,
  loop = false,
  setReviewed,
  setIgnoreClick,
  isPlayingBack,
  onTimeUpdate,
  windowVisible,
}: VideoPreviewProps) {
  const playerRef = useRef<HTMLVideoElement | null>(null);
  const sliderRef = useRef<HTMLDivElement | null>(null);

  // keep track of playback state

  const [progress, setProgress] = useState(0);
  const [hoverTimeout, setHoverTimeout] = useState<NodeJS.Timeout>();
  const playerStartTime = useMemo(() => {
    if (!relevantPreview) {
      return 0;
    }

    // start with a bit of padding
    return Math.max(0, startTime - relevantPreview.start - PREVIEW_PADDING);

    // we know that these deps are correct
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const playerDuration = useMemo(
    () => (endTime ?? relevantPreview.end) - startTime + PREVIEW_PADDING,
    // we know that these deps are correct
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );
  const [lastPercent, setLastPercent] = useState(0.0);

  // initialize player correctly

  useEffect(() => {
    if (!playerRef.current) {
      return;
    }

    if (isSafari || (isFirefox && isMobile)) {
      playerRef.current.pause();
      setPlaybackMode("compat");
    } else {
      playerRef.current.currentTime = playerStartTime;
      playerRef.current.playbackRate = PREVIEW_FPS;
    }

    // we know that these deps are correct
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playerRef]);

  // time progress update

  const onProgress = useCallback(() => {
    if (!windowVisible) {
      return;
    }

    if (onTimeUpdate) {
      onTimeUpdate(
        relevantPreview.start + (playerRef.current?.currentTime || 0),
      );
    }

    const playerProgress =
      (playerRef.current?.currentTime || 0) - playerStartTime;

    // end with a bit of padding
    const playerPercent = (playerProgress / playerDuration) * 100;

    if (setReviewed && lastPercent < 50 && playerPercent > 50) {
      setReviewed();
    }

    setLastPercent(playerPercent);

    if (playerPercent > 100) {
      setReviewed();

      if (loop && playerRef.current) {
        if (playbackMode != "auto") {
          setPlaybackMode("auto");
          setTimeout(() => setPlaybackMode("compat"), 100);
        }

        playerRef.current.currentTime = playerStartTime;
        return;
      }

      if (isMobile) {
        isPlayingBack(false);

        if (onTimeUpdate) {
          onTimeUpdate(undefined);
        }
      } else {
        playerRef.current?.pause();
      }

      setPlaybackMode("auto");
      setProgress(100.0);
    } else {
      setProgress(playerPercent);
    }

    // we know that these deps are correct
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [setProgress, lastPercent, windowVisible]);

  // manual playback
  // safari is incapable of playing at a speed > 2x
  // so manual seeking is required on iOS

  const [playbackMode, setPlaybackMode] = useState<TimelineScrubMode>("auto");

  useEffect(() => {
    if (playbackMode != "compat" || !playerRef.current) {
      return;
    }

    let counter = 0;
    const intervalId: NodeJS.Timeout = setInterval(() => {
      if (playerRef.current) {
        playerRef.current.currentTime = playerStartTime + counter;
        counter += 1;
      }
    }, 1000 / PREVIEW_FPS);
    return () => clearInterval(intervalId);

    // we know that these deps are correct
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playbackMode, playerRef]);

  // user interaction

  useEffect(() => {
    setIgnoreClick(playbackMode != "auto" && playbackMode != "compat");
  }, [playbackMode, setIgnoreClick]);

  const onManualSeek = useCallback(
    (values: number[]) => {
      const value = values[0];

      if (!playerRef.current) {
        return;
      }

      if (playerRef.current.paused == false) {
        playerRef.current.pause();
      }

      if (setReviewed) {
        setReviewed();
      }

      setProgress(value);
      playerRef.current.currentTime =
        playerStartTime + (value / 100.0) * playerDuration;
    },

    // we know that these deps are correct
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [playerDuration, playerRef, playerStartTime, setIgnoreClick],
  );

  const onStopManualSeek = useCallback(() => {
    setTimeout(() => {
      setHoverTimeout(undefined);

      if (isSafari || (isFirefox && isMobile)) {
        setPlaybackMode("compat");
      } else {
        setPlaybackMode("auto");
        playerRef.current?.play();
      }
    }, 500);
  }, [playerRef]);

  const onProgressHover = useCallback(
    (event: React.MouseEvent<HTMLDivElement>) => {
      if (!sliderRef.current) {
        return;
      }

      const rect = sliderRef.current.getBoundingClientRect();
      const positionX = event.clientX - rect.left;
      const width = sliderRef.current.clientWidth;
      onManualSeek([Math.round((positionX / width) * 100)]);

      if (hoverTimeout) {
        clearTimeout(hoverTimeout);
      }
    },
    [sliderRef, hoverTimeout, onManualSeek],
  );

  return (
    <div className="relative aspect-video size-full bg-black">
      <video
        ref={playerRef}
        className="pointer-events-none aspect-video size-full bg-black"
        autoPlay
        playsInline
        preload="auto"
        muted
        onTimeUpdate={onProgress}
      >
        <source
          src={`${baseUrl}${relevantPreview.src.substring(1)}`}
          type={relevantPreview.type}
        />
      </video>
      {showProgress && (
        <NoThumbSlider
          ref={sliderRef}
          className={`absolute inset-x-0 bottom-0 z-30 cursor-col-resize ${playbackMode == "hover" || playbackMode == "drag" ? "h-4" : "h-2"}`}
          value={[progress]}
          onValueChange={(event) => {
            setPlaybackMode("drag");
            onManualSeek(event);
          }}
          onValueCommit={onStopManualSeek}
          min={0}
          step={1}
          max={100}
          onMouseMove={
            isMobile
              ? undefined
              : (event) => {
                  if (playbackMode != "drag") {
                    setPlaybackMode("hover");
                    onProgressHover(event);
                  }
                }
          }
          onMouseLeave={
            isMobile
              ? undefined
              : () => {
                  if (!sliderRef.current) {
                    return;
                  }

                  setHoverTimeout(setTimeout(() => onStopManualSeek(), 500));
                }
          }
        />
      )}
    </div>
  );
}

const MIN_LOAD_TIMEOUT_MS = 200;
type InProgressPreviewProps = {
  review: ReviewSegment;
  timeRange: TimeRange;
  showProgress?: boolean;
  loop?: boolean;
  setReviewed: (reviewId: string) => void;
  setIgnoreClick: (ignore: boolean) => void;
  isPlayingBack: (ended: boolean) => void;
  onTimeUpdate?: (time: number | undefined) => void;
  windowVisible: boolean;
};
export function InProgressPreview({
  review,
  timeRange,
  showProgress = true,
  loop = false,
  setReviewed,
  setIgnoreClick,
  isPlayingBack,
  onTimeUpdate,
  windowVisible,
}: InProgressPreviewProps) {
  const apiHost = useApiHost();
  const sliderRef = useRef<HTMLDivElement | null>(null);
  const { data: previewFrames } = useSWR<string[]>(
    `preview/${review.camera}/start/${Math.floor(review.start_time) - PREVIEW_PADDING}/end/${
      Math.ceil(review.end_time ?? timeRange.before) + PREVIEW_PADDING
    }/frames`,
    { revalidateOnFocus: false },
  );

  const [playbackMode, setPlaybackMode] = useState<TimelineScrubMode>("auto");
  const [hoverTimeout, setHoverTimeout] = useState<NodeJS.Timeout>();
  const [key, setKey] = useState(0);

  const handleLoad = useCallback(() => {
    if (!previewFrames || !windowVisible) {
      return;
    }

    if (onTimeUpdate) {
      onTimeUpdate(review.start_time - PREVIEW_PADDING + key);
    }

    if (playbackMode != "auto") {
      return;
    }

    if (key == previewFrames.length - 1) {
      if (!review.has_been_reviewed) {
        setReviewed(review.id);
      }

      if (loop) {
        setKey(0);
        return;
      }

      if (isMobile) {
        isPlayingBack(false);

        if (onTimeUpdate) {
          onTimeUpdate(undefined);
        }
      }

      return;
    }

    setTimeout(() => {
      if (setReviewed && key == Math.floor(previewFrames.length / 2)) {
        setReviewed(review.id);
      }

      if (previewFrames[key + 1]) {
        setKey(key + 1);
      }
    }, MIN_LOAD_TIMEOUT_MS);

    // we know that these deps are correct
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, playbackMode, previewFrames]);

  // user interaction

  useEffect(() => {
    setIgnoreClick(playbackMode != "auto");
  }, [playbackMode, setIgnoreClick]);

  const onManualSeek = useCallback(
    (values: number[]) => {
      const value = values[0];

      if (!review.has_been_reviewed) {
        setReviewed(review.id);
      }

      setKey(value);
    },

    // we know that these deps are correct
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [setIgnoreClick, setKey],
  );

  const onStopManualSeek = useCallback(
    (values: number[]) => {
      const value = values[0];
      setTimeout(() => {
        setPlaybackMode("auto");
        setKey(value - 1);
      }, 500);
    },
    [setPlaybackMode],
  );

  const onProgressHover = useCallback(
    (event: React.MouseEvent<HTMLDivElement>) => {
      if (!sliderRef.current || !previewFrames) {
        return;
      }

      const rect = sliderRef.current.getBoundingClientRect();
      const positionX = event.clientX - rect.left;
      const width = sliderRef.current.clientWidth;
      const progress = [Math.round((positionX / width) * previewFrames.length)];
      onManualSeek(progress);

      if (hoverTimeout) {
        clearTimeout(hoverTimeout);
      }
    },
    [sliderRef, hoverTimeout, previewFrames, onManualSeek],
  );

  if (!previewFrames || previewFrames.length == 0) {
    return (
      <img
        className="size-full"
        src={`${apiHost}${review.thumb_path.replace("/media/frigate/", "")}`}
      />
    );
  }

  return (
    <div className="relative flex size-full items-center bg-black">
      <img
        className="pointer-events-none size-full object-contain"
        src={`${apiHost}api/preview/${previewFrames[key]}/thumbnail.webp`}
        onLoad={handleLoad}
      />
      {showProgress && (
        <NoThumbSlider
          ref={sliderRef}
          className={`absolute inset-x-0 bottom-0 z-30 cursor-col-resize ${playbackMode != "auto" ? "h-4" : "h-2"}`}
          value={[key]}
          onValueChange={(event) => {
            setPlaybackMode("drag");
            onManualSeek(event);
          }}
          onValueCommit={onStopManualSeek}
          min={0}
          step={1}
          max={previewFrames.length - 1}
          onMouseMove={
            isMobile
              ? undefined
              : (event) => {
                  if (playbackMode != "drag") {
                    setPlaybackMode("hover");
                    onProgressHover(event);
                  }
                }
          }
          onMouseLeave={
            isMobile
              ? undefined
              : (event) => {
                  if (!sliderRef.current || !previewFrames) {
                    return;
                  }

                  const rect = sliderRef.current.getBoundingClientRect();
                  const positionX = event.clientX - rect.left;
                  const width = sliderRef.current.clientWidth;
                  const progress = [
                    Math.round((positionX / width) * previewFrames.length),
                  ];

                  setHoverTimeout(
                    setTimeout(() => onStopManualSeek(progress), 500),
                  );
                }
          }
        />
      )}
    </div>
  );
}
