import { useCallback } from "react";
import { ReviewSegment } from "@/types/review";

export const useEventUtils = (
  events: ReviewSegment[],
  segmentDuration: number
) => {
  const isStartOfEvent = useCallback(
    (time: number): boolean => {
      return events.some((event) => {
        const segmentStart = getSegmentStart(event.start_time);
        return time >= segmentStart && time < segmentStart + segmentDuration;
      });
    },
    [events, segmentDuration]
  );

  const isEndOfEvent = useCallback(
    (time: number): boolean => {
      return events.some((event) => {
        if (typeof event.end_time === "number") {
          const segmentEnd = getSegmentEnd(event.end_time);
          return time >= segmentEnd - segmentDuration && time < segmentEnd;
        }
        return false;
      });
    },
    [events, segmentDuration]
  );

  const getSegmentStart = useCallback(
    (time: number): number => {
      return Math.floor(time / segmentDuration) * segmentDuration;
    },
    [segmentDuration]
  );

  const getSegmentEnd = useCallback(
    (time: number): number => {
      return Math.ceil(time / segmentDuration) * segmentDuration;
    },
    [segmentDuration]
  );

  const alignEndDateToTimeline = useCallback(
    (time: number): number => {
      const remainder = time % segmentDuration;
      const adjustment = remainder !== 0 ? segmentDuration - remainder : 0;
      return time + adjustment;
    },
    [segmentDuration]
  );

  const alignStartDateToTimeline = useCallback(
    (time: number): number => {
      const remainder = time % segmentDuration;
      const adjustment = remainder === 0 ? 0 : -(remainder);
      return time + adjustment;
    },
    [segmentDuration]
  );

  return {
    isStartOfEvent,
    isEndOfEvent,
    getSegmentStart,
    getSegmentEnd,
    alignEndDateToTimeline,
    alignStartDateToTimeline,
  };
};
