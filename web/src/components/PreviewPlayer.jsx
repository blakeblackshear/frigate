import { h } from 'preact';
import useSWR from 'swr';
import ActivityIndicator from './ActivityIndicator';
import VideoPlayer from './VideoPlayer';
import { useCallback } from 'preact/hooks';
import { useMemo } from 'react';
import { useApiHost } from '../api';

export default function PreviewPlayer({ camera, allPreviews, startTs, mode }) {
  const { data: config } = useSWR('config');
  const apiHost = useApiHost();

  const relevantPreview = useMemo(() => {
    return Object.values(allPreviews || []).find(
      (preview) => preview.camera == camera && preview.start < startTs && preview.end > startTs
    );
  }, [allPreviews, camera, startTs]);

  const onHover = useCallback(
    (isHovered) => {
      if (isHovered) {
        this.player.play();
      } else {
        this.player.pause();
        this.player.currentTime(startTs - relevantPreview.start);
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
      className={mode == 'thumbnail' ? getThumbWidth(camera, config) : ''}
      onMouseEnter={() => onHover(true)}
      onMouseLeave={() => onHover(false)}
    >
      <VideoPlayer
        tag={startTs}
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
          this.player = player;
          this.player.playbackRate(8);
          this.player.currentTime(startTs - relevantPreview.start);
        }}
        onDispose={() => {
          this.player = null;
        }}
      />
    </div>
  );
}

function getThumbWidth(camera, config) {
  const detect = config.cameras[camera].detect;
  if (detect.width / detect.height > 2) {
    return 'w-[320px]';
  }

  if (detect.width / detect.height < 1.4) {
    return 'w-[200px]';
  }

  return 'w-[240px]';
}
