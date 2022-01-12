import { Fragment, h } from 'preact';
import { useCallback, useEffect, useRef, useState } from 'preact/hooks';
import { FetchStatus, useEvents } from '../api';
import { useSearchString } from '../hooks/useSearchString';
import { Next } from '../icons/Next';
import { Play } from '../icons/Play';
import { Previous } from '../icons/Previous';
import { TextTab } from './Tabs';
import { longToDate } from '../utils/dateUtil'

export default function Timeline({ camera, onChange }) {
  const timelineContainerRef = useRef(undefined);

  const { searchString } = useSearchString(25, `camera=${camera}`);
  const { data: events, status } = useEvents(searchString);
  const [timeline, setTimeline] = useState([]);
  const [timelineOffset, setTimelineOffset] = useState();
  const [markerTime, setMarkerTime] = useState();
  const [currentEvent, setCurrentEvent] = useState();
  const [scrollTimeout, setScrollTimeout] = useState();
  const [scrollActive, setScrollActive] = useState(true);
  
  useEffect(() => {
    if (status === FetchStatus.LOADED && timelineOffset) {
      const filteredEvents = [...events].reverse().filter(e => e.end_time !== undefined)
      const firstEvent = events[events.length - 1];
      if (firstEvent) {
        setMarkerTime(longToDate(firstEvent.start_time))
      }      
      
      const firstEventTime = longToDate(firstEvent.start_time);
      const eventsMap = filteredEvents.map((e, i) => {
        const startTime = longToDate(e.start_time)
        const endTime = e.end_time ? longToDate(e.end_time) : new Date();
        const seconds = Math.round(Math.abs(endTime - startTime) / 1000);
        const positionX = Math.round((Math.abs(startTime - firstEventTime) / 1000) + timelineOffset);
        return {
          ...e,
          startTime,
          endTime,
          seconds,
          width: seconds,
          positionX,
        }
      })

      const recentEvent = eventsMap[eventsMap.length - 1]
      const event = {
        ...recentEvent,
        id: recentEvent.id,
        index: eventsMap.length - 1,
        startTime: recentEvent.start_time,
        endTime: recentEvent.end_time
      }
      setCurrentEvent(event)
      setTimeline(eventsMap)
    }
  }, [events, timelineOffset])

  const checkMarkerForEvent = (markerTime) => {
    if (!scrollActive) {
      setScrollActive(true)
      return
    }

    if (timeline) {
      const foundIndex = timeline.findIndex((event => event.startTime <= markerTime && markerTime <= event.endTime))
      if (foundIndex > -1) {
        const found = timeline[foundIndex]
        setCurrentEvent({
          ...found,
          id: found.id,
          index: foundIndex,
          startTime: found.start_time,
          endTime: found.end_time
        })
      }

    }
  }

  const handleScroll = event => {
    clearTimeout(scrollTimeout)

    const scrollPosition = event.target.scrollLeft
    const startTime = longToDate(timeline[0].start_time)
    const markerTime = new Date((startTime.getTime()) + (scrollPosition * 1000));
    setMarkerTime(markerTime)

    setScrollTimeout(setTimeout(() => {
      checkMarkerForEvent(markerTime)
    }, 250))
  }

  useEffect(() => {    
    if (timelineContainerRef) {
      const timelineContainerWidth = timelineContainerRef.current.offsetWidth
      const offset = Math.round(timelineContainerWidth / 2)
      setTimelineOffset(offset);
    }
  }, [timelineContainerRef])

  useEffect(() => {
    onChange && onChange(currentEvent)
  }, [currentEvent])

  const RenderTimeline = useCallback(() => {
    if (timeline && timeline.length > 0) {
      const lastEvent = timeline[timeline.length - 1]
      const timelineLength = timelineOffset + lastEvent.positionX + lastEvent.width;
      return (
        <div className="relative flex items-center h-20" style={{
          width: `${timelineLength}px`,
          background: "url('/marker.png')",
          backgroundPosition: "center",
          backgroundSize: "30px",
          backgroundRepeat: "repeat-x"
        }}>
          {
            timeline.map((e) => {
              return (
                <div key={e.id} className='absolute z-10 rounded-full bg-blue-300 h-2' style={{
                  left: `${e.positionX}px`,
                  width: `${e.seconds}px`
                }}></div>
              )
            })
          }
        </div>
      )
    }
  }, [timeline])

  const setNextCurrentEvent = function(offset) {
    setScrollActive(false)
    setCurrentEvent(currentEvent => {
      const index = currentEvent.index + offset;
      const nextEvent = timeline[index];
      const positionX = nextEvent.positionX - timelineOffset
      timelineContainerRef.current.scrollLeft = positionX
      return {
        ...nextEvent,
        id: nextEvent.id,
        index,
        startTime: nextEvent.start_time,
        endTime: nextEvent.end_time
      }
    })
  }
  
  const handlePrevious = function() {
    setNextCurrentEvent(-1);
  }

  const handleNext = function () {
    setNextCurrentEvent(1);
  }

  return (
    <Fragment>
      <div className='relative flex-grow-1'>
        <div className='absolute left-0 top-0 h-full w-full' style={{ textAlign: 'center' }}>
          <div className="h-full" style={{ margin: "0 auto", textAlign: "center" }}>
            <span className='z-20 text-white'>{markerTime && (<span>{markerTime.toLocaleTimeString()}</span>)}</span>
            <div className='z-20 h-full absolute' style={{
              left: "calc(100% / 2)",
              height: "calc(100% - 24px)",
              borderRight: "2px solid rgba(252, 211, 77)"
            }}></div>
          </div>
        </div>
        <div ref={timelineContainerRef} className='overflow-x-auto' onScroll={handleScroll}>
          <RenderTimeline />
        </div>
      </div>

      <div className='flex self-center'>
        <TextTab onClick={handlePrevious} text={<Previous />} />
        <TextTab text={<Play />}/>
        <TextTab onClick={handleNext} text={<Next />} />
      </div>
    </Fragment>
  )
}


