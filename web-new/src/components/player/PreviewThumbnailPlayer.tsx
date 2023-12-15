import { FrigateConfig } from "@/types/frigateConfig";
import VideoPlayer from "./VideoPlayer";
import useSWR from "swr";
import { useCallback, useRef, useState } from "react";
import { useApiHost } from "@/api";
import Player from "video.js/dist/types/player";
import { AspectRatio } from "../ui/aspect-ratio";

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
    [relevantPreview, startTs]
  );

  const observer = useRef<IntersectionObserver | null>();
  const inViewRef = useCallback(
    (node: HTMLElement | null) => {
      if (observer.current) {
        return;
      }

      try {
        observer.current = new IntersectionObserver(
          (entries) => {
            if (entries[0].isIntersecting) {
              if (entries[0].intersectionRatio == 1.0) {
                if (shouldAutoPlay) {
                  onPlayback(true);
                }
              } else {
                setVisible(true);
              }
            } else {
              if (shouldAutoPlay) {
                onPlayback(false);
              }

              setVisible(false);
            }
          },
          { threshold: [0.0, 1.0], rootMargin: "25% 0% 25% 0%" }
        );
        if (node) observer.current.observe(node);
      } catch (e) {
        // no op
      }
    },
    [observer, onPlayback]
  );

  let content;
  if (!relevantPreview || !visible) {
    if (isCurrentHour(startTs)) {
      content = (
        <img
          className={`${getPreviewWidth(camera, config)}`}
          loading="lazy"
          src={`${apiHost}api/preview/${camera}/${startTs}/thumbnail.jpg`}
        />
      );
    }

    content = (
      <img
        className="w-[160px]"
        loading="lazy"
        src={`${apiHost}api/events/${eventId}/thumbnail.jpg`}
      />
    );
  } else {
    content = (
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
            player.playbackRate(8);
            player.currentTime(startTs - relevantPreview.start);
          }}
          onDispose={() => {
            playerRef.current = null;
          }}
        />
      </div>
    );
  }

  return (
    <AspectRatio
      ref={inViewRef}
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
