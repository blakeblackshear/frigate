import VideoPlayer from "./VideoPlayer";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useApiHost } from "@/api";
import Player from "video.js/dist/types/player";
import { formatUnixTimestampToDateTime, isCurrentHour } from "@/utils/dateUtil";
import { ReviewSegment } from "@/types/review";
import { Slider } from "../ui/slider";
import { getIconForLabel, getIconForSubLabel } from "@/utils/iconUtil";
import TimeAgo from "../dynamic/TimeAgo";
import useSWR from "swr";
import { FrigateConfig } from "@/types/frigateConfig";
import { isMobile, isSafari } from "react-device-detect";
import Chip from "../Chip";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "../ui/context-menu";
import { LuCheckSquare, LuFileUp, LuTrash } from "react-icons/lu";
import axios from "axios";

type PreviewPlayerProps = {
  review: ReviewSegment;
  relevantPreview?: Preview;
  autoPlayback?: boolean;
  setReviewed?: () => void;
  onClick?: () => void;
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
  relevantPreview,
  autoPlayback = false,
  setReviewed,
  onClick,
}: PreviewPlayerProps) {
  const apiHost = useApiHost();
  const { data: config } = useSWR<FrigateConfig>("config");

  const [hoverTimeout, setHoverTimeout] = useState<NodeJS.Timeout | null>();
  const [playback, setPlayback] = useState(false);
  const [progress, setProgress] = useState(0);

  const playingBack = useMemo(() => playback, [playback, autoPlayback]);

  useEffect(() => {
    if (!autoPlayback) {
      setPlayback(false);

      if (hoverTimeout) {
        clearTimeout(hoverTimeout);
      }
      return;
    }

    const timeout = setTimeout(() => {
      setPlayback(true);
      setHoverTimeout(null);
    }, 500);

    return () => {
      clearTimeout(timeout);
    };
  }, [autoPlayback]);

  const onPlayback = useCallback(
    (isHovered: Boolean) => {
      if (isHovered) {
        setHoverTimeout(
          setTimeout(() => {
            setPlayback(true);
            setHoverTimeout(null);
          }, 500)
        );
      } else {
        if (hoverTimeout) {
          clearTimeout(hoverTimeout);
        }

        setPlayback(false);
        setProgress(0);
      }
    },
    [hoverTimeout, review]
  );

  return (
    <ContextMenu>
      <ContextMenuTrigger
        className="relative w-full h-full cursor-pointer"
        onMouseEnter={isMobile ? undefined : () => onPlayback(true)}
        onMouseLeave={isMobile ? undefined : () => onPlayback(false)}
        onClick={onClick}
      >
        {playingBack && (
          <div className="absolute left-0 top-0 right-0 bottom-0">
            <PreviewContent
              review={review}
              relevantPreview={relevantPreview}
              setProgress={setProgress}
              setReviewed={setReviewed}
            />
          </div>
        )}
        <img
          className={`w-full h-full transition-opacity ${
            playingBack ? "opacity-0" : "opacity-100"
          }`}
          loading="lazy"
          src={`${apiHost}${review.thumb_path.replace("/media/frigate/", "")}`}
        />
        {(review.severity == "alert" || review.severity == "detection") && (
          <Chip className="absolute top-2 left-2 flex gap-1 bg-gradient-to-br from-gray-400 to-gray-500 bg-gray-500 z-0">
            {review.data.objects.map((object) => {
              return getIconForLabel(object, "w-3 h-3 text-white");
            })}
            {review.data.audio.map((audio) => {
              return getIconForLabel(audio, "w-3 h-3 text-white");
            })}
            {review.data.sub_labels?.map((sub) => {
              return getIconForSubLabel(sub, "w-3 h-3 text-white");
            })}
          </Chip>
        )}
        {!playingBack && (
          <div className="absolute left-[6px] right-[6px] bottom-1 flex justify-between text-white">
            <TimeAgo time={review.start_time * 1000} dense />
            {config &&
              formatUnixTimestampToDateTime(review.start_time, {
                strftime_fmt:
                  config.ui.time_format == "24hour"
                    ? "%b %-d, %H:%M"
                    : "%b %-d, %I:%M %p",
              })}
          </div>
        )}
        <div className="absolute top-0 left-0 right-0 rounded-2xl z-10 w-full h-[30%] bg-gradient-to-b from-black/20 to-transparent pointer-events-none" />
        <div className="absolute bottom-0 left-0 right-0 rounded-2xl z-10 w-full h-[10%] bg-gradient-to-t from-black/20 to-transparent pointer-events-none" />
        {playingBack && (
          <Slider
            className="absolute left-0 right-0 bottom-0 z-10"
            value={[progress]}
            min={0}
            step={1}
            max={100}
          />
        )}
        {!playingBack && review.has_been_reviewed && (
          <div className="absolute left-0 top-0 bottom-0 right-0 bg-black bg-opacity-60" />
        )}
      </ContextMenuTrigger>
      <PreviewContextItems review={review} setReviewed={setReviewed} />
    </ContextMenu>
  );
}

