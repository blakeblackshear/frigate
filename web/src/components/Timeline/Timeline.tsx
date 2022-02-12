import { h } from 'preact';
import { useCallback, useEffect, useRef, useState } from 'preact/hooks';
import { longToDate } from '../../utils/dateUtil';
import { TimelineBlocks } from './TimelineBlocks';

export interface TimelineEvent {
  start_time: number;
  end_time: number;
  startTime: Date;
  endTime: Date;
  id: string;
  label: 'car' | 'person' | 'dog';
}

export interface TimelineEventBlock extends TimelineEvent {
  index: number;
  yOffset: number;
  width: number;
  positionX: number;
  seconds: number;
}

interface TimelineProps {
  events: TimelineEvent[];
  offset: number;
  disableMarkerEvents?: boolean;
  onChange: (timelineChangedEvent: any) => void;
}

export default function Timeline({ events, offset, disableMarkerEvents, onChange }: TimelineProps) {
  const timelineContainerRef = useRef<HTMLDivElement>(undefined);

  const [timeline, setTimeline] = useState<TimelineEventBlock[]>([]);
  const [timelineOffset, setTimelineOffset] = useState<number | undefined>(undefined);
  const [markerTime, setMarkerTime] = useState<Date | undefined>(undefined);
  const [currentEvent, setCurrentEvent] = useState<TimelineEventBlock | undefined>(undefined);
  const [scrollTimeout, setScrollTimeout] = useState<NodeJS.Timeout | undefined>(undefined);
  const [isScrollAllowed, setScrollAllowed] = useState(!disableMarkerEvents);

  useEffect(() => {
    setScrollAllowed(!disableMarkerEvents);
  }, [disableMarkerEvents]);

  useEffect(() => {
    if (offset > 0) {
      scrollToPositionInCurrentEvent(offset);
    }
  }, [offset]);

  const checkEventForOverlap = (firstEvent: TimelineEvent, secondEvent: TimelineEvent) => {
    if (secondEvent.startTime < firstEvent.endTime) {
      return true;
    }
    return false;
  };

  const determineOffset = (currentEvent: TimelineEventBlock, previousEvents: TimelineEventBlock[]): number => {
    const OFFSET_DISTANCE_IN_PIXELS = 10;
    const previousIndex = previousEvents.length - 1;
    const previousEvent = previousEvents[previousIndex];
    if (previousEvent) {
      const isOverlap = checkEventForOverlap(previousEvent, currentEvent);
      if (isOverlap) {
        return OFFSET_DISTANCE_IN_PIXELS + determineOffset(currentEvent, previousEvents.slice(0, previousIndex));
      }
    }
    return 0;
  };

  const buildTimelineView = (events: TimelineEvent[]): TimelineEventBlock[] => {
    const firstEvent = events[0];
    const firstEventTime = longToDate(firstEvent.start_time);
    return events
      .map((e, index) => {
        const startTime = longToDate(e.start_time);
        const endTime = e.end_time ? longToDate(e.end_time) : new Date();
        const seconds = Math.round(Math.abs(endTime.getTime() - startTime.getTime()) / 1000);
        const positionX = Math.round(Math.abs(startTime.getTime() - firstEventTime.getTime()) / 1000 + timelineOffset);
        return {
          ...e,
          startTime,
          endTime,
          width: seconds,
          positionX,
          index,
        } as TimelineEventBlock;
      })
      .reduce((eventBlocks, current) => {
        const offset = determineOffset(current, eventBlocks);
        current.yOffset = offset;
        return [...eventBlocks, current];
      }, [] as TimelineEventBlock[]);
  };

  useEffect(() => {
    if (events && events.length > 0 && timelineOffset) {
      const timelineEvents = buildTimelineView(events);
      const lastEventIndex = timelineEvents.length - 1;

      setTimeline(timelineEvents);
      setMarkerTime(timelineEvents[lastEventIndex].startTime);
      setCurrentEvent(timelineEvents[lastEventIndex]);
    }
  }, [events, timelineOffset]);

  useEffect(() => {
    const timelineIsLoaded = timeline.length > 0;
    if (timelineIsLoaded) {
      const lastEvent = timeline[timeline.length - 1];
      scrollToEvent(lastEvent);
    }
  }, [timeline]);

  useEffect(() => {
    if (currentEvent) {
      handleChange(true);
    }
  }, [currentEvent]);

  const disableScrollEvent = (milliseconds) => {
    setScrollAllowed(false);
    let timeout: NodeJS.Timeout = undefined;
    timeout = setTimeout(() => {
      setScrollAllowed(true);
      clearTimeout(timeout);
    }, milliseconds);
  };

  const scrollToPosition = (positionX: number) => {
    if (timelineContainerRef.current) {
      disableScrollEvent(150);
      timelineContainerRef.current.scroll({
        left: positionX,
        behavior: 'smooth',
      });
    }
  };

  const scrollToPositionInCurrentEvent = (offset: number) => {
    scrollToPosition(currentEvent.positionX + offset - timelineOffset);
    setMarkerTime(getCurrentMarkerTime());
  };

  const scrollToEvent = (event, offset = 0) => {
    scrollToPosition(event.positionX + offset - timelineOffset);
  };

  const checkMarkerForEvent = (markerTime) => {
    return [...timeline]
      .reverse()
      .find((timelineEvent) => timelineEvent.startTime <= markerTime && timelineEvent.endTime >= markerTime);
  };

  const getCurrentMarkerTime = () => {
    if (timelineContainerRef.current && timeline.length > 0) {
      const scrollPosition = timelineContainerRef.current.scrollLeft;
      const firstTimelineEvent = timeline[0] as TimelineEventBlock;
      const firstTimelineEventStartTime = firstTimelineEvent.startTime.getTime();
      return new Date(firstTimelineEventStartTime + scrollPosition * 1000);
    }
  };

  const onTimelineScrollHandler = () => {
    if (isScrollAllowed) {
      if (timelineContainerRef.current && timeline.length > 0) {
        clearTimeout(scrollTimeout);
        const currentMarkerTime = getCurrentMarkerTime();
        setMarkerTime(currentMarkerTime);
        handleChange(false);

        setScrollTimeout(
          setTimeout(() => {
            const overlappingEvent = checkMarkerForEvent(currentMarkerTime);
            setCurrentEvent(overlappingEvent);
          }, 150)
        );
      }
    }
  };

  useEffect(() => {
    if (timelineContainerRef) {
      const timelineContainerWidth = timelineContainerRef.current.offsetWidth;
      const offset = Math.round(timelineContainerWidth / 2);
      setTimelineOffset(offset);
    }
  }, [timelineContainerRef]);

  const handleChange = useCallback(
    (seekComplete: boolean) => {
      if (onChange) {
        onChange({
          event: currentEvent,
          markerTime,
          seekComplete,
        });
      }
    },
    [onChange, currentEvent, markerTime]
  );

  const handleViewEvent = (event: TimelineEventBlock) => {
    setCurrentEvent(event);
    setMarkerTime(getCurrentMarkerTime());
    scrollToEvent(event);
  };

  return (
    <div className='flex-grow-1'>
      <div className='w-full text-center'>
        <span className='text-black dark:text-white'>
          {markerTime && <span>{markerTime.toLocaleTimeString()}</span>}
        </span>
      </div>
      <div className='relative'>
        <div className='absolute left-0 top-0 h-full w-full text-center'>
          <div className='h-full text-center' style={{ margin: '0 auto' }}>
            <div
              className='z-20 h-full absolute'
              style={{
                left: 'calc(100% / 2)',
                borderRight: '2px solid rgba(252, 211, 77)',
              }}
            ></div>
          </div>
        </div>
        <div ref={timelineContainerRef} onScroll={onTimelineScrollHandler} className='overflow-x-auto hide-scroll'>
          {timeline.length > 0 && (
            <TimelineBlocks timeline={timeline} firstBlockOffset={timelineOffset} onEventClick={handleViewEvent} />
          )}
        </div>
      </div>
    </div>
  );
}
