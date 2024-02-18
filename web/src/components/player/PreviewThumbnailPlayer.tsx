import VideoPlayer from "./VideoPlayer";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { useApiHost } from "@/api";
import Player from "video.js/dist/types/player";
import { isCurrentHour } from "@/utils/dateUtil";
import { isSafari } from "@/utils/browserUtil";
import { ReviewSegment } from "@/types/review";
import { Slider } from "../ui/slider";

type PreviewPlayerProps = {
  review: ReviewSegment;
  relevantPreview?: Preview;
  isMobile: boolean;
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
  onClick,
}: PreviewPlayerProps) {
  const playerRef = useRef<Player | null>(null);

  const [visible, setVisible] = useState(false);
  const [hover, setHover] = useState(false);
  const [isInitiallyVisible, setIsInitiallyVisible] = useState(false);
  const [progress, setProgress] = useState(0);

  const onPlayback = useCallback(
    (isHovered: Boolean) => {
      if (!relevantPreview) {
        return;
      }

      if (!playerRef.current) {
        if (isHovered) {
          setIsInitiallyVisible(true);
        }

        return;
      }

      if (isHovered) {
        setHover(true);
        playerRef.current.play();
      } else {
        setHover(false);
        setProgress(0);
        playerRef.current.pause();
        playerRef.current.currentTime(
          review.start_time - relevantPreview.start
        );
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
      <PreviewContent
        playerRef={playerRef}
        review={review}
        relevantPreview={relevantPreview}
        isVisible={visible}
        isInitiallyVisible={isInitiallyVisible}
        isMobile={isMobile}
        setProgress={setProgress}
        onClick={onClick}
      />
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
    </div>
  );
}

type PreviewContentProps = {
  playerRef: React.MutableRefObject<Player | null>;
  review: ReviewSegment;
  relevantPreview: Preview | undefined;
  isVisible: boolean;
  isInitiallyVisible: boolean;
  isMobile: boolean;
  setProgress?: (progress: number) => void;
  onClick?: () => void;
};
function PreviewContent({
  playerRef,
  review,
  relevantPreview,
  isVisible,
  isInitiallyVisible,
  isMobile,
  setProgress,
  onClick,
}: PreviewContentProps) {
  const apiHost = useApiHost();
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

  if (relevantPreview && !isVisible) {
    return <div />;
  } else if (!relevantPreview && isCurrentHour(review.start_time)) {
    return (
      <img
        className="w-full"
        src={`${apiHost}api/preview/${review.camera}/${review.start_time}/thumbnail.jpg`}
      />
    );
  } else if (!relevantPreview && !isCurrentHour(review.start_time)) {
    return (
      <img
        className="w-[160px]"
        src={`${apiHost}api/events/${review.id}/thumbnail.jpg`}
      />
    );
  } else {
    return (
      <VideoPlayer
        options={{
          preload: "auto",
          autoplay: true,
          controls: false,
          muted: true,
          fluid: true,
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

          if (!isInitiallyVisible) {
            player.pause(); // autoplay + pause is required for iOS
          }

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