type PreviewContentProps = {
  review: ReviewSegment;
  relevantPreview: Preview | undefined;
  setProgress?: (progress: number) => void;
  setReviewed?: () => void;
};
function PreviewContent({
  review,
  relevantPreview,
  setProgress,
  setReviewed,
}: PreviewContentProps) {
  const playerRef = useRef<Player | null>(null);
  const playerStartTime = useMemo(() => {
    if (!relevantPreview) {
      return 0;
    }

    // start with a bit of padding
    return Math.max(0, review.start_time - relevantPreview.start - 8);
  }, []);

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
        playerRef.current.currentTime(playerStartTime + counter);
        counter += 1;
      }
    }, 125);
    return () => clearInterval(intervalId);
  }, [manualPlayback, playerRef]);

  // preview

  if (relevantPreview) {
    return (
      <VideoPlayer
        options={{
          preload: "auto",
          autoplay: true,
          controls: false,
          muted: true,
          fluid: true,
          aspectRatio: "16:9",
          loadingSpinner: false,
          sources: relevantPreview
            ? [
                {
                  src: `${relevantPreview.src}`,
                  type: "video/mp4",
                },
              ]
            : [],
        }}
        seekOptions={{}}
        onReady={(player) => {
          playerRef.current = player;

          if (!relevantPreview) {
            return;
          }

          if (isSafari) {
            player.pause();
            setManualPlayback(true);
          } else {
            player.currentTime(playerStartTime);
            player.playbackRate(8);
          }

          let lastPercent = 0;
          player.on("timeupdate", () => {
            if (!setProgress) {
              return;
            }

            const playerProgress =
              (player.currentTime() || 0) - playerStartTime;

            // end with a bit of padding
            const playerDuration = review.end_time - review.start_time + 8;
            const playerPercent = (playerProgress / playerDuration) * 100;

            if (
              setReviewed &&
              !review.has_been_reviewed &&
              lastPercent < 50 &&
              playerPercent > 50
            ) {
              setReviewed();
            }

            lastPercent = playerPercent;

            if (playerPercent > 100) {
              playerRef.current?.pause();
              setManualPlayback(false);
              setProgress(100.0);
            } else {
              setProgress(playerPercent);
            }
          });
        }}
        onDispose={() => {
          playerRef.current = null;
        }}
      />
    );
  } else if (isCurrentHour(review.start_time)) {
    return (
      <InProgressPreview
        review={review}
        setProgress={setProgress}
        setReviewed={setReviewed}
      />
    );
  }
}

const MIN_LOAD_TIMEOUT_MS = 200;
type InProgressPreviewProps = {
  review: ReviewSegment;
  setProgress?: (progress: number) => void;
  setReviewed?: () => void;
};
function InProgressPreview({
  review,
  setProgress,
  setReviewed,
}: InProgressPreviewProps) {
  const apiHost = useApiHost();
  const { data: previewFrames } = useSWR<string[]>(
    `preview/${review.camera}/start/${Math.floor(review.start_time) - 4}/end/${
      Math.ceil(review.end_time) + 4
    }/frames`
  );
  const [key, setKey] = useState(0);

  const handleLoad = useCallback(() => {
    if (!previewFrames) {
      return;
    }

    if (key == previewFrames.length - 1) {
      if (setProgress) {
        setProgress(100);
      }

      return;
    }

    setTimeout(() => {
      if (setProgress) {
        setProgress((key / (previewFrames.length - 1)) * 100);
      }

      if (setReviewed && key == Math.floor(previewFrames.length / 2)) {
        setReviewed();
      }

      setKey(key + 1);
    }, MIN_LOAD_TIMEOUT_MS);
  }, [key, previewFrames]);

  if (!previewFrames || previewFrames.length == 0) {
    return (
      <img
        className="h-full w-full"
        loading="lazy"
        src={`${apiHost}${review.thumb_path.replace("/media/frigate/", "")}`}
      />
    );
  }

  return (
    <div className="w-full h-full flex items-center bg-black">
      <img
        className="w-full"
        src={`${apiHost}api/preview/${previewFrames[key]}/thumbnail.jpg`}
        onLoad={handleLoad}
      />
    </div>
  );
}

type PreviewContextItemsProps = {
  review: ReviewSegment;
  setReviewed?: () => void;
};
function PreviewContextItems({
  review,
  setReviewed,
}: PreviewContextItemsProps) {
  const exportReview = useCallback(() => {
    console.log(
      "trying to export to " +
        `export/${review.camera}/start/${review.start_time}/end/${review.end_time}`
    );
    axios.post(
      `export/${review.camera}/start/${review.start_time}/end/${review.end_time}`,
      { playback: "realtime" }
    );
  }, [review]);

  return (
    <ContextMenuContent>
      {!review.has_been_reviewed && (
        <ContextMenuItem onSelect={() => (setReviewed ? setReviewed() : null)}>
          <div className="w-full flex justify-between items-center">
            Mark As Reviewed
            <LuCheckSquare className="ml-4 w-4 h-4" />
          </div>
        </ContextMenuItem>
      )}
      <ContextMenuItem onSelect={() => exportReview()}>
        <div className="w-full flex justify-between items-center">
          Export
          <LuFileUp className="ml-4 w-4 h-4" />
        </div>
      </ContextMenuItem>
      <ContextMenuSeparator />
      <ContextMenuItem>
        <div className="w-full flex justify-between items-center text-danger">
          Delete
          <LuTrash className="ml-4 w-4 h-4" />
        </div>
      </ContextMenuItem>
    </ContextMenuContent>
  );
}
