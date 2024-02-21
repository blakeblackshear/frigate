import VideoPlayer from "./VideoPlayer";
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useApiHost } from "@/api";
import Player from "video.js/dist/types/player";
import { formatUnixTimestampToDateTime } from "@/utils/dateUtil";
import { ReviewSegment } from "@/types/review";
import { Slider } from "../ui/slider";
import { getIconForLabel, getIconForSubLabel } from "@/utils/iconUtil";
import TimeAgo from "../dynamic/TimeAgo";
import useSWR from "swr";
import { FrigateConfig } from "@/types/frigateConfig";
import { isMobile, isSafari } from "react-device-detect";

type PreviewPlayerProps = {
  review: ReviewSegment;
  relevantPreview?: Preview;
  autoPlayback?: boolean;
  setReviewed?: () => void;
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
}: PreviewPlayerProps) {
  const apiHost = useApiHost();
  const { data: config } = useSWR<FrigateConfig>("config");
  const playerRef = useRef<Player | null>(null);

  const [hoverTimeout, setHoverTimeout] = useState<NodeJS.Timeout | null>();
  const [playback, setPlayback] = useState(false);
  const [progress, setProgress] = useState(0);

  const playingBack = useMemo(
    () => relevantPreview && playback,
    [playback, autoPlayback, relevantPreview]
  );

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
      if (!relevantPreview) {
        return;
      }

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

        if (playerRef.current) {
          playerRef.current.pause();
          playerRef.current.currentTime(
            review.start_time - relevantPreview.start
          );
        }
      }
    },
    [hoverTimeout, relevantPreview, review, playerRef]
  );

  return (
    <div
      className="relative w-full h-full cursor-pointer"
      onMouseEnter={isMobile ? undefined : () => onPlayback(true)}
      onMouseLeave={isMobile ? undefined : () => onPlayback(false)}
    >
      {playingBack ? (
        <PreviewContent
          playerRef={playerRef}
          review={review}
          relevantPreview={relevantPreview}
          playback={playingBack}
          setProgress={setProgress}
          setReviewed={setReviewed}
        />
      ) : (
        <img
          className="h-full w-full"
          src={`${apiHost}${review.thumb_path.replace("/media/frigate/", "")}`}
        />
      )}
      {!playingBack &&
        (review.severity == "alert" || review.severity == "detection") && (
          <div className="absolute top-1 left-[6px] flex gap-1">
            {review.data.objects.map((object) => {
              return getIconForLabel(object, "w-3 h-3 text-white");
            })}
            {review.data.audio.map((audio) => {
              return getIconForLabel(audio, "w-3 h-3 text-white");
            })}
            {review.data.sub_labels?.map((sub) => {
              return getIconForSubLabel(sub, "w-3 h-3 text-white");
            })}
          </div>
        )}
      {!playingBack && (
        <div className="absolute left-[6px] right-[6px] bottom-1 flex justify-between text-white">
          <TimeAgo time={review.start_time * 1000} />
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
    </div>
  );
}

type PreviewContentProps = {
  playerRef: React.MutableRefObject<Player | null>;
  review: ReviewSegment;
  relevantPreview: Preview | undefined;
  playback: boolean;
  setProgress?: (progress: number) => void;
  setReviewed?: () => void;
};
function PreviewContent({
  playerRef,
  review,
  relevantPreview,
  playback,
  setProgress,
  setReviewed,
}: PreviewContentProps) {
  if (relevantPreview && playback) {
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

          // start with a bit of padding
          const playerStartTime = Math.max(
            0,
            review.start_time - relevantPreview.start - 8
          );

          player.playbackRate(isSafari ? 2 : 8);
          player.currentTime(playerStartTime);
          player.on("timeupdate", () => {
            if (!setProgress || playerRef.current?.paused()) {
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
              playerPercent > 50
            ) {
              setReviewed();
            }

            if (playerPercent > 100) {
              playerRef.current?.pause();
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
  }
}
