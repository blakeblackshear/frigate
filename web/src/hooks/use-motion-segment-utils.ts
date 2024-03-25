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
        return (
          event.start_time >= segmentStart && event.start_time < segmentEnd
        );
      });

      const totalMotion = matchingEvents.reduce(
        (acc, curr) => acc + (curr.motion ?? 0),
        0,
      );

      return totalMotion;
    },
    [motion_events, getSegmentStart, getSegmentEnd],
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
