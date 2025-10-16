import { useCallback, useEffect, useMemo, useState } from "react";
import { useTimelineUtils } from "./use-timeline-utils";
import { FrigateConfig } from "@/types/frigateConfig";
import useSWR from "swr";
import { formatUnixTimestampToDateTime } from "@/utils/dateUtil";
import { useDateLocale } from "./use-date-locale";
import { useTranslation } from "react-i18next";
import useUserInteraction from "./use-user-interaction";

type DraggableElementProps = {
  contentRef: React.RefObject<HTMLElement>;
  timelineRef: React.RefObject<HTMLDivElement>;
  segmentsRef: React.RefObject<HTMLDivElement>;
  draggableElementRef: React.RefObject<HTMLDivElement>;
  segmentDuration: number;
  showDraggableElement: boolean;
  draggableElementTime?: number;
  draggableElementEarliestTime?: number;
  draggableElementLatestTime?: number;
  setDraggableElementTime?: React.Dispatch<React.SetStateAction<number>>;
  alignSetTimeToSegment?: boolean;
  initialScrollIntoViewOnly?: boolean;
  draggableElementTimeRef: React.MutableRefObject<HTMLDivElement | null>;
  timelineDuration: number;
  timelineCollapsed?: boolean;
  timelineStartAligned: number;
  isDragging: boolean;
  setIsDragging: React.Dispatch<React.SetStateAction<boolean>>;
  setDraggableElementPosition?: React.Dispatch<React.SetStateAction<number>>;
  dense: boolean;
  segments: number[];
  scrollToSegment: (segmentTime: number, ifNeeded?: boolean) => void;
};

