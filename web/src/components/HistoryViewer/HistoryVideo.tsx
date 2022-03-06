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
  const videoRef = useRef<HTMLVideoElement|null>(null);
  const [videoHeight, setVideoHeight] = useState<number>(0);
  const [videoProperties, setVideoProperties] = useState<VideoProperties>({
    posterUrl: '',
    videoUrl: '',
    height: 0,
  });

  const currentVideo = videoRef.current;
  if (currentVideo && !videoHeight) {
    const currentVideoHeight = currentVideo.offsetHeight;
    if (currentVideoHeight > 0) {
      setVideoHeight(currentVideoHeight);
    }
  }

  useEffect(() => {
    const idExists = !isNullOrUndefined(id);
    if (idExists) {
      if (videoRef.current && !videoRef.current.paused) {
        videoRef.current = null;
      }

      setVideoProperties({
        posterUrl: `${apiHost}/api/events/${id}/snapshot.jpg`,
        videoUrl: `${apiHost}/vod/event/${id}/index.m3u8`,
        height: videoHeight,
      });
    } else {
      setVideoProperties({
        posterUrl: '',
        videoUrl: '',
        height: 0,
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
