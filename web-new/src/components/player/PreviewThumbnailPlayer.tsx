import { FrigateConfig } from "@/types/frigateConfig";
import VideoPlayer from "./VideoPlayer";
import useSWR from "swr";
import { useCallback, useRef } from "react";
import { useApiHost } from "@/api";
import Player from "video.js/dist/types/player";
import { AspectRatio } from "../ui/aspect-ratio";

type PreviewPlayerProps = {
  camera: string;
  relevantPreview?: Preview;
  startTs: number;
  eventId: string;
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
}: PreviewPlayerProps) {
  const { data: config } = useSWR("config");
  const playerRef = useRef<Player | null>(null);
  const apiHost = useApiHost();

  const onHover = useCallback(
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

  if (!relevantPreview) {
    if (isCurrentHour(startTs)) {
      return (
        <AspectRatio
          ratio={16 / 9}
          className="bg-black flex justify-center items-center"
        >
          <img
            className={`${getPreviewWidth(camera, config)}`}
            src={`${apiHost}api/preview/${camera}/${startTs}/thumbnail.jpg`}
          />
        </AspectRatio>
      );
    }

    return (
      <AspectRatio
        ratio={16 / 9}
        className="bg-black flex justify-center items-center"
      >
        <img
          className="w-[160px]"
          src={`${apiHost}api/events/${eventId}/thumbnail.jpg`}
        />
      </AspectRatio>
    );
  }

  return (
    <AspectRatio
      ratio={16 / 9}
      className="bg-black flex justify-center items-center"
      onMouseEnter={() => onHover(true)}
      onMouseLeave={() => onHover(false)}
    >
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

  if (detect.width / detect.height < 1.4) {
    return "w-[208px]";
  }

  return "w-full";
}
