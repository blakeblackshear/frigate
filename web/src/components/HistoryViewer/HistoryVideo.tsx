import { h } from 'preact';
import { useCallback, useEffect, useRef, useState } from 'preact/hooks';
import { useApiHost } from '../../api';
import { isNullOrUndefined } from '../../utils/objectUtils';

interface OnTimeUpdateEvent {
  timestamp: number;
  isPlaying: boolean;
}

interface VideoProperties {
  posterUrl: string;
  videoUrl: string;
}

interface HistoryVideoProps {
  id?: string;
  isPlaying: boolean;
  currentTime: number;
  onTimeUpdate?: (event: OnTimeUpdateEvent) => void;
  onPause: () => void;
  onPlay: () => void;
}

export const HistoryVideo = ({
  id,
  isPlaying: videoIsPlaying,
  currentTime,
  onTimeUpdate,
  onPause,
  onPlay,
}: HistoryVideoProps) => {
  const apiHost = useApiHost();
  const videoRef = useRef<HTMLVideoElement | null>(null);

  const [posterLoaded, setPosterLoaded] = useState(false);
  const [videoHeight, setVideoHeight] = useState<number | undefined>(undefined);

  const [videoProperties, setVideoProperties] = useState<VideoProperties>({
    posterUrl: '',
    videoUrl: '',
  });

  useEffect(() => {
    if (posterLoaded && videoRef.current) {
      setVideoHeight(videoRef.current?.offsetHeight);
    }
  }, [posterLoaded, videoRef.current]);

  useEffect(() => {
    const idExists = !isNullOrUndefined(id);
    if (idExists) {
      if (videoRef.current && !videoRef.current.paused) {
        videoRef.current = null;
      }

      const posterUrl = `${apiHost}/api/events/${id}/snapshot.jpg`;
      const poster = new Image();
      poster.src = posterUrl;
      poster.onload = () => {
        setPosterLoaded(true);
      };
      setVideoProperties({
        posterUrl,
        videoUrl: `${apiHost}/vod/event/${id}/index.m3u8`,
      });
    } else {
      setVideoProperties({
        posterUrl: '',
        videoUrl: '',
      });
    }
  }, [id, videoHeight, videoRef, apiHost]);

  useEffect(() => {
    const playVideo = (video: HTMLMediaElement) => video.play();

    const attemptPlayVideo = (video: HTMLMediaElement) => {
      const videoHasNotLoaded = video.readyState <= 1;
      if (videoHasNotLoaded) {
        video.oncanplay = () => {
          playVideo(video);
        };
        video.load();
      } else {
        playVideo(video);
      }
    };

    const video = videoRef.current;
    const videoExists = !isNullOrUndefined(video);
    if (video && videoExists) {
      if (videoIsPlaying) {
        attemptPlayVideo(video);
      } else {
        video.pause();
      }
    }
  }, [videoIsPlaying, videoRef]);

  useEffect(() => {
    const video = videoRef.current;
    const videoExists = !isNullOrUndefined(video);
    const hasSeeked = currentTime >= 0;
    if (video && videoExists && hasSeeked) {
      video.currentTime = currentTime;
    }
  }, [currentTime, videoRef]);

  const onTimeUpdateHandler = useCallback(
    (event: Event) => {
      const target = event.target as HTMLMediaElement;
      const timeUpdateEvent = {
        isPlaying: videoIsPlaying,
        timestamp: target.currentTime,
      };

      onTimeUpdate && onTimeUpdate(timeUpdateEvent);
    },
    [videoIsPlaying, onTimeUpdate]
  );

  const { posterUrl, videoUrl } = videoProperties;
  return (
    <video
      ref={videoRef}
      key={posterUrl}
      onTimeUpdate={onTimeUpdateHandler}
      onPause={onPause}
      onPlay={onPlay}
      poster={posterUrl}
      preload="metadata"
      controls
      style={videoHeight ? { minHeight: `${videoHeight}px` } : {}}
      playsInline
    >
      <source type="application/vnd.apple.mpegurl" src={videoUrl} />
    </video>
  );
};
