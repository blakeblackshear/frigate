import { Fragment, h } from 'preact';
import { useCallback, useEffect, useRef, useState } from 'preact/hooks';
import { longToDate } from '../../utils/dateUtil';
import { TimelineBlocks } from './TimelineBlocks';
import { TimelineChangeEvent } from './TimelineChangeEvent';
import { DisabledControls, TimelineControls } from './TimelineControls';
import { TimelineEvent } from './TimelineEvent';
import { TimelineEventBlock } from './TimelineEventBlock';

interface TimelineProps {
  events: TimelineEvent[];
  onChange: (event: TimelineChangeEvent) => void;
}

export default function Timeline({ events, onChange }: TimelineProps) {
  const timelineContainerRef = useRef<HTMLDivElement>(undefined);

  const [timeline, setTimeline] = useState<TimelineEventBlock[]>([]);
  const [disabledControls, setDisabledControls] = useState<DisabledControls>({
    playPause: false,
    next: true,
    previous: false,
  });
  const [timelineOffset, setTimelineOffset] = useState<number | undefined>(undefined);
  const [markerTime, setMarkerTime] = useState<Date | undefined>(undefined);
  const [currentEvent, setCurrentEvent] = useState<TimelineEventBlock | undefined>(undefined);
  const [scrollTimeout, setScrollTimeout] = useState<any | undefined>(undefined);
  const [scrollPermission, setScrollPermission] = useState<ScrollPermission>({
    allowed: true,
    resetAfterSeeked: false,
  });

  useEffect(() => {
    if (timeline.length > 0 && currentEvent) {
      const currentIndex = currentEvent.index;
      if (currentIndex === 0) {
        setDisabledControls((previous) => ({
          ...previous,
          next: false,
          previous: true,
        }));
      } else if (currentIndex === timeline.length - 1) {
        setDisabledControls((previous) => ({
          ...previous,
          previous: false,
          next: true,
        }));
      } else {
        setDisabledControls((previous) => ({
          ...previous,
          previous: false,
          next: false,
        }));
      }
    }
  }, [timeline, currentEvent]);

  const checkEventForOverlap = (firstEvent: TimelineEvent, secondEvent: TimelineEvent) => {
    if (secondEvent.startTime < firstEvent.endTime && secondEvent.startTime > firstEvent.startTime) {
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
      .reduce((rowMap, current) => {
        for (let i = 0; i < rowMap.length; i++) {
          const row = rowMap[i] ?? [];
          const lastItem = row[row.length - 1];
          if (lastItem) {
            const isOverlap = checkEventForOverlap(lastItem, current);
            if (isOverlap) {
              continue;
            }
          }
          rowMap[i] = [...row, current];
          return rowMap;
        }
        rowMap.push([current]);
        return rowMap;
      }, [] as TimelineEventBlock[][])
      .flatMap((rows, rowPosition) => {
        rows.forEach((eventBlock) => {
          const OFFSET_DISTANCE_IN_PIXELS = 10;
          eventBlock.yOffset = OFFSET_DISTANCE_IN_PIXELS * rowPosition;
        });
        return rows;
      })
      .sort((a, b) => a.startTime.getTime() - b.startTime.getTime());
  };

  useEffect(() => {
    if (events && events.length > 0 && timelineOffset) {
      const timelineEvents = buildTimelineView(events);
      const lastEventIndex = timelineEvents.length - 1;
      const recentEvent = timelineEvents[lastEventIndex];

      setTimeline(timelineEvents);
      setMarkerTime(recentEvent.startTime);
      setCurrentEvent(recentEvent);
      onChange({
        timelineEvent: recentEvent,
        markerTime: recentEvent.startTime,
        seekComplete: true,
      });
    }
  }, [events, timelineOffset]);

  useEffect(() => {
    const timelineIsLoaded = timeline.length > 0;
    if (timelineIsLoaded) {
      const lastEvent = timeline[timeline.length - 1];
      scrollToEvent(lastEvent);
    }
  }, [timeline]);

  const checkMarkerForEvent = (markerTime: Date) => {
    markerTime.setMilliseconds(999); // adjust milliseconds to account for drift
    return [...timeline]
      .reverse()
      .find(
        (timelineEvent) =>
          timelineEvent.startTime.getTime() <= markerTime.getTime() &&
          timelineEvent.endTime.getTime() >= markerTime.getTime()
      );
  };

  const seekCompleteHandler = (markerTime: Date) => {
    if (scrollPermission.allowed) {
      const markerEvent = checkMarkerForEvent(markerTime);
      setCurrentEvent(markerEvent);

      onChange({
        markerTime,
        timelineEvent: markerEvent,
        seekComplete: true,
      });
    }

    if (scrollPermission.resetAfterSeeked) {
      setScrollPermission({
        allowed: true,
        resetAfterSeeked: false,
      });
    }
  };

  const waitForSeekComplete = (markerTime: Date) => {
    clearTimeout(scrollTimeout);
    setScrollTimeout(setTimeout(() => seekCompleteHandler(markerTime), 150));
  };

  const onTimelineScrollHandler = () => {
    if (timelineContainerRef.current && timeline.length > 0) {
      const currentMarkerTime = getCurrentMarkerTime();
      setMarkerTime(currentMarkerTime);
      waitForSeekComplete(currentMarkerTime);
      onChange({
        timelineEvent: currentEvent,
        markerTime: currentMarkerTime,
        seekComplete: false,
      });
    }
  };

  const scrollToPosition = (positionX: number) => {
    if (timelineContainerRef.current) {
      const permission: ScrollPermission = {
        allowed: true,
        resetAfterSeeked: true,
      };
      setScrollPermission(permission);
      timelineContainerRef.current.scroll({
        left: positionX,
        behavior: 'smooth',
      });
    }
  };

  const scrollToEvent = (event, offset = 0) => {
    scrollToPosition(event.positionX + offset - timelineOffset);
  };

  const getCurrentMarkerTime = () => {
    if (timelineContainerRef.current && timeline.length > 0) {
      const scrollPosition = timelineContainerRef.current.scrollLeft;
      const firstTimelineEvent = timeline[0] as TimelineEventBlock;
      const firstTimelineEventStartTime = firstTimelineEvent.startTime.getTime();
      return new Date(firstTimelineEventStartTime + scrollPosition * 1000);
    }
  };

  useEffect(() => {
    if (timelineContainerRef) {
      const timelineContainerWidth = timelineContainerRef.current.offsetWidth;
      const offset = Math.round(timelineContainerWidth / 2);
      setTimelineOffset(offset);
    }
  }, [timelineContainerRef]);

  const handleViewEvent = (event: TimelineEventBlock) => {
    scrollToEvent(event);
    setMarkerTime(getCurrentMarkerTime());
  };

  const onPlayPauseHandler = () => {};
  const onPreviousHandler = () => {
    if (currentEvent) {
      const previousEvent = timeline[currentEvent.index - 1];
      setCurrentEvent(previousEvent);
      scrollToEvent(previousEvent);
    }
  };
  const onNextHandler = () => {
    if (currentEvent) {
      const nextEvent = timeline[currentEvent.index + 1];
      setCurrentEvent(nextEvent);
      scrollToEvent(nextEvent);
    }
  };

  const RenderTimelineBlocks = useCallback(() => {
    if (timelineOffset > 0 && timeline.length > 0) {
      return <TimelineBlocks timeline={timeline} firstBlockOffset={timelineOffset} onEventClick={handleViewEvent} />;
    }
  }, [timeline, timelineOffset]);

  return (
    <Fragment>
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
            <RenderTimelineBlocks />
          </div>
        </div>
      </div>
      <TimelineControls
        disabled={disabledControls}
        onPrevious={onPreviousHandler}
        onPlayPause={onPlayPauseHandler}
        onNext={onNextHandler}
      />
    </Fragment>
  );
}
