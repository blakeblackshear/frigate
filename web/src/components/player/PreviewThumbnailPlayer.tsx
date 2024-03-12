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
import { Slider } from "../ui/slider-no-thumb";
import { getIconForLabel, getIconForSubLabel } from "@/utils/iconUtil";
import TimeAgo from "../dynamic/TimeAgo";
import useSWR from "swr";
import { FrigateConfig } from "@/types/frigateConfig";
import { isFirefox, isMobile, isSafari } from "react-device-detect";
import Chip from "@/components/indicators/Chip";
import { useFormattedTimestamp } from "@/hooks/use-date-utils";
import useImageLoaded from "@/hooks/use-image-loaded";
import { Skeleton } from "../ui/skeleton";
import { useSwipeable } from "react-swipeable";

type PreviewPlayerProps = {
  review: ReviewSegment;
  allPreviews?: Preview[];
  scrollLock?: boolean;
  onTimeUpdate?: React.Dispatch<React.SetStateAction<number | undefined>>;
  setReviewed: (review: ReviewSegment) => void;
  onClick: (reviewId: string, ctrl: boolean) => void;
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
        onClick(review.id, e.metaKey);
      }
    },
    [ignoreClick, review, onClick],
  );

  const swipeHandlers = useSwipeable({
    onSwipedLeft: () => (setReviewed ? setReviewed(review) : null),
    onSwipedRight: () => setPlayback(true),
    preventScrollOnSwipe: true,
  });

  const handleSetReviewed = useCallback(() => {
    review.has_been_reviewed = true;
    setReviewed(review);
  }, [review, setReviewed]);

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

      if (review.end_time > preview.end) {
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
    const secondDuration = review.end_time - firstPrev.end;

    if (firstDuration > secondDuration) {
      // the first preview is longer than the second, return the first
      return firstPrev;
    } else {
      // the second preview is longer, return the second if it exists
      if (firstIndex < allPreviews.length - 1) {
        return allPreviews[firstIndex + 1];
      }

      return undefined;
    }
  }, [allPreviews, review]);

  // Hover Playback

  const [hoverTimeout, setHoverTimeout] = useState<NodeJS.Timeout | null>();
  const [playback, setPlayback] = useState(false);
  const playingBack = useMemo(() => playback, [playback]);
  const [isHovered, setIsHovered] = useState(false);

  useEffect(() => {
    if (isHovered && scrollLock) {
      return;
    }

    if (isHovered) {
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
  }, [isHovered, scrollLock]);

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
      onContextMenu={(e) => {
        e.preventDefault();
        onClick(review.id, true);
      }}
      onClick={handleOnClick}
      {...swipeHandlers}
    >
      {playingBack && (
        <div className="absolute inset-0 animate-in fade-in">
          <PreviewContent
            review={review}
            relevantPreview={relevantPreview}
            setReviewed={handleSetReviewed}
            setIgnoreClick={setIgnoreClick}
            isPlayingBack={setPlayback}
            onTimeUpdate={onTimeUpdate}
          />
        </div>
      )}
      <PreviewPlaceholder imgLoaded={imgLoaded} />
      <div className={`${imgLoaded ? "visible" : "invisible"}`}>
        <img
          ref={imgRef}
          className={`w-full h-full transition-opacity ${
            playingBack ? "opacity-0" : "opacity-100"
          }`}
          src={`${apiHost}${review.thumb_path.replace("/media/frigate/", "")}`}
          loading={isSafari ? "eager" : "lazy"}
          onLoad={() => {
            onImgLoad();
          }}
        />

        {!playingBack && (
          <>
            <div className="absolute top-0 inset-x-0 rounded-t-l z-10 w-full h-[30%] bg-gradient-to-b from-black/60 to-transparent pointer-events-none">
              <div className="flex h-full justify-between items-start mx-3 pb-1 text-white text-sm ">
                {(review.severity == "alert" ||
                  review.severity == "detection") && (
                  <Chip className="absolute top-2 left-2 flex gap-1 bg-gradient-to-br from-gray-400 to-gray-500 bg-gray-500 z-0">
                    {review.data.objects.map((object) => {
                      return getIconForLabel(object, "size-3 text-white");
                    })}
                    {review.data.audio.map((audio) => {
                      return getIconForLabel(audio, "size-3 text-white");
                    })}
                    {review.data.sub_labels?.map((sub) => {
                      return getIconForSubLabel(sub, "size-3 text-white");
                    })}
                  </Chip>
                )}
              </div>
            </div>
            <div className="absolute bottom-0 inset-x-0 rounded-b-l z-10 w-full h-[20%] bg-gradient-to-t from-black/60 to-transparent pointer-events-none">
              <div className="flex h-full justify-between items-end mx-3 pb-1 text-white text-sm">
                <TimeAgo time={review.start_time * 1000} dense />
                {formattedDate}
              </div>
            </div>
          </>
        )}
      </div>
      {!playingBack && imgLoaded && review.has_been_reviewed && (
        <div className="absolute inset-0 z-10 bg-black bg-opacity-60" />
      )}
    </div>
  );
}

