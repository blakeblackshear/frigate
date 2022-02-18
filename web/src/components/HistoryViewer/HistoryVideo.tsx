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
  height: number;
}

interface HistoryVideoProps {
  id: string;
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
  const videoRef = useRef<HTMLVideoElement>();
  const [videoHeight, setVideoHeight] = useState<number>(undefined);
  const [videoProperties, setVideoProperties] = useState<VideoProperties>(undefined);

  const initializeVideoContainerHeight = useCallback(() => {
    const video = videoRef.current;
    const videoExists = !isNullOrUndefined(video);
    if (videoExists) {
      const videoHeight = video.offsetHeight;
      const videoHasHeight = videoHeight > 0;
      if (videoHasHeight) {
        setVideoHeight(videoHeight);
      }
    }
  }, [videoRef]);

  useEffect(() => {
    initializeVideoContainerHeight();
  }, [initializeVideoContainerHeight]);

  useEffect(() => {
    const idExists = !isNullOrUndefined(id);
    if (idExists) {
      if (videoRef.current && !videoRef.current.paused) {
        videoRef.current = undefined;
      }

      setVideoProperties({
        posterUrl: `${apiHost}/api/events/${id}/snapshot.jpg`,
        videoUrl: `${apiHost}/vod/event/${id}/index.m3u8`,
        height: videoHeight,
      });
    } else {
      setVideoProperties(undefined);
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
    if (videoExists) {
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
    if (videoExists && hasSeeked) {
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

  const videoPropertiesIsUndefined = isNullOrUndefined(videoProperties);
  if (videoPropertiesIsUndefined) {
    return <div style={{ height: `${videoHeight}px`, width: '100%' }} />;
  }

  const { posterUrl, videoUrl, height } = videoProperties;
  return (
    <video
      ref={videoRef}
      key={posterUrl}
      onTimeUpdate={onTimeUpdateHandler}
      onPause={onPause}
      onPlay={onPlay}
      poster={posterUrl}
      preload='metadata'
      controls
      style={height ? { minHeight: `${height}px` } : {}}
      playsInline
    >
      <source type='application/vnd.apple.mpegurl' src={videoUrl} />
    </video>
  );
};
