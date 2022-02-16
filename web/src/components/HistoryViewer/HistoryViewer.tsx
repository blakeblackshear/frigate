import { Fragment, h } from 'preact';
import { useEffect, useState } from 'preact/hooks';
import { useEvents } from '../../api';
import { useSearchString } from '../../hooks/useSearchString';
import { HistoryHeader } from './HistoryHeader';
import Timeline from '../Timeline/Timeline';
import { HistoryVideo } from './HistoryVideo';
import { TimelineEvent } from '../Timeline/TimelineEvent';
import { TimelineChangeEvent } from '../Timeline/TimelineChangeEvent';
import { getNowYesterdayInLong } from '../../utils/dateUtil';

export default function HistoryViewer({ camera }) {
  const { searchString } = useSearchString(500, `camera=${camera}&after=${getNowYesterdayInLong()}`);
  const { data: events } = useEvents(searchString);

  const [timelineEvents, setTimelineEvents] = useState<TimelineEvent[]>(undefined);
  const [currentEvent, setCurrentEvent] = useState<TimelineEvent>(undefined);
  const [isPlaying, setIsPlaying] = useState(undefined);
  const [currentTime, setCurrentTime] = useState<number>(undefined);

  useEffect(() => {
    if (events) {
      const filteredEvents = [...events].reverse().filter((e) => e.end_time !== undefined);
      setTimelineEvents(filteredEvents);
    }
  }, [events]);

  const onTimeUpdateHandler = ({ timestamp, isPlaying }) => {};

  const handleTimelineChange = (event: TimelineChangeEvent) => {
    if (event.seekComplete) {
      setCurrentEvent(event.timelineEvent);

      if (isPlaying && event.timelineEvent) {
        const eventTime = (event.markerTime.getTime() - event.timelineEvent.startTime.getTime()) / 1000;
        setCurrentTime(eventTime);
      }
    }
  };

  const handlePlay = () => {
    setIsPlaying((previous) => !previous);
  };

  const onPlayHandler = () => {
    setIsPlaying(true);
  };

  const onPausedHandler = () => {
    setIsPlaying(false);
  };

  const handlePrevious = () => {};

  const handleNext = () => {};

  return (
    <Fragment>
      <Fragment>
        <div className='relative flex flex-col'>
          <Fragment>
            <HistoryHeader event={currentEvent} className='mb-2' />
            <HistoryVideo
              id={currentEvent ? currentEvent.id : undefined}
              isPlaying={isPlaying}
              currentTime={currentTime}
              onTimeUpdate={onTimeUpdateHandler}
              onPlay={onPlayHandler}
              onPause={onPausedHandler}
            />
          </Fragment>
        </div>
      </Fragment>

      <Timeline events={timelineEvents} onChange={handleTimelineChange} />
    </Fragment>
  );
}