type PreviewContentProps = {
  review: ReviewSegment;
  relevantPreview: Preview | undefined;
  setReviewed: () => void;
  setIgnoreClick: (ignore: boolean) => void;
  isPlayingBack: (ended: boolean) => void;
  onTimeUpdate?: (time: number | undefined) => void;
};
function PreviewContent({
  review,
  relevantPreview,
  setReviewed,
  setIgnoreClick,
  isPlayingBack,
  onTimeUpdate,
}: PreviewContentProps) {
  // preview

  if (relevantPreview) {
    return (
      <VideoPreview
        review={review}
        relevantPreview={relevantPreview}
        setReviewed={setReviewed}
        setIgnoreClick={setIgnoreClick}
        isPlayingBack={isPlayingBack}
        onTimeUpdate={onTimeUpdate}
      />
    );
  } else if (isCurrentHour(review.start_time)) {
    return (
      <InProgressPreview
        review={review}
        setReviewed={setReviewed}
        setIgnoreClick={setIgnoreClick}
        isPlayingBack={isPlayingBack}
        onTimeUpdate={onTimeUpdate}
      />
    );
  }
}

const PREVIEW_PADDING = 16;
type VideoPreviewProps = {
  review: ReviewSegment;
  relevantPreview: Preview;
  setReviewed: () => void;
  setIgnoreClick: (ignore: boolean) => void;
  isPlayingBack: (ended: boolean) => void;
  onTimeUpdate?: (time: number | undefined) => void;
};
function VideoPreview({
  review,
  relevantPreview,
  setReviewed,
  setIgnoreClick,
  isPlayingBack,
  onTimeUpdate,
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
    return Math.max(
      0,
      review.start_time - relevantPreview.start - PREVIEW_PADDING,
    );

    // we know that these deps are correct
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const playerDuration = useMemo(
    () => review.end_time - review.start_time + PREVIEW_PADDING,
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
      setManualPlayback(true);
    } else {
      playerRef.current.currentTime = playerStartTime;
      playerRef.current.playbackRate = 8;
    }

    // we know that these deps are correct
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playerRef]);

  // time progress update

  const onProgress = useCallback(() => {
    if (onTimeUpdate) {
      onTimeUpdate(
        relevantPreview.start + (playerRef.current?.currentTime || 0),
      );
    }

    const playerProgress =
      (playerRef.current?.currentTime || 0) - playerStartTime;

    // end with a bit of padding
    const playerPercent = (playerProgress / playerDuration) * 100;

    if (
      setReviewed &&
      !review.has_been_reviewed &&
      lastPercent < 50 &&
      playerPercent > 50
    ) {
      setReviewed();
    }

    setLastPercent(playerPercent);

    if (playerPercent > 100) {
      if (!review.has_been_reviewed) {
        setReviewed();
      }

      if (isMobile) {
        isPlayingBack(false);

        if (onTimeUpdate) {
          onTimeUpdate(undefined);
        }
      } else {
        playerRef.current?.pause();
      }

      setManualPlayback(false);
      setProgress(100.0);
    } else {
      setProgress(playerPercent);
    }

    // we know that these deps are correct
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [setProgress, lastPercent]);

  // manual playback
  // safari is incapable of playing at a speed > 2x
  // so manual seeking is required on iOS

  const [manualPlayback, setManualPlayback] = useState(false);
  useEffect(() => {
    if (!manualPlayback || !playerRef.current) {
      return;
    }

    let counter = 0;
    const intervalId: NodeJS.Timeout = setInterval(() => {
      if (playerRef.current) {
        playerRef.current.currentTime = playerStartTime + counter;
        counter += 1;
      }
    }, 125);
    return () => clearInterval(intervalId);

    // we know that these deps are correct
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [manualPlayback, playerRef]);

  // user interaction

  const onManualSeek = useCallback(
    (values: number[]) => {
      const value = values[0];

      if (!playerRef.current) {
        return;
      }

      if (manualPlayback) {
        setManualPlayback(false);
        setIgnoreClick(true);
      }

      if (playerRef.current.paused == false) {
        playerRef.current.pause();
        setIgnoreClick(true);
      }

      setProgress(value);
      playerRef.current.currentTime =
        playerStartTime + (value / 100.0) * playerDuration;
    },
    [
      manualPlayback,
      playerDuration,
      playerRef,
      playerStartTime,
      setIgnoreClick,
    ],
  );

  const onStopManualSeek = useCallback(() => {
    setTimeout(() => {
      setIgnoreClick(false);

      if (isSafari || (isFirefox && isMobile)) {
        setManualPlayback(true);
      } else {
        playerRef.current?.play();
      }
    }, 500);
  }, [playerRef, setIgnoreClick]);

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

      setHoverTimeout(setTimeout(() => onStopManualSeek(), 500));
    },
    [sliderRef, hoverTimeout, onManualSeek, onStopManualSeek, setHoverTimeout],
  );

  return (
    <div className="relative size-full aspect-video bg-black">
      <video
        ref={playerRef}
        className="size-full aspect-video bg-black"
        autoPlay
        playsInline
        preload="auto"
        muted
        onTimeUpdate={onProgress}
      >
        <source src={relevantPreview.src} type={relevantPreview.type} />
      </video>
      <Slider
        ref={sliderRef}
        className="absolute inset-x-0 bottom-0 z-30"
        value={[progress]}
        onValueChange={onManualSeek}
        onValueCommit={onStopManualSeek}
        min={0}
        step={1}
        max={100}
        onMouseMove={isMobile ? undefined : onProgressHover}
      />
    </div>
  );
}

