import { Fragment, h } from 'preact';
import { useCallback, useEffect, useMemo, useRef, useState } from 'preact/hooks';
import { getTimelineEventBlocksFromTimelineEvents } from '../../utils/Timeline/timelineEventUtils';
import type { ScrollPermission } from './ScrollPermission';
import { TimelineBlocks } from './TimelineBlocks';
import type { TimelineChangeEvent } from './TimelineChangeEvent';
import { DisabledControls, TimelineControls } from './TimelineControls';
import type { TimelineEvent } from './TimelineEvent';
import type { TimelineEventBlock } from './TimelineEventBlock';

interface TimelineProps {
  events: TimelineEvent[];
  isPlaying: boolean;
  onChange: (event: TimelineChangeEvent) => void;
  onPlayPause?: (isPlaying: boolean) => void;
}

export default function Timeline({ events, isPlaying, onChange, onPlayPause }: TimelineProps) {
  const timelineContainerRef = useRef<HTMLDivElement>(null);

  const [timeline, setTimeline] = useState<TimelineEventBlock[]>([]);
  const [disabledControls, setDisabledControls] = useState<DisabledControls>({
    playPause: false,
    next: true,
    previous: false,
  });
  const [timelineOffset, setTimelineOffset] = useState<number>(0);
  const [markerTime, setMarkerTime] = useState<Date>(new Date());
  const [currentEvent, setCurrentEvent] = useState<TimelineEventBlock | undefined>(undefined);
  const [scrollTimeout, setScrollTimeout] = useState<NodeJS.Timeout>();
  const [scrollPermission, setScrollPermission] = useState<ScrollPermission>({
    allowed: true,
    resetAfterSeeked: false,
  });

  const scrollToPosition = useCallback(
    (positionX: number) => {
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
    },
    [timelineContainerRef]
  );

  const scrollToEvent = useCallback(
    (event: TimelineEventBlock, offset = 0) => {
      scrollToPosition(event.positionX + offset - timelineOffset);
    },
    [timelineOffset, scrollToPosition]
  );

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

  useEffect(() => {
    if (events && events.length > 0 && timelineOffset) {
      const timelineEvents = getTimelineEventBlocksFromTimelineEvents(events, timelineOffset);
      const lastEventIndex = timelineEvents.length - 1;
      const recentEvent = timelineEvents[lastEventIndex];

      setTimeline(timelineEvents);
      setMarkerTime(recentEvent.startTime);
      setCurrentEvent(recentEvent);
      scrollToEvent(recentEvent);
    }
  }, [events, timelineOffset, scrollToEvent]);

  useEffect(() => {
    const timelineIsLoaded = timeline.length > 0;
    if (timelineIsLoaded) {
      const lastEvent = timeline[timeline.length - 1];
      scrollToEvent(lastEvent);
    }
  }, [timeline, scrollToEvent]);

  const checkMarkerForEvent = (markerTime: Date) => {
    const adjustedMarkerTime = new Date(markerTime);
    adjustedMarkerTime.setSeconds(markerTime.getSeconds() + 1);

    return [...timeline]
      .reverse()
      .find(
        (timelineEvent) =>
          timelineEvent.startTime.getTime() <= adjustedMarkerTime.getTime() &&
          timelineEvent.endTime.getTime() >= adjustedMarkerTime.getTime()
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
    if (scrollTimeout) {
      clearTimeout(scrollTimeout);
    }
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

  const getCurrentMarkerTime = useCallback(() => {
    if (timelineContainerRef.current && timeline.length > 0) {
      const scrollPosition = timelineContainerRef.current.scrollLeft;
      const firstTimelineEvent = timeline[0] as TimelineEventBlock;
      const firstTimelineEventStartTime = firstTimelineEvent.startTime.getTime();
      return new Date(firstTimelineEventStartTime + scrollPosition * 1000);
    }
    return new Date();
  }, [timeline, timelineContainerRef]);

  useEffect(() => {
    if (timelineContainerRef) {
      const timelineContainerWidth = timelineContainerRef.current?.offsetWidth || 0;
      const offset = Math.round(timelineContainerWidth / 2);
      setTimelineOffset(offset);
    }
  }, [timelineContainerRef]);

  const handleViewEvent = useCallback(
    (event: TimelineEventBlock) => {
      scrollToEvent(event);
      setMarkerTime(getCurrentMarkerTime());
    },
    [scrollToEvent, getCurrentMarkerTime]
  );

  const onPlayPauseHandler = (isPlaying: boolean) => {
    onPlayPause && onPlayPause(isPlaying);
  };

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

  const timelineBlocks = useMemo(() => {
    if (timelineOffset && timeline.length > 0) {
      return <TimelineBlocks timeline={timeline} firstBlockOffset={timelineOffset} onEventClick={handleViewEvent} />;
    }
  }, [timeline, timelineOffset, handleViewEvent]);

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
              />
            </div>
          </div>
          <div ref={timelineContainerRef} onScroll={onTimelineScrollHandler} className='overflow-x-auto hide-scroll'>
            {timelineBlocks}
          </div>
        </div>
      </div>
      <TimelineControls
        disabled={disabledControls}
        isPlaying={isPlaying}
        onPrevious={onPreviousHandler}
        onPlayPause={onPlayPauseHandler}
        onNext={onNextHandler}
        className='mt-2'
      />
    </Fragment>
  );
}
