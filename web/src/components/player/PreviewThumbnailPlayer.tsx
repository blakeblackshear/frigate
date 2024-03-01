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
import Chip from "../Chip";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "../ui/context-menu";
import { LuCheckCheck, LuCheckSquare, LuFileUp, LuTrash } from "react-icons/lu";
import { RiCheckboxMultipleLine } from "react-icons/ri";
import axios from "axios";
import { useFormattedTimestamp } from "@/hooks/use-date-utils";
import useImageLoaded from "@/hooks/use-image-loaded";
import { Skeleton } from "../ui/skeleton";
import { useSwipeable } from "react-swipeable";

type PreviewPlayerProps = {
  review: ReviewSegment;
  allPreviews?: Preview[];
  onTimeUpdate?: (time: number | undefined) => void;
  setReviewed: (reviewId: string) => void;
  markAboveReviewed: () => void;
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
  setReviewed,
  markAboveReviewed,
  onClick,
  onTimeUpdate,
}: PreviewPlayerProps) {
  const apiHost = useApiHost();
  const { data: config } = useSWR<FrigateConfig>("config");

  const [hoverTimeout, setHoverTimeout] = useState<NodeJS.Timeout | null>();
  const [playback, setPlayback] = useState(false);
  const [ignoreClick, setIgnoreClick] = useState(false);
  const [imgRef, imgLoaded, onImgLoad] = useImageLoaded();

  // interaction

  const handleOnClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (!ignoreClick) {
        onClick(review.id, e.metaKey);
      }
    },
    [ignoreClick, review, onClick],
  );

  const swipeHandlers = useSwipeable({
    onSwipedLeft: () => (setReviewed ? setReviewed(review.id) : null),
    onSwipedRight: () => setPlayback(true),
    preventScrollOnSwipe: true,
  });

  const handleSetReviewed = useCallback(
    () => setReviewed(review.id),
    [review, setReviewed],
  );

  // playback

  const relevantPreview = useMemo(
    () =>
      Object.values(allPreviews || []).find(
        (preview) =>
          preview.camera == review.camera &&
          preview.start < review.start_time &&
          preview.end > review.end_time,
      ),
    [allPreviews],
  );

  const playingBack = useMemo(() => playback, [playback]);

  const onPlayback = useCallback(
    (isHovered: boolean) => {
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
    },

    // we know that these deps are correct
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [hoverTimeout, review],
  );

  // date

  const formattedDate = useFormattedTimestamp(
    review.start_time,
    config?.ui.time_format == "24hour" ? "%b %-d, %H:%M" : "%b %-d, %I:%M %p",
  );

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        <div
          className="relative size-full cursor-pointer"
          onMouseEnter={isMobile ? undefined : () => onPlayback(true)}
          onMouseLeave={isMobile ? undefined : () => onPlayback(false)}
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
              src={`${apiHost}${review.thumb_path.replace(
                "/media/frigate/",
                "",
              )}`}
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
                  <div className="flex h-full justify-between items-end mx-3 pb-1 text-white text-sm ">
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
      </ContextMenuTrigger>
      <PreviewContextItems
        review={review}
        onSelect={() => onClick(review.id, true)}
        setReviewed={handleSetReviewed}
        markAboveReviewed={markAboveReviewed}
      />
    </ContextMenu>
  );
}

type PreviewContentProps = {
  review: ReviewSegment;
  relevantPreview: Preview | undefined;
  setReviewed?: () => void;
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
  setReviewed?: () => void;
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

  // keep track of playback state

  const [progress, setProgress] = useState(0);
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
        className="absolute inset-x-0 bottom-0"
        value={[progress]}
        onValueChange={onManualSeek}
        onValueCommit={onStopManualSeek}
        min={0}
        step={1}
        max={100}
      />
    </div>
  );
}

const MIN_LOAD_TIMEOUT_MS = 200;
type InProgressPreviewProps = {
  review: ReviewSegment;
  setReviewed?: (reviewId: string) => void;
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
  const { data: previewFrames } = useSWR<string[]>(
    `preview/${review.camera}/start/${Math.floor(review.start_time) - PREVIEW_PADDING}/end/${
      Math.ceil(review.end_time) + PREVIEW_PADDING
    }/frames`,
  );
  const [manualFrame, setManualFrame] = useState(false);
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
        src={`${apiHost}api/preview/${previewFrames[key]}/thumbnail.jpg`}
        onLoad={handleLoad}
      />
      <Slider
        className="absolute inset-x-0 bottom-0"
        value={[key]}
        onValueChange={onManualSeek}
        onValueCommit={onStopManualSeek}
        min={0}
        step={1}
        max={previewFrames.length - 1}
      />
    </div>
  );
}

type PreviewContextItemsProps = {
  review: ReviewSegment;
  onSelect: () => void;
  setReviewed: () => void;
  markAboveReviewed: () => void;
};
function PreviewContextItems({
  review,
  onSelect,
  setReviewed,
  markAboveReviewed,
}: PreviewContextItemsProps) {
  const exportReview = useCallback(() => {
    axios.post(
      `export/${review.camera}/start/${review.start_time}/end/${review.end_time}`,
      { playback: "realtime" },
    );
  }, [review]);

  const deleteReview = useCallback(() => {
    axios.delete(`reviews/${review.id}`);
  }, [review]);

  return (
    <ContextMenuContent>
      {isMobile && (
        <ContextMenuItem onSelect={onSelect}>
          <div className="w-full flex justify-between items-center">
            Select
            <RiCheckboxMultipleLine className="ml-4 size-4" />
          </div>
        </ContextMenuItem>
      )}
      <ContextMenuItem onSelect={markAboveReviewed}>
        <div className="w-full flex justify-between items-center">
          Mark Above as Reviewed
          <LuCheckCheck className="ml-4 size-4" />
        </div>
      </ContextMenuItem>
      <ContextMenuSeparator />
      {!review.has_been_reviewed && (
        <ContextMenuItem onSelect={() => (setReviewed ? setReviewed() : null)}>
          <div className="w-full flex justify-between items-center">
            Mark As Reviewed
            <LuCheckSquare className="ml-4 size-4" />
          </div>
        </ContextMenuItem>
      )}
      <ContextMenuItem onSelect={exportReview}>
        <div className="w-full flex justify-between items-center">
          Export
          <LuFileUp className="ml-4 size-4" />
        </div>
      </ContextMenuItem>
      <ContextMenuSeparator />
      <ContextMenuItem onSelect={deleteReview}>
        <div className="w-full flex justify-between items-center text-danger">
          Delete
          <LuTrash className="ml-4 size-4" />
        </div>
      </ContextMenuItem>
    </ContextMenuContent>
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
