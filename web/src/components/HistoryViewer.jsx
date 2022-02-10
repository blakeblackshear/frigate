import { Fragment, h } from 'preact';
import { useCallback, useEffect, useMemo, useRef, useState } from 'preact/hooks';
import { useApiHost, useEvents } from '../api';
import { useSearchString } from '../hooks/useSearchString';
import { Next } from '../icons/Next';
import { Play } from '../icons/Play';
import { Previous } from '../icons/Previous';
import { HistoryHeader } from '../routes/HistoryHeader';
import { longToDate } from '../utils/dateUtil';
import Timeline from './Timeline';

const getLast24Hours = () => {
  return new Number(new Date(new Date().getTime() - 24 * 60 * 60 * 1000)) / 1000;
};

export default function HistoryViewer({ camera }) {
  const apiHost = useApiHost();
  const videoRef = useRef();
  const { searchString } = useSearchString(500, `camera=${camera}&after=${getLast24Hours()}`);
  const { data: events } = useEvents(searchString);
  const [timelineEvents, setTimelineEvents] = useState();

  const [hasPlayed, setHasPlayed] = useState();
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentEvent, setCurrentEvent] = useState();
  const [currentEventIndex, setCurrentEventIndex] = useState();
  const [timelineOffset, setTimelineOffset] = useState(0);
  const [minHeight, setMinHeight] = useState();

  useEffect(() => {
    if (events) {
      const filteredEvents = [...events].reverse().filter((e) => e.end_time !== undefined);
      setTimelineEvents(filteredEvents);
      setCurrentEventIndex(filteredEvents.length - 1);
    }
  }, [events]);

  const handleTimeUpdate = () => {
    const videoContainer = videoRef.current;
    if (videoContainer.paused) {
      return;
    }

    const timestamp = Math.round(videoRef.current.currentTime);
    const offset = Math.round(timestamp);
    const triggerStateChange = offset !== timelineOffset;
    if (triggerStateChange) {
      setTimelineOffset(offset);
    }
  };

  const handleTimelineChange = (timelineChangedEvent) => {
    if (timelineChangedEvent.seekComplete) {
      const currentEventExists = currentEvent !== undefined;
      if (!currentEventExists || currentEvent.id !== timelineChangedEvent.event.id) {
        setCurrentEvent(timelineChangedEvent.event);
      }
    }

    const videoContainer = videoRef.current;
    if (videoContainer) {
      if (!videoContainer.paused) {
        videoContainer.pause();
        setHasPlayed(true);
      }

      const videoHasPermissionToPlay = hasPlayed !== undefined;
      if (videoHasPermissionToPlay && timelineChangedEvent.seekComplete) {
        const markerTime = Math.abs(timelineChangedEvent.time - timelineChangedEvent.event.startTime) / 1000;
        videoContainer.currentTime = markerTime;
        if (hasPlayed) {
          videoContainer.play();
          setHasPlayed(false);
        }
      }
    }
  };

  const handlePlay = function () {
    const videoContainer = videoRef.current;
    if (videoContainer) {
      if (videoContainer.paused) {
        videoContainer.play();
      } else {
        videoContainer.pause();
      }
    }
  };

  const handlePlayed = () => {
    setIsPlaying(true);
  };

  const handlePaused = () => {
    setIsPlaying(false);
  };

  const handlePrevious = function () {
    setCurrentEventIndex(currentEvent.index - 1);
  };

  const handleNext = function () {
    setCurrentEventIndex(currentEvent.index + 1);
  };

  const handleMetadataLoad = () => {
    const videoContainer = videoRef.current;
    if (videoContainer) {
      setMinHeight(videoContainer.clientHeight);
    }
  };

  const RenderVideo = useCallback(() => {
    if (currentEvent) {
      return (
        <video
          ref={videoRef}
          onTimeUpdate={handleTimeUpdate}
          onPause={handlePaused}
          onPlay={handlePlayed}
          poster={`${apiHost}/api/events/${currentEvent.id}/snapshot.jpg`}
          onLoadedMetadata={handleMetadataLoad}
          preload='metadata'
          style={
            minHeight
              ? {
                  minHeight: `${minHeight}px`,
                }
              : {}
          }
          playsInline
        >
          <source type='application/vnd.apple.mpegurl' src={`${apiHost}/vod/event/${currentEvent.id}/index.m3u8`} />
        </video>
      );
    }
  }, [currentEvent, apiHost, camera, videoRef]);

  return (
    <Fragment>
      {currentEvent && (
        <Fragment>
          <div className='relative flex flex-col'>
            <HistoryHeader
              camera={camera}
              date={longToDate(currentEvent.start_time)}
              objectLabel={currentEvent.label}
              className='mb-2'
            />
            <RenderVideo />
          </div>
        </Fragment>
      )}

      <Timeline
        events={timelineEvents}
        offset={timelineOffset}
        currentIndex={currentEventIndex}
        disabled={isPlaying}
        onChange={handleTimelineChange}
      />

      <div className='flex self-center'>
        <button onClick={handlePrevious}>
          <Previous />
        </button>
        <button onClick={handlePlay}>
          <Play />
        </button>
        <button onClick={handleNext}>
          <Next />
        </button>
      </div>
    </Fragment>
  );
}
