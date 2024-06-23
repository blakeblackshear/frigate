import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useApiHost } from "@/api";
import { ReviewSegment } from "@/types/review";
import useSWR from "swr";
import { isFirefox, isMobile, isSafari } from "react-device-detect";
import { TimeRange } from "@/types/timeline";
import { NoThumbSlider } from "../ui/slider";
import { PREVIEW_FPS, PREVIEW_PADDING, Preview } from "@/types/preview";
import { baseUrl } from "@/api/baseUrl";

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
      setManualPlayback(true);
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
        if (manualPlayback) {
          setManualPlayback(false);
          setTimeout(() => setManualPlayback(true), 100);
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

      setManualPlayback(false);
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
    }, 1000 / PREVIEW_FPS);
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

      if (setReviewed) {
        setReviewed();
      }

      setProgress(value);
      playerRef.current.currentTime =
        playerStartTime + (value / 100.0) * playerDuration;
    },

    // we know that these deps are correct
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
      setHoverTimeout(undefined);

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
          className={`absolute inset-x-0 bottom-0 z-30 cursor-col-resize ${hoverTimeout != undefined ? "h-4" : "h-2"}`}
          value={[progress]}
          onValueChange={onManualSeek}
          onValueCommit={onStopManualSeek}
          min={0}
          step={1}
          max={100}
          onMouseMove={isMobile ? undefined : onProgressHover}
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
  const [manualFrame, setManualFrame] = useState(false);
  const [hoverTimeout, setHoverTimeout] = useState<NodeJS.Timeout>();
  const [key, setKey] = useState(0);

  const handleLoad = useCallback(() => {
    if (!previewFrames || !windowVisible) {
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
  }, [key, manualFrame, previewFrames]);

  // user interaction

  const onManualSeek = useCallback(
    (values: number[]) => {
      const value = values[0];

      if (!manualFrame) {
        setManualFrame(true);
        setIgnoreClick(true);
      }

      if (!review.has_been_reviewed) {
        setReviewed(review.id);
      }

      setKey(value);
    },

    // we know that these deps are correct
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
    <div className="relative flex size-full items-center bg-black">
      <img
        className="pointer-events-none size-full object-contain"
        src={`${apiHost}api/preview/${previewFrames[key]}/thumbnail.webp`}
        onLoad={handleLoad}
      />
      {showProgress && (
        <NoThumbSlider
          ref={sliderRef}
          className={`absolute inset-x-0 bottom-0 z-30 cursor-col-resize ${manualFrame ? "h-4" : "h-2"}`}
          value={[key]}
          onValueChange={onManualSeek}
          onValueCommit={onStopManualSeek}
          min={0}
          step={1}
          max={previewFrames.length - 1}
          onMouseMove={isMobile ? undefined : onProgressHover}
        />
      )}
    </div>
  );
}
