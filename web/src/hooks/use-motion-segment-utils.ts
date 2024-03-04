import { useCallback, useMemo } from "react";
import { MockMotionData } from "@/pages/UIPlayground";

export const useMotionSegmentUtils = (
  segmentDuration: number,
  motion_events: MockMotionData[],
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
      return Math.ceil((Math.abs(value) / 100.0) * newMax) || 1;
    },
    [],
  );

  const getMotionSegmentValue = useCallback(
    (time: number): number => {
      const matchingEvent = motion_events.find((event) => {
        return (
          time >= getSegmentStart(event.start_time) &&
          time < getSegmentEnd(event.start_time)
        );
      });

      return matchingEvent?.motionValue ?? 0;
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

      return matchingEvent?.audioValue ?? 0;
    },
    [motion_events, getSegmentStart, getSegmentEnd],
  );

  return {
    getMotionSegmentValue,
    getAudioSegmentValue,
    interpolateMotionAudioData,
  };
};
