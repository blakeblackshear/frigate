import { FrigateConfig } from "@/types/frigateConfig";
import VideoPlayer from "./VideoPlayer";
import useSWR from "swr";
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useApiHost } from "@/api";
import Player from "video.js/dist/types/player";
import { AspectRatio } from "../ui/aspect-ratio";
import { LuPlayCircle } from "react-icons/lu";

type PreviewPlayerProps = {
  camera: string;
  relevantPreview?: Preview;
  startTs: number;
  eventId: string;
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
  camera,
  relevantPreview,
  startTs,
  eventId,
  isMobile,
  onClick,
}: PreviewPlayerProps) {
  const { data: config } = useSWR("config");
  const playerRef = useRef<Player | null>(null);
  const isSafari = useMemo(() => {
    return /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
  }, []);

  const [visible, setVisible] = useState(false);
  const [isInitiallyVisible, setIsInitiallyVisible] = useState(false);

  const onPlayback = useCallback(
    (isHovered: Boolean) => {
      if (!relevantPreview) {
        return;
      }

      if (!playerRef.current) {
        setIsInitiallyVisible(true);
        return;
      }

      if (isHovered) {
        playerRef.current.play();
      } else {
        playerRef.current.pause();
        playerRef.current.currentTime(startTs - relevantPreview.start);
      }
    },
    [relevantPreview, startTs, playerRef]
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
    <AspectRatio
      ref={relevantPreview ? inViewRef : null}
      ratio={16 / 9}
      className="bg-black flex justify-center items-center"
      onMouseEnter={() => onPlayback(true)}
      onMouseLeave={() => onPlayback(false)}
    >
      <PreviewContent
        playerRef={playerRef}
        relevantPreview={relevantPreview}
        isVisible={visible}
        isInitiallyVisible={isInitiallyVisible}
        startTs={startTs}
        camera={camera}
        config={config}
        eventId={eventId}
        isMobile={isMobile}
        isSafari={isSafari}
        onClick={onClick}
      />
    </AspectRatio>
  );
}

type PreviewContentProps = {
  playerRef: React.MutableRefObject<Player | null>;
  config: FrigateConfig;
  camera: string;
  relevantPreview: Preview | undefined;
  eventId: string;
  isVisible: boolean;
  isInitiallyVisible: boolean;
  startTs: number;
  isMobile: boolean;
  isSafari: boolean;
  onClick?: () => void;
};
function PreviewContent({
  playerRef,
  config,
  camera,
  relevantPreview,
  eventId,
  isVisible,
  isInitiallyVisible,
  startTs,
  isMobile,
  isSafari,
  onClick,
}: PreviewContentProps) {
  const apiHost = useApiHost();

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

      // consider tap less than 300 ms
      if (touchEnd - touchStart < 300) {
        onClick();
      }
    });
  }, [playerRef, touchStart]);

  if (relevantPreview && !isVisible) {
    return <div />;
  } else if (!relevantPreview) {
    if (isCurrentHour(startTs)) {
      return (
        <img
          className={`${getPreviewWidth(camera, config)}`}
          src={`${apiHost}api/preview/${camera}/${startTs}/thumbnail.jpg`}
        />
      );
    } else {
      return (
        <img
          className="w-[160px]"
          src={`${apiHost}api/events/${eventId}/thumbnail.jpg`}
        />
      );
    }
  } else {
    return (
      <>
        <div className="w-full">
          <VideoPlayer
            options={{
              preload: "auto",
              aspectRatio: "16:9",
              autoplay: true,
              controls: false,
              muted: true,
              loadingSpinner: false,
              sources: [
                {
                  src: `${relevantPreview.src}`,
                  type: "video/mp4",
                },
              ],
            }}
            seekOptions={{}}
            onReady={(player) => {
              playerRef.current = player;

              if (!isInitiallyVisible) {
                player.pause(); // autoplay + pause is required for iOS
              }

              player.playbackRate(isSafari ? 2 : 8);
              player.currentTime(startTs - relevantPreview.start);
              if (isMobile && onClick) {
                player.on("touchstart", handleTouchStart);
              }
            }}
            onDispose={() => {
              playerRef.current = null;
            }}
          />
        </div>
        <LuPlayCircle className="absolute z-10 left-1 bottom-1 w-4 h-4 text-white text-opacity-60" />
      </>
    );
  }
}

function isCurrentHour(timestamp: number) {
  const now = new Date();
  now.setMinutes(0, 0, 0);
  return timestamp > now.getTime() / 1000;
}

function getPreviewWidth(camera: string, config: FrigateConfig) {
  const detect = config.cameras[camera].detect;

  if (detect.width / detect.height < 1) {
    return "w-1/2";
  }

  if (detect.width / detect.height < 16 / 9) {
    return "w-2/3";
  }

  return "w-full";
}