function useDraggableElement({
  contentRef,
  timelineRef,
  segmentsRef,
  draggableElementRef,
  segmentDuration,
  showDraggableElement,
  draggableElementTime,
  draggableElementEarliestTime,
  draggableElementLatestTime,
  setDraggableElementTime,
  alignSetTimeToSegment = false,
  initialScrollIntoViewOnly,
  draggableElementTimeRef,
  timelineDuration,
  timelineCollapsed,
  timelineStartAligned,
  isDragging,
  setIsDragging,
  setDraggableElementPosition,
  dense,
  segments,
  scrollToSegment,
}: DraggableElementProps) {
  const { data: config } = useSWR<FrigateConfig>("config");

  const [clientYPosition, setClientYPosition] = useState<number | null>(null);
  const [initialClickAdjustment, setInitialClickAdjustment] = useState(0);
  const [elementScrollIntoView, setElementScrollIntoView] = useState(true);
  const [scrollEdgeSize, setScrollEdgeSize] = useState<number>();
  const [fullTimelineHeight, setFullTimelineHeight] = useState<number>();
  const { alignStartDateToTimeline, getCumulativeScrollTop, segmentHeight } =
    useTimelineUtils({
      segmentDuration: segmentDuration,
      timelineDuration: timelineDuration,
      timelineRef,
    });

  // track user interaction and adjust scrolling behavior

  const { userInteracting } = useUserInteraction({
    elementRef: timelineRef,
  });

  const draggingAtTopEdge = useMemo(() => {
    if (clientYPosition && timelineRef.current && scrollEdgeSize) {
      const timelineRect = timelineRef.current.getBoundingClientRect();
      const timelineTopAbsolute = timelineRect.top;
      return (
        clientYPosition - timelineTopAbsolute < scrollEdgeSize && isDragging
      );
    }
  }, [clientYPosition, timelineRef, isDragging, scrollEdgeSize]);

  const draggingAtBottomEdge = useMemo(() => {
    if (clientYPosition && timelineRef.current && scrollEdgeSize) {
      const timelineRect = timelineRef.current.getBoundingClientRect();
      const timelineTopAbsolute = timelineRect.top;
      const timelineHeightAbsolute = timelineRect.height;
      return (
        timelineTopAbsolute + timelineHeightAbsolute - clientYPosition <
          scrollEdgeSize && isDragging
      );
    }
  }, [clientYPosition, timelineRef, isDragging, scrollEdgeSize]);

  const getClientYPosition = useCallback(
    (e: MouseEvent | TouchEvent) => {
      let clientY;
      if ("TouchEvent" in window && e instanceof TouchEvent) {
        clientY = e.touches[0].clientY;
      } else if (e instanceof MouseEvent) {
        clientY = e.clientY;
      }

      if (clientY) {
        setClientYPosition(clientY);
      }
    },
    [setClientYPosition],
  );

  const handleMouseDown = useCallback(
    (
      e: React.MouseEvent<HTMLDivElement> | React.TouchEvent<HTMLDivElement>,
    ) => {
      // prevent default only for mouse events
      // to avoid chrome/android issues
      if (e.nativeEvent instanceof MouseEvent) {
        e.preventDefault();
      }
      e.stopPropagation();
      setIsDragging(true);

      let clientY;
      if ("TouchEvent" in window && e.nativeEvent instanceof TouchEvent) {
        clientY = e.nativeEvent.touches[0].clientY;
      } else if (e.nativeEvent instanceof MouseEvent) {
        clientY = e.nativeEvent.clientY;
      }
      if (clientY && draggableElementRef.current) {
        const draggableElementRect =
          draggableElementRef.current.getBoundingClientRect();
        if (!isDragging) {
          setInitialClickAdjustment(clientY - draggableElementRect.top);
        }
        setClientYPosition(clientY);
      }
    },
    // we know that these deps are correct
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [setIsDragging, draggableElementRef],
  );

  const handleMouseUp = useCallback(
    (e: MouseEvent | TouchEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (isDragging) {
        setIsDragging(false);
        setInitialClickAdjustment(0);
      }
    },
    [isDragging, setIsDragging],
  );

  const timestampToPixels = useCallback(
    (time: number) => {
      return ((timelineStartAligned - time) / segmentDuration) * segmentHeight;
    },
    [segmentDuration, timelineStartAligned, segmentHeight],
  );

  const { t } = useTranslation(["common"]);
  const locale = useDateLocale();

  const timeFormat = config?.ui.time_format === "24hour" ? "24hour" : "12hour";
  const format = useMemo(() => {
    const formatKey = `time.${
      segmentDuration < 60 && !dense
        ? "formattedTimestampHourMinuteSecond"
        : "formattedTimestampHourMinute"
    }.${timeFormat}`;
    return t(formatKey);
  }, [t, timeFormat, segmentDuration, dense]);

  const getFormattedTimestamp = useCallback(
    (segmentStartTime: number) => {
      return formatUnixTimestampToDateTime(segmentStartTime, {
        timezone: config?.ui.timezone,
        date_format: format,
        locale,
      });
    },
    [config?.ui.timezone, format, locale],
  );

  const updateDraggableElementPosition = useCallback(
    (
      newElementPosition: number,
      segmentStartTime: number,
      scrollTimeline: boolean,
      updateHandle: boolean,
    ) => {
      const thumb = draggableElementRef.current;
      if (thumb) {
        requestAnimationFrame(() => {
          thumb.style.top = `${newElementPosition}px`;
          if (setDraggableElementPosition) {
            setDraggableElementPosition(newElementPosition);
          }

          if (draggableElementTimeRef.current) {
            draggableElementTimeRef.current.textContent =
              getFormattedTimestamp(segmentStartTime);
            if (scrollTimeline && !userInteracting) {
              scrollToSegment(segmentStartTime);
            }
          }
        });

        if (setDraggableElementTime && updateHandle) {
          setDraggableElementTime(segmentStartTime);
        }
      }
    },
    [
      draggableElementTimeRef,
      draggableElementRef,
      setDraggableElementTime,
      setDraggableElementPosition,
      getFormattedTimestamp,
      userInteracting,
      scrollToSegment,
    ],
  );

  const handleMouseMove = useCallback(
    (e: MouseEvent | TouchEvent) => {
      if (
        !contentRef.current ||
        !timelineRef.current ||
        !draggableElementRef.current
      ) {
        return;
      }

      getClientYPosition(e);
    },

    [contentRef, draggableElementRef, timelineRef, getClientYPosition],
  );

  useEffect(() => {
    let animationFrameId: number | null = null;

    const handleScroll = () => {
      if (
        timelineRef.current &&
        showDraggableElement &&
        isDragging &&
        clientYPosition &&
        segments.length > 0 &&
        fullTimelineHeight
      ) {
        const { scrollTop: scrolled } = timelineRef.current;

        const parentScrollTop = getCumulativeScrollTop(timelineRef.current);

        // bottom of timeline
        const elementEarliest = draggableElementEarliestTime
          ? timestampToPixels(draggableElementEarliestTime)
          : fullTimelineHeight - segmentHeight * 1.5;

        // top of timeline - default 2 segments added for draggableElement visibility
        const elementLatest = draggableElementLatestTime
          ? timestampToPixels(draggableElementLatestTime)
          : segmentHeight * 1.5;

        const timelineRect = timelineRef.current.getBoundingClientRect();
        const timelineTopAbsolute = timelineRect.top;

        const newElementPosition = Math.min(
          elementEarliest,
          Math.max(
            elementLatest,
            // current Y position
            clientYPosition -
              timelineTopAbsolute +
              parentScrollTop -
              initialClickAdjustment,
          ),
        );

        if (
          newElementPosition >= elementEarliest ||
          newElementPosition <= elementLatest
        ) {
          return;
        }

        const start = Math.max(0, Math.floor(scrolled / segmentHeight));

        const relativePosition = newElementPosition - scrolled;
        const segmentIndex =
          Math.floor(relativePosition / segmentHeight) + start + 1;

        const targetSegmentTime = segments[segmentIndex];
        if (targetSegmentTime === undefined) return;

        const segmentStart = segmentIndex * segmentHeight - scrolled;

        const offset = Math.min(segmentStart - relativePosition, segmentHeight);

        if ((draggingAtTopEdge || draggingAtBottomEdge) && scrollEdgeSize) {
          if (draggingAtTopEdge) {
            const intensity = Math.max(
              0,
              (scrollEdgeSize - (clientYPosition - timelineTopAbsolute)) /
                scrollEdgeSize,
            );
            timelineRef.current.scrollTop -= segmentHeight * intensity;
          }

          if (draggingAtBottomEdge) {
            const intensity = Math.max(
              0,
              (clientYPosition -
                timelineTopAbsolute -
                (timelineRef.current.getBoundingClientRect().height -
                  scrollEdgeSize)) /
                scrollEdgeSize,
            );
            const newScrollTop = Math.min(
              fullTimelineHeight - segmentHeight,
              timelineRef.current.scrollTop + segmentHeight * intensity,
            );
            timelineRef.current.scrollTop = newScrollTop;
          }
        }

        const setTime = alignSetTimeToSegment
          ? targetSegmentTime
          : targetSegmentTime + segmentDuration * (offset / segmentHeight);

        updateDraggableElementPosition(
          newElementPosition,
          setTime,
          false,
          false,
        );

        if (setDraggableElementTime) {
          setDraggableElementTime(
            targetSegmentTime + segmentDuration * (offset / segmentHeight),
          );
        }

        if (draggingAtTopEdge || draggingAtBottomEdge) {
          animationFrameId = requestAnimationFrame(handleScroll);
        }
      }
    };

    const startScroll = () => {
      if (isDragging) {
        handleScroll();
      }
    };

    const stopScroll = () => {
      if (animationFrameId !== null) {
        cancelAnimationFrame(animationFrameId);
      }
    };

    startScroll();

    return stopScroll;
    // we know that these deps are correct
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    clientYPosition,
    segmentDuration,
    timelineStartAligned,
    timelineDuration,
    timelineRef,
    draggingAtTopEdge,
    draggingAtBottomEdge,
    showDraggableElement,
    segments,
  ]);

  useEffect(() => {
    if (
      timelineRef.current &&
      draggableElementRef.current &&
      showDraggableElement &&
      draggableElementTime &&
      !isDragging &&
      segments.length > 0
    ) {
      const alignedSegmentTime = alignStartDateToTimeline(draggableElementTime);
      if (!userInteracting) {
        scrollToSegment(alignedSegmentTime);
      }

      const segmentIndex = segments.findIndex(
        (time) => time === alignedSegmentTime,
      );

      if (segmentIndex >= 0) {
        const segmentStart = segmentIndex * segmentHeight;

        const offset =
          ((draggableElementTime - alignedSegmentTime) / segmentDuration) *
          segmentHeight;
        // subtract half the height of the handlebar cross bar (4px) for pixel perfection
        const newElementPosition = segmentStart - offset - 2;

        updateDraggableElementPosition(
          newElementPosition,
          draggableElementTime,
          elementScrollIntoView,
          true,
        );

        if (initialScrollIntoViewOnly) {
          setElementScrollIntoView(false);
        }
      }
    }
    // we know that these deps are correct
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    draggableElementTime,
    timelineDuration,
    segmentDuration,
    showDraggableElement,
    draggableElementRef,
    timelineStartAligned,
    timelineRef,
    timelineCollapsed,
    initialScrollIntoViewOnly,
    segments,
  ]);

  const findNextAvailableSegment = useCallback(
    (startTime: number) => {
      let searchTime = startTime;
      while (searchTime < timelineStartAligned + timelineDuration) {
        if (segments.includes(searchTime)) {
          return searchTime;
        }
        searchTime += segmentDuration;
      }
      return null;
    },
    [segments, timelineStartAligned, timelineDuration, segmentDuration],
  );

  useEffect(() => {
    if (
      timelineRef.current &&
      segmentsRef.current &&
      draggableElementTime &&
      timelineCollapsed &&
      segments.length > 0
    ) {
      setFullTimelineHeight(
        Math.min(
          timelineRef.current.scrollHeight,
          segmentsRef.current.scrollHeight,
        ),
      );

      const alignedSegmentTime = alignStartDateToTimeline(draggableElementTime);

      if (segments.includes(alignedSegmentTime)) {
        scrollToSegment(alignedSegmentTime);
      } else {
        // segment not found, maybe we collapsed over a collapsible segment
        const nextAvailableSegment =
          findNextAvailableSegment(alignedSegmentTime);

        if (nextAvailableSegment !== null) {
          scrollToSegment(nextAvailableSegment);
          if (setDraggableElementTime) {
            setDraggableElementTime(nextAvailableSegment);
          }
        } else {
          // segment still not found, just start at the beginning of the timeline or at now()
          const firstAvailableSegment = segments[0] || timelineStartAligned;
          scrollToSegment(firstAvailableSegment);
          if (setDraggableElementTime) {
            setDraggableElementTime(firstAvailableSegment);
          }
        }
      }
    }
    // we know that these deps are correct
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timelineCollapsed, segments]);

  useEffect(() => {
    if (timelineRef.current && segments && segmentsRef.current) {
      setScrollEdgeSize(timelineRef.current.clientHeight * 0.03);
      setFullTimelineHeight(
        Math.min(
          timelineRef.current.scrollHeight,
          segmentsRef.current.scrollHeight,
        ),
      );
    }
  }, [timelineRef, segmentsRef, segments]);

  return { handleMouseDown, handleMouseUp, handleMouseMove };
}

export default useDraggableElement;
