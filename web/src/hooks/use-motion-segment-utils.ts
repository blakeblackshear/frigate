import { useCallback } from "react";
import { MockMotionData } from "@/pages/UIPlayground";

export const useMotionSegmentUtils = (
  segmentDuration: number,
  motion_events: MockMotionData[],
) => {
  const getSegmentStart = useCallback(
    (time: number): number => {
      return Math.floor(time / segmentDuration) * segmentDuration;
    },
    [segmentDuration],
  );

  const getSegmentEnd = useCallback(
    (time: number | undefined): number => {
      if (time) {
        return (
          Math.floor(time / segmentDuration) * segmentDuration + segmentDuration
        );
      } else {
        return Date.now() / 1000 + segmentDuration;
      }
    },
    [segmentDuration],
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
          time < getSegmentEnd(event.start_time + segmentDuration / 2)
        );
      });

      return matchingEvent?.motionValue ?? 0;
    },
    [motion_events, getSegmentStart, getSegmentEnd, segmentDuration],
  );

  const getAudioSegmentValue = useCallback(
    (time: number): number => {
      const matchingEvent = motion_events.find((event) => {
        return (
          time >= getSegmentStart(event.start_time) &&
          time < getSegmentEnd(event.end_time)
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
