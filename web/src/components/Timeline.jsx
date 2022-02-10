import { h } from 'preact';
import { useCallback, useEffect, useRef, useState } from 'preact/hooks';
import { longToDate } from '../utils/dateUtil';

export default function Timeline({ events, offset, currentIndex, disabled, onChange }) {
  const timelineContainerRef = useRef(undefined);

  const [timeline, setTimeline] = useState([]);
  const [timelineOffset, setTimelineOffset] = useState();
  const [markerTime, setMarkerTime] = useState();
  const [currentEvent, setCurrentEvent] = useState();
  const [scrollTimeout, setScrollTimeout] = useState();
  const [scrollActive, setScrollActive] = useState(true);
  const [eventsEnabled, setEventsEnable] = useState(true);

  useEffect(() => {
    if (events && events.length > 0 && timelineOffset) {
      const firstEvent = events[0];
      if (firstEvent) {
        setMarkerTime(longToDate(firstEvent.start_time));
      }

      const firstEventTime = longToDate(firstEvent.start_time);
      const timelineEvents = events.map((e, i) => {
        const startTime = longToDate(e.start_time);
        const endTime = e.end_time ? longToDate(e.end_time) : new Date();
        const seconds = Math.round(Math.abs(endTime - startTime) / 1000);
        const positionX = Math.round(Math.abs(startTime - firstEventTime) / 1000 + timelineOffset);
        return {
          ...e,
          startTime,
          endTime,
          seconds,
          width: seconds,
          positionX,
        };
      });

      const firstTimelineEvent = timelineEvents[0];
      setCurrentEvent({
        ...firstTimelineEvent,
        id: firstTimelineEvent.id,
        index: 0,
        startTime: longToDate(firstTimelineEvent.start_time),
        endTime: longToDate(firstTimelineEvent.end_time),
      });
      setTimeline(timelineEvents);
    }
  }, [events, timelineOffset]);

  const getCurrentEvent = useCallback(() => {
    return currentEvent;
  }, [currentEvent]);

  useEffect(() => {
    const cEvent = getCurrentEvent();
    if (cEvent && offset >= 0) {
      timelineContainerRef.current.scroll({
        left: cEvent.positionX + offset - timelineOffset,
        behavior: 'smooth',
      });
    }
  }, [offset, timelineContainerRef]);

  useEffect(() => {
    if (timeline.length > 0 && currentIndex !== undefined) {
      const event = timeline[currentIndex];
      setCurrentEvent({
        ...event,
        id: event.id,
        index: currentIndex,
        startTime: longToDate(event.start_time),
        endTime: longToDate(event.end_time),
      });
      timelineContainerRef.current.scroll({ left: event.positionX - timelineOffset, behavior: 'smooth' });
    }
  }, [currentIndex, timelineContainerRef, timeline]);

  const checkMarkerForEvent = (markerTime) => {
    if (!scrollActive) {
      setScrollActive(true);
      return;
    }

    if (timeline) {
      const foundIndex = timeline.findIndex((event) => event.startTime <= markerTime && markerTime <= event.endTime);
      if (foundIndex > -1) {
        const found = timeline[foundIndex];
        if (found !== currentEvent && found.id !== currentEvent.id) {
          setCurrentEvent({
            ...found,
            id: found.id,
            index: foundIndex,
            startTime: longToDate(found.start_time),
            endTime: longToDate(found.end_time),
          });
          return found;
        }
      }
    }
  };

  const scrollLogic = () => {
    clearTimeout(scrollTimeout);

    const scrollPosition = timelineContainerRef.current.scrollLeft;
    const startTime = longToDate(timeline[0].start_time);
    const markerTime = new Date(startTime.getTime() + scrollPosition * 1000);
    setMarkerTime(markerTime);

    handleChange(currentEvent, markerTime, false);

    setScrollTimeout(
      setTimeout(() => {
        const foundEvent = checkMarkerForEvent(markerTime);
        handleChange(foundEvent ? foundEvent : currentEvent, markerTime, true);
      }, 250)
    );
  };

  const handleWheel = (event) => {
    if (!disabled) {
      return;
    }

    scrollLogic(event);
  };

  const handleScroll = (event) => {
    if (disabled) {
      return;
    }
    scrollLogic(event);
  };

  useEffect(() => {
    if (timelineContainerRef) {
      const timelineContainerWidth = timelineContainerRef.current.offsetWidth;
      const offset = Math.round(timelineContainerWidth / 2);
      setTimelineOffset(offset);
    }
  }, [timelineContainerRef]);

  const handleChange = useCallback(
    (event, time, seekComplete) => {
      if (onChange !== undefined) {
        onChange({
          event,
          time,
          seekComplete,
        });
      }
    },
    [onChange]
  );

  const RenderTimeline = useCallback(() => {
    if (timeline && timeline.length > 0) {
      const lastEvent = timeline[timeline.length - 1];
      const timelineLength = timelineOffset + lastEvent.positionX + lastEvent.width;
      return (
        <div
          className='relative flex items-center h-20'
          style={{
            width: `${timelineLength}px`,
            background: "url('/marker.png')",
            backgroundPosition: 'center',
            backgroundSize: '30px',
            backgroundRepeat: 'repeat-x',
          }}
        >
          {timeline.map((e) => {
            return (
              <div
                key={e.id}
                className='absolute z-10 rounded-full bg-blue-300 h-2'
                style={{
                  left: `${e.positionX}px`,
                  width: `${e.seconds}px`,
                }}
              ></div>
            );
          })}
        </div>
      );
    }
  }, [timeline, timelineOffset]);

  return (
    <div className='relative flex-grow-1'>
      <div className='absolute left-0 top-0 h-full w-full' style={{ textAlign: 'center' }}>
        <div className='h-full' style={{ margin: '0 auto', textAlign: 'center' }}>
          <span className='z-20 text-black dark:text-white'>
            {markerTime && <span>{markerTime.toLocaleTimeString()}</span>}
          </span>
          <div
            className='z-20 h-full absolute'
            style={{
              left: 'calc(100% / 2)',
              height: 'calc(100% - 24px)',
              borderRight: '2px solid rgba(252, 211, 77)',
            }}
          ></div>
        </div>
      </div>
      <div
        ref={timelineContainerRef}
        onWheel={handleWheel}
        onTouchMove={handleWheel}
        onScroll={handleScroll}
        className='overflow-x-auto hide-scroll'
      >
        <RenderTimeline />
      </div>
    </div>
  );
}
