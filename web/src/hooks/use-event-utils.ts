import { useCallback } from 'react';
import { Event } from '@/types/event';

export const useEventUtils = (events: Event[], segmentDuration: number) => {
  const isStartOfEvent = useCallback((time: number): boolean => {
    return events.some((event) => {
      const segmentStart = getSegmentStart(event.start_time);
      return time >= segmentStart && time < segmentStart + segmentDuration * 1000;
    });
  }, [events, segmentDuration]);

  const isEndOfEvent = useCallback((time: number): boolean => {
    return events.some((event) => {
      if (typeof event.end_time === 'number') {
        const segmentEnd = getSegmentEnd(event.end_time);
        return time >= segmentEnd - segmentDuration * 1000 && time < segmentEnd;
      }
      return false; // Return false if end_time is undefined
    });
  }, [events, segmentDuration]);

  const getSegmentStart = useCallback((time: number): number => {
    return Math.floor(time / (segmentDuration * 1000)) * (segmentDuration * 1000);
  }, [segmentDuration]);

  const getSegmentEnd = useCallback((time: number): number => {
    return Math.ceil(time / (segmentDuration * 1000)) * (segmentDuration * 1000);
  }, [segmentDuration]);

  const alignDateToTimeline = useCallback((time: number): number => {
    const remainder = time % (segmentDuration * 1000);
    const adjustment = remainder !== 0 ? segmentDuration * 1000 - remainder : 0;
    return time + adjustment;
  }, [segmentDuration]);

  return { isStartOfEvent, isEndOfEvent, getSegmentStart, getSegmentEnd, alignDateToTimeline };
};
