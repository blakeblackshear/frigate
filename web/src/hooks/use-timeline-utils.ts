import { useCallback } from "react";

export const useTimelineUtils = (segmentDuration: number) => {
  const alignEndDateToTimeline = useCallback(
    (time: number): number => {
      const remainder = time % segmentDuration;
      const adjustment = remainder !== 0 ? segmentDuration - remainder : 0;
      return time + adjustment;
    },
    [segmentDuration],
  );

  const alignStartDateToTimeline = useCallback(
    (time: number): number => {
      const remainder = time % segmentDuration;
      const adjustment = remainder === 0 ? 0 : -remainder;
      return time + adjustment;
    },
    [segmentDuration],
  );

  return {
    alignEndDateToTimeline,
    alignStartDateToTimeline,
  };
};
