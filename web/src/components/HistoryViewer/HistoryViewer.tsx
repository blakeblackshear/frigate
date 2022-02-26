import { Fragment, h } from 'preact';
import { useCallback, useEffect, useState } from 'preact/hooks';
import useSWR from 'swr';
import axios from 'axios';
import Timeline from '../Timeline/Timeline';
import type { TimelineChangeEvent } from '../Timeline/TimelineChangeEvent';
import type { TimelineEvent } from '../Timeline/TimelineEvent';
import { HistoryHeader } from './HistoryHeader';
import { HistoryVideo } from './HistoryVideo';

export default function HistoryViewer({ camera }) {
  const searchParams = {
    before: null,
    after: null,
    camera,
    label: 'all',
    zone: 'all',
  };

  // TODO: refactor
  const eventsFetcher = (path, params) => {
    params = { ...params, include_thumbnails: 0, limit: 500 };
    return axios.get(path, { params }).then((res) => res.data);
  };

  const { data: events } = useSWR(['events', searchParams], eventsFetcher);

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

  const handleTimelineChange = useCallback(
    (event: TimelineChangeEvent) => {
      if (event.seekComplete) {
        setCurrentEvent(event.timelineEvent);

        if (isPlaying && event.timelineEvent) {
          const eventTime = (event.markerTime.getTime() - event.timelineEvent.startTime.getTime()) / 1000;
          setCurrentTime(eventTime);
        }
      }
    },
    [isPlaying]
  );

  const onPlayHandler = () => {
    setIsPlaying(true);
  };

  const onPausedHandler = () => {
    setIsPlaying(false);
  };

  const onPlayPauseHandler = (isPlaying: boolean) => {
    setIsPlaying(isPlaying);
  };

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
              onPlay={onPlayHandler}
              onPause={onPausedHandler}
            />
          </Fragment>
        </div>
      </Fragment>

      <Timeline
        events={timelineEvents}
        isPlaying={isPlaying}
        onChange={handleTimelineChange}
        onPlayPause={onPlayPauseHandler}
      />
    </Fragment>
  );
}
