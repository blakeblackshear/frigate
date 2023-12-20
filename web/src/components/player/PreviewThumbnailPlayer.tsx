import { FrigateConfig } from "@/types/frigateConfig";
import VideoPlayer from "./VideoPlayer";
import useSWR from "swr";
import { useCallback, useMemo, useRef, useState } from "react";
import { useApiHost } from "@/api";
import Player from "video.js/dist/types/player";
import { AspectRatio } from "../ui/aspect-ratio";
import { LuPlayCircle } from "react-icons/lu";

type PreviewPlayerProps = {
  camera: string;
  relevantPreview?: Preview;
  startTs: number;
  eventId: string;
  shouldAutoPlay: boolean;
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
  shouldAutoPlay,
}: PreviewPlayerProps) {
  const { data: config } = useSWR("config");
  const playerRef = useRef<Player | null>(null);
  const apiHost = useApiHost();
  const isSafari = useMemo(() => {
    return /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
  }, []);

  const [visible, setVisible] = useState(false);

  const onPlayback = useCallback(
    (isHovered: Boolean) => {
      if (!relevantPreview || !playerRef.current) {
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

      if (shouldAutoPlay && !autoPlayObserver.current) {
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
              // iOS has bug where poster is empty frame until video starts playing so playback needs to begin earlier
              rootMargin: isSafari ? "10% 0px 25% 0px" : "0px",
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

  let content;

  if (relevantPreview && !visible) {
    content = <div />;
  } else if (!relevantPreview) {
    if (isCurrentHour(startTs)) {
      content = (
        <img
          className={`${getPreviewWidth(camera, config)}`}
          src={`${apiHost}api/preview/${camera}/${startTs}/thumbnail.jpg`}
        />
      );
    } else {
      content = (
        <img
          className="w-[160px]"
          src={`${apiHost}api/events/${eventId}/thumbnail.jpg`}
        />
      );
    }
  } else {
    content = (
      <>
        <div className={`${getPreviewWidth(camera, config)}`}>
          <VideoPlayer
            options={{
              preload: "auto",
              autoplay: false,
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
              player.playbackRate(isSafari ? 2 : 8);
              player.currentTime(startTs - relevantPreview.start);
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

  return (
    <AspectRatio
      ref={relevantPreview ? inViewRef : null}
      ratio={16 / 9}
      className="bg-black flex justify-center items-center"
      onMouseEnter={() => onPlayback(true)}
      onMouseLeave={() => onPlayback(false)}
    >
      {content}
    </AspectRatio>
  );
}

function isCurrentHour(timestamp: number) {
  const now = new Date();
  now.setMinutes(0, 0, 0);
  return timestamp > now.getTime() / 1000;
}

function getPreviewWidth(camera: string, config: FrigateConfig) {
  const detect = config.cameras[camera].detect;

  if (detect.width / detect.height < 1.0) {
    return "w-[120px]";
  }

  if (detect.width / detect.height < 1.4) {
    return "w-[208px]";
  }

  return "w-full";
}