const MIN_LOAD_TIMEOUT_MS = 200;
type InProgressPreviewProps = {
  review: ReviewSegment;
  setReviewed: (reviewId: string) => void;
  setIgnoreClick: (ignore: boolean) => void;
  isPlayingBack: (ended: boolean) => void;
  onTimeUpdate?: (time: number | undefined) => void;
};
function InProgressPreview({
  review,
  setReviewed,
  setIgnoreClick,
  isPlayingBack,
  onTimeUpdate,
}: InProgressPreviewProps) {
  const apiHost = useApiHost();
  const sliderRef = useRef<HTMLDivElement | null>(null);
  const { data: previewFrames } = useSWR<string[]>(
    `preview/${review.camera}/start/${Math.floor(review.start_time) - PREVIEW_PADDING}/end/${
      Math.ceil(review.end_time) + PREVIEW_PADDING
    }/frames`,
    { revalidateOnFocus: false },
  );
  const [manualFrame, setManualFrame] = useState(false);
  const [hoverTimeout, setHoverTimeout] = useState<NodeJS.Timeout>();
  const [key, setKey] = useState(0);

  const handleLoad = useCallback(() => {
    if (!previewFrames) {
      return;
    }

    if (onTimeUpdate) {
      onTimeUpdate(review.start_time - PREVIEW_PADDING + key);
    }

    if (manualFrame) {
      return;
    }

    if (key == previewFrames.length - 1) {
      if (!review.has_been_reviewed) {
        setReviewed(review.id);
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

      setKey(key + 1);
    }, MIN_LOAD_TIMEOUT_MS);

    // we know that these deps are correct
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, manualFrame, previewFrames]);

  // user interaction

  const onManualSeek = useCallback(
    (values: number[]) => {
      const value = values[0];

      if (!manualFrame) {
        setManualFrame(true);
        setIgnoreClick(true);
      }

      setKey(value);
    },
    [manualFrame, setIgnoreClick, setManualFrame, setKey],
  );

  const onStopManualSeek = useCallback(
    (values: number[]) => {
      const value = values[0];
      setTimeout(() => {
        setIgnoreClick(false);
        setManualFrame(false);
        setKey(value - 1);
      }, 500);
    },
    [setManualFrame, setIgnoreClick],
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

      setHoverTimeout(setTimeout(() => onStopManualSeek(progress), 500));
    },
    [
      sliderRef,
      hoverTimeout,
      previewFrames,
      onManualSeek,
      onStopManualSeek,
      setHoverTimeout,
    ],
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
    <div className="relative size-full flex items-center bg-black">
      <img
        className="size-full object-contain"
        src={`${apiHost}api/preview/${previewFrames[key]}/thumbnail.webp`}
        onLoad={handleLoad}
      />
      <Slider
        ref={sliderRef}
        className="absolute inset-x-0 bottom-0 z-30"
        value={[key]}
        onValueChange={onManualSeek}
        onValueCommit={onStopManualSeek}
        min={0}
        step={1}
        max={previewFrames.length - 1}
        onMouseMove={isMobile ? undefined : onProgressHover}
      />
    </div>
  );
}

function PreviewPlaceholder({ imgLoaded }: { imgLoaded: boolean }) {
  if (imgLoaded) {
    return;
  }

  return isSafari ? (
    <div className={`absolute inset-0 bg-gray-300`} />
  ) : (
    <Skeleton className={`absolute inset-0`} />
  );
}
