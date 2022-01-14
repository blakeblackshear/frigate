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
  console.log('history', { camera });
  const apiHost = useApiHost();
  const videoRef = useRef();
  const { searchString } = useSearchString(200, `camera=${camera}&after=${getLast24Hours()}`);
  const { data: events } = useEvents(searchString);
  const [timelineEvents, setTimelineEvents] = useState();

  const [currentEvent, setCurrentEvent] = useState();
  const [currentEventIndex, setCurrentEventIndex] = useState();
  const [timelineOffset, setTimelineOffset] = useState(0);
  const [minHeight, setMinHeight] = useState();

  useEffect(() => {
    if (events) {
      setTimelineEvents([...events].reverse().filter((e) => e.end_time !== undefined));
    }
  }, [events]);

  const handleTimeUpdate = () => {
    const timestamp = Math.round(videoRef.current.currentTime);
    const offset = Math.round(timestamp);
    const triggerStateChange = offset !== timelineOffset;
    if (triggerStateChange) {
      setTimelineOffset(offset);
    }
  };

  const handleTimelineChange = (event) => {
    if (event !== undefined) {
      setCurrentEvent(event);
    }
  };

  const handlePlay = function () {
    videoRef.current.play();
  };

  const handlePaused = () => {
    setTimelineOffset(undefined);
  };

  const handlePrevious = function () {
    setCurrentEventIndex(currentEvent.index - 1);
  };

  const handleNext = function () {
    setCurrentEventIndex(currentEvent.index + 1);
  };

  const handleMetadataLoad = () => {
    if (videoRef.current) {
      setMinHeight(videoRef.current.clientHeight);
    }
  };

  const RenderVideo = useCallback(() => {
    return (
      <video
        ref={videoRef}
        onTimeUpdate={handleTimeUpdate}
        onPause={handlePaused}
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
        controls
      >
        <source
          src={`${apiHost}/api/${camera}/start/${currentEvent.start_time}/end/${currentEvent.end_time}/clip.mp4`}
        />
      </video>
    );
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
