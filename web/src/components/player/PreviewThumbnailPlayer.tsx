import VideoPlayer from "./VideoPlayer";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { useApiHost } from "@/api";
import Player from "video.js/dist/types/player";
import { formatUnixTimestampToDateTime } from "@/utils/dateUtil";
import { isSafari } from "@/utils/browserUtil";
import { ReviewSegment } from "@/types/review";
import { Slider } from "../ui/slider";
import { getIconForLabel } from "@/utils/iconUtil";
import TimeAgo from "../dynamic/TimeAgo";
import useSWR from "swr";
import { FrigateConfig } from "@/types/frigateConfig";

type PreviewPlayerProps = {
  review: ReviewSegment;
  relevantPreview?: Preview;
  isMobile: boolean;
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
  isMobile,
  setReviewed,
  onClick,
}: PreviewPlayerProps) {
  const apiHost = useApiHost();
  const { data: config } = useSWR<FrigateConfig>("config");
  const playerRef = useRef<Player | null>(null);

  const [visible, setVisible] = useState(false);
  const [hover, setHover] = useState(false);
  const [progress, setProgress] = useState(0);

  const onPlayback = useCallback(
    (isHovered: Boolean) => {
      if (!relevantPreview) {
        return;
      }

      if (isHovered) {
        setHover(true);
      } else {
        setHover(false);
        setProgress(0);

        if (playerRef.current) {
          playerRef.current.pause();
          playerRef.current.currentTime(
            review.start_time - relevantPreview.start
          );
        }
      }
    },
    [relevantPreview, review, playerRef]
  );

  const autoPlayObserver = useRef<IntersectionObserver | null>();
  const preloadObserver = useRef<IntersectionObserver | null>();
  const inViewRef = useCallback(
    (node: HTMLElement | null) => {
      if (!preloadObserver.current) {
        try {
          preloadObserver.current = new IntersectionObserver(
            (entries) => {
              const [{ isIntersecting }] = entries;
              setVisible(isIntersecting);
            },
            {
              threshold: 0,
              root: document.getElementById("pageRoot"),
              rootMargin: "10% 0px 25% 0px",
            }
          );
          if (node) preloadObserver.current.observe(node);
        } catch (e) {
          // no op
        }
      }

      if (isMobile && !autoPlayObserver.current) {
        try {
          autoPlayObserver.current = new IntersectionObserver(
            (entries) => {
              const [{ isIntersecting }] = entries;
              if (isIntersecting) {
                onPlayback(true);
              } else {
                onPlayback(false);
              }
            },
            {
              threshold: 1.0,
              root: document.getElementById("pageRoot"),
              rootMargin: "-10% 0px -25% 0px",
            }
          );
          if (node) autoPlayObserver.current.observe(node);
        } catch (e) {
          // no op
        }
      }
    },
    [preloadObserver, autoPlayObserver, onPlayback]
  );

  return (
    <div
      ref={relevantPreview ? inViewRef : null}
      className="relative w-full h-full cursor-pointer"
      onMouseEnter={() => onPlayback(true)}
      onMouseLeave={() => onPlayback(false)}
    >
      {hover ? (
        <PreviewContent
          playerRef={playerRef}
          review={review}
          relevantPreview={relevantPreview}
          isVisible={isMobile ? visible : true}
          isMobile={isMobile}
          setProgress={setProgress}
          setReviewed={setReviewed}
          onClick={onClick}
        />
      ) : (
        <img
          className="h-full w-full"
          src={`${apiHost}${review.thumb_path.replace("/media/frigate/", "")}`}
        />
      )}
      {!hover &&
        (review.severity == "alert" || review.severity == "detection") && (
          <div className="absolute top-1 left-[6px] flex gap-1">
            {review.data.objects.map((object) => {
              return getIconForLabel(object, "w-3 h-3 text-white");
            })}
            {review.data.audio.map((audio) => {
              return getIconForLabel(audio, "w-3 h-3 text-white");
            })}
          </div>
        )}
      {!hover && (
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
      {hover && (
        <Slider
          className="absolute left-0 right-0 bottom-0 z-10"
          value={[progress]}
          min={0}
          step={1}
          max={100}
        />
      )}
      {!hover && review.has_been_reviewed && (
        <div className="absolute left-0 top-0 bottom-0 right-0 bg-black bg-opacity-60" />
      )}
    </div>
  );
}

type PreviewContentProps = {
  playerRef: React.MutableRefObject<Player | null>;
  review: ReviewSegment;
  relevantPreview: Preview | undefined;
  isVisible: boolean;
  isMobile: boolean;
  setProgress?: (progress: number) => void;
  setReviewed?: () => void;
  onClick?: () => void;
};
function PreviewContent({
  playerRef,
  review,
  relevantPreview,
  isVisible,
  isMobile,
  setProgress,
  setReviewed,
  onClick,
}: PreviewContentProps) {
  const slowPlayack = isSafari();

  // handle touchstart -> touchend as click
  const [touchStart, setTouchStart] = useState(0);
  const handleTouchStart = useCallback(() => {
    setTouchStart(new Date().getTime());
  }, []);
  useEffect(() => {
    if (!isMobile || !playerRef.current || !onClick) {
      return;
    }

    playerRef.current.on("touchend", () => {
      if (!onClick) {
        return;
      }

      const touchEnd = new Date().getTime();

      // consider tap less than 100 ms
      if (touchEnd - touchStart < 100) {
        onClick();
      }
    });
  }, [playerRef, touchStart]);

  if (relevantPreview && isVisible) {
    return (
      <VideoPlayer
        options={{
          preload: "auto",
          autoplay: true,
          controls: false,
          muted: true,
          fluid: true,
          aspectRatio: '16:9',
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

          const playerStartTime = review.start_time - relevantPreview.start;

          player.playbackRate(slowPlayack ? 2 : 8);
          player.currentTime(playerStartTime);
          player.on("timeupdate", () => {
            if (!setProgress || playerRef.current?.paused()) {
              return;
            }

            const playerProgress =
              (player.currentTime() || 0) - playerStartTime;
            const playerDuration = review.end_time - review.start_time;
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
          if (isMobile && onClick) {
            player.on("touchstart", handleTouchStart);
          }
        }}
        onDispose={() => {
          playerRef.current = null;
        }}
      />
    );
  }
}
