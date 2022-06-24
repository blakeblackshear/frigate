import { h } from 'preact';
import { useCallback, useEffect, useRef, useState } from 'preact/hooks';
import { useApiHost } from '../../api';
import { isNullOrUndefined } from '../../utils/objectUtils';

import 'videojs-seek-buttons';
import 'video.js/dist/video-js.css';
import 'videojs-seek-buttons/dist/videojs-seek-buttons.css';

import videojs from 'video.js';

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
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    let video: any;
    if (videoRef.current && id) {
      video = videojs(videoRef.current, {});
    }
  }, [videoRef]);

  useEffect(() => {
    if (!id) {
      return;
    }
    const video = videojs(videoRef.current);
    video.src({
      src: `${apiHost}/vod/event/${id}/index.m3u8`,
      type: 'application/vnd.apple.mpegurl',
    });
    video.poster(`${apiHost}/api/events/${id}/snapshot.jpg`);
    if (videoIsPlaying) {
      video.play();
    }
  }, [id]);

  useEffect(() => {
    if (!videoRef) {
      return;
    }

    const video = videojs(videoRef.current);
    if (video.paused() && videoIsPlaying) {
      video.play();
    } else if (!video.paused() && !videoIsPlaying) {
      video.pause();
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

  return (
    <div data-vjs-player>
      <video
        ref={videoRef}
        onTimeUpdate={onTimeUpdateHandler}
        onPause={onPause}
        onPlay={onPlay}
        className="video-js vjs-fluid"
        data-setup="{}"
      />
    </div>
  );
};
