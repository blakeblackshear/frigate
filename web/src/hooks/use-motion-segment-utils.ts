import { useCallback, useMemo } from "react";
import { MotionData } from "@/types/review";

export const useMotionSegmentUtils = (
  segmentDuration: number,
  motion_events: MotionData[],
) => {
  const halfSegmentDuration = useMemo(
    () => segmentDuration / 2,
    [segmentDuration],
  );

  const getSegmentStart = useCallback(
    (time: number): number => {
      return Math.floor(time / halfSegmentDuration) * halfSegmentDuration;
    },
    [halfSegmentDuration],
  );

  const getSegmentEnd = useCallback(
    (time: number | undefined): number => {
      if (time) {
        return (
          Math.floor(time / halfSegmentDuration) * halfSegmentDuration +
          halfSegmentDuration
        );
      } else {
        return Date.now() / 1000 + halfSegmentDuration;
      }
    },
    [halfSegmentDuration],
  );

  const interpolateMotionAudioData = useCallback(
    (value: number, newMax: number): number => {
      return Math.ceil((Math.abs(value) / 100.0) * newMax) || 0;
    },
    [],
  );

  const getMotionSegmentValue = useCallback(
    (time: number): number => {
      const segmentStart = getSegmentStart(time);
      const segmentEnd = getSegmentEnd(time);
      const matchingEvents = motion_events.filter((event) => {
        // Use integer ms math to avoid floating point rounding issues
        // when halfSegmentDuration is not an integer
        // (eg, 2.5 seconds from timeline zooming)
        const eventMs = Math.round(event.start_time * 1000);
        const halfMs = Math.round(halfSegmentDuration * 1000);
        const eventBucketMs = Math.round(eventMs / halfMs) * halfMs;
        const eventRounded = eventBucketMs / 1000;
        return eventRounded >= segmentStart && eventRounded < segmentEnd;
      });

      const totalMotion = matchingEvents.reduce(
        (acc, curr) => acc + (curr.motion ?? 0),
        0,
      );

      return totalMotion;
    },
    [motion_events, getSegmentStart, getSegmentEnd, halfSegmentDuration],
  );

  const getAudioSegmentValue = useCallback(
    (time: number): number => {
      const matchingEvent = motion_events.find((event) => {
        return (
          time >= getSegmentStart(event.start_time) &&
          time < getSegmentEnd(event.start_time)
        );
      });

      return matchingEvent?.audio ?? 0;
    },
    [motion_events, getSegmentStart, getSegmentEnd],
  );

  const getMotionStart = useCallback(
    (time: number): number => {
      const matchingEvent = motion_events.find((event) => {
        return (
          time >= getSegmentStart(event.start_time) &&
          time < getSegmentEnd(event.start_time) &&
          event.motion
        );
      });

      return matchingEvent?.start_time ?? 0;
    },
    [motion_events, getSegmentStart, getSegmentEnd],
  );

  return {
    getMotionSegmentValue,
    getAudioSegmentValue,
    interpolateMotionAudioData,
    getMotionStart,
  };
};
