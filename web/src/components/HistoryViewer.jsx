import { Fragment, h } from 'preact';
import { useEffect, useRef, useState } from 'preact/hooks';
import { useApiHost, useEvents } from '../api';
import { useSearchString } from '../hooks/useSearchString';
import { Next } from '../icons/Next';
import { Play } from '../icons/Play';
import { Previous } from '../icons/Previous';
import { HistoryHeader } from '../routes/HistoryHeader';
import { longToDate } from '../utils/dateUtil';
import Timeline from './Timeline';

export default function HistoryViewer({ camera }) {
  const apiHost = useApiHost();
  const videoRef = useRef();

  const beginningOfDay = new Date().setHours(0, 0, 0) / 1000;
  const { searchString } = useSearchString(200, `camera=${camera}&after=${beginningOfDay}`);
  const { data: events } = useEvents(searchString);
  const [timelineEvents, setTimelineEvents] = useState();

  const [currentEvent, setCurrentEvent] = useState();
  const [currentEventIndex, setCurrentEventIndex] = useState();
  const [timelineOffset, setTimelineOffset] = useState(0);

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
    console.log({ event });
    if (event !== undefined) {
      setCurrentEvent(event);
      setCurrentEventIndex(event.index);
    }
  };

  const handleVideoTouch = () => {
    setHideBanner(true);
  };

  const handlePlay = function () {
    videoRef.current.play();
  };

  const handlePaused = () => {
    setTimelineOffset(undefined);
  };

  const handlePrevious = function () {
    setCurrentEventIndex((index) => index - 1);
  };

  const handleNext = function () {
    setCurrentEventIndex((index) => index + 1);
  };

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
            <video
              ref={videoRef}
              onTimeUpdate={handleTimeUpdate}
              onPause={handlePaused}
              onClick={handleVideoTouch}
              poster={`${apiHost}/api/events/${currentEvent.id}/snapshot.jpg`}
              preload='none'
              playsInline
              controls
            >
              <source
                src={`${apiHost}/api/${camera}/start/${currentEvent.start_time}/end/${currentEvent.end_time}/clip.mp4`}
              />
            </video>
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
