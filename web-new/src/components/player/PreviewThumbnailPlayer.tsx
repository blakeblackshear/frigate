import { FrigateConfig } from "@/types/frigateConfig";
import VideoPlayer from "./VideoPlayer";
import useSWR from "swr";
import { useCallback, useMemo, useRef } from "react";
import { useApiHost } from "@/api";
import Player from "video.js/dist/types/player";

type PreviewPlayerProps = {
    camera: string,
    allPreviews: Preview[],
    startTs: number,
}

type Preview = {
    camera: string,
    src: string,
    type: string,
    start: number,
    end: number,
}

export default function PreviewThumbnailPlayer({ camera, allPreviews, startTs }: PreviewPlayerProps) {
    const { data: config } = useSWR('config');
    const playerRef = useRef<Player | null>(null);
    const apiHost = useApiHost();

    const relevantPreview = useMemo(() => {
      return Object.values(allPreviews || []).find(
        (preview) => preview.camera == camera && preview.start < startTs && preview.end > startTs
      );
    }, [allPreviews, camera, startTs]);

    const onHover = useCallback((isHovered: Boolean) => {
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
      return (
        <img className={getThumbWidth(camera, config)} src={`${apiHost}api/preview/${camera}/${startTs}/thumbnail.jpg`} />
      );
    }

    return (
      <div
        className={getThumbWidth(camera, config)}
        onMouseEnter={() => onHover(true)}
        onMouseLeave={() => onHover(false)}
      >
        <VideoPlayer
          options={{
            preload: 'auto',
            autoplay: false,
            controls: false,
            muted: true,
            loadingSpinner: false,
            sources: [
              {
                src: `${relevantPreview.src}`,
                type: 'video/mp4',
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

function getThumbWidth(camera: string, config: FrigateConfig) {
const detect = config.cameras[camera].detect;
if (detect.width / detect.height > 2) {
    return 'w-[320px]';
}

if (detect.width / detect.height < 1.4) {
    return 'w-[200px]';
}

return 'w-[240px]';
}