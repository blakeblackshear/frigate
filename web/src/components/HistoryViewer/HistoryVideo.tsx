import { h } from 'preact';
import { useCallback, useEffect, useMemo, useRef, useState } from 'preact/hooks';
import { useApiHost } from '../../api';

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
  onTimeUpdate: (event: OnTimeUpdateEvent) => void;
  onPause: () => void;
  onPlay: () => void;
}

const isNullOrUndefined = (object: any): boolean => object === null || object === undefined;

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
  }, [videoRef.current]);

  useEffect(() => {
    initializeVideoContainerHeight();
  }, [initializeVideoContainerHeight]);

  useEffect(() => {
    const idExists = !isNullOrUndefined(id);
    if (idExists) {
      setVideoProperties({
        posterUrl: `${apiHost}/api/events/${id}/snapshot.jpg`,
        videoUrl: `${apiHost}/vod/event/${id}/index.m3u8`,
        height: videoHeight,
      });
    } else {
      setVideoProperties(undefined);
    }
  }, [id, videoHeight]);

  const playVideo = (video: HTMLMediaElement) => {
    const videoHasNotLoaded = video.readyState <= 1;
    if (videoHasNotLoaded) {
      video.load();
    }

    video.play().catch((e) => {
      console.error('Fail', e);
    });
  };

  useEffect(() => {
    const video = videoRef.current;
    const videoExists = !isNullOrUndefined(video);
    if (videoExists) {
      if (videoIsPlaying) {
        playVideo(video);
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
      onTimeUpdate(timeUpdateEvent);
    },
    [videoIsPlaying]
  );

  const Video = useCallback(() => {
    const videoPropertiesIsUndefined = isNullOrUndefined(videoProperties);
    if (videoPropertiesIsUndefined) {
      return <div style={{ height: `${videoHeight}px`, width: '100%' }}></div>;
    }
    const { posterUrl, videoUrl, height } = videoProperties;
    return (
      <video
        ref={videoRef}
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
  }, [videoProperties, videoHeight, videoRef]);

  return <Video />;
};
