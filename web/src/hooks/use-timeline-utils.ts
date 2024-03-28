import { useCallback } from "react";

export type TimelineUtilsProps = {
  segmentDuration: number;
  timelineDuration?: number;
  timelineRef?: React.RefObject<HTMLElement>;
};

export function useTimelineUtils({
  segmentDuration,
  timelineDuration,
  timelineRef,
}: TimelineUtilsProps) {
  const segmentHeight = 8;

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

  const getCumulativeScrollTop = useCallback((element: HTMLElement | null) => {
    let scrollTop = 0;
    while (element) {
      scrollTop += element.scrollTop;
      element = element.parentElement;
    }
    return scrollTop;
  }, []);

  const getVisibleTimelineDuration = useCallback(() => {
    if (timelineRef?.current && timelineDuration) {
      const { clientHeight: visibleTimelineHeight } = timelineRef.current;

      const visibleTime =
        (visibleTimelineHeight / segmentHeight) * segmentDuration;

      return visibleTime;
    }
  }, [segmentDuration, timelineDuration, timelineRef]);

  return {
    alignEndDateToTimeline,
    alignStartDateToTimeline,
    getCumulativeScrollTop,
    getVisibleTimelineDuration,
    segmentHeight,
  };
}
