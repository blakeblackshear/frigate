import { useCallback, useEffect, useMemo, useState } from "react";
import { isMobile } from "react-device-detect";
import scrollIntoView from "scroll-into-view-if-needed";
import { useTimelineUtils } from "./use-timeline-utils";

type DraggableElementProps = {
  contentRef: React.RefObject<HTMLElement>;
  timelineRef: React.RefObject<HTMLDivElement>;
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
};

function useDraggableElement({
  contentRef,
  timelineRef,
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
}: DraggableElementProps) {
  const [clientYPosition, setClientYPosition] = useState<number | null>(null);
  const [initialClickAdjustment, setInitialClickAdjustment] = useState(0);
  const [elementScrollIntoView, setElementScrollIntoView] = useState(true);
  const [scrollEdgeSize, setScrollEdgeSize] = useState<number>();
  const [fullTimelineHeight, setFullTimelineHeight] = useState<number>();
  const [segments, setSegments] = useState<HTMLDivElement[]>([]);
  const { alignStartDateToTimeline, getCumulativeScrollTop, segmentHeight } =
    useTimelineUtils({
      segmentDuration: segmentDuration,
      timelineDuration: timelineDuration,
      timelineRef,
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
      if (isMobile && e instanceof TouchEvent) {
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
      if (isMobile && e.nativeEvent instanceof TouchEvent) {
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
            draggableElementTimeRef.current.textContent = new Date(
              segmentStartTime * 1000,
            ).toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
              ...(segmentDuration < 60 && !dense && { second: "2-digit" }),
            });
            if (scrollTimeline) {
              scrollIntoView(thumb, {
                block: "center",
                behavior: "smooth",
                scrollMode: "if-needed",
              });
            }
          }
        });

        if (setDraggableElementTime && updateHandle) {
          setDraggableElementTime(segmentStartTime);
        }
      }
    },
    [
      segmentDuration,
      draggableElementTimeRef,
      draggableElementRef,
      setDraggableElementTime,
      setDraggableElementPosition,
      dense,
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
    if (timelineRef.current) {
      setSegments(Array.from(timelineRef.current.querySelectorAll(".segment")));
    }
  }, [timelineRef, segmentDuration, timelineDuration, timelineCollapsed]);

  useEffect(() => {
    let animationFrameId: number | null = null;

    const handleScroll = () => {
      if (
        timelineRef.current &&
        showDraggableElement &&
        isDragging &&
        clientYPosition &&
        segments &&
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

        let targetSegmentId = 0;
        let offset = 0;

        segments.forEach((segmentElement: HTMLDivElement) => {
          const rect = segmentElement.getBoundingClientRect();
          const segmentTop =
            rect.top + scrolled - timelineTopAbsolute - segmentHeight;
          const segmentBottom =
            rect.bottom + scrolled - timelineTopAbsolute - segmentHeight;

          // Check if handlebar position falls within the segment bounds
          if (
            newElementPosition >= segmentTop &&
            newElementPosition <= segmentBottom
          ) {
            targetSegmentId = parseFloat(
              segmentElement.getAttribute("data-segment-id") || "0",
            );
            offset = Math.min(
              segmentBottom - newElementPosition,
              segmentHeight,
            );
            return;
          }
        });

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

        updateDraggableElementPosition(
          newElementPosition,
          targetSegmentId,
          false,
          false,
        );

        if (setDraggableElementTime) {
          if (alignSetTimeToSegment) {
            setDraggableElementTime(targetSegmentId);
          } else {
            setDraggableElementTime(
              targetSegmentId + segmentDuration * (offset / segmentHeight),
            );
          }
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
      const { scrollTop: scrolled } = timelineRef.current;

      const alignedSegmentTime = alignStartDateToTimeline(draggableElementTime);

      const segmentElement = timelineRef.current.querySelector(
        `[data-segment-id="${alignedSegmentTime}"]`,
      );

      if (segmentElement) {
        const timelineRect = timelineRef.current.getBoundingClientRect();
        const timelineTopAbsolute = timelineRect.top;
        const rect = segmentElement.getBoundingClientRect();
        const segmentTop = rect.top + scrolled - timelineTopAbsolute;
        const offset =
          ((draggableElementTime - alignedSegmentTime) / segmentDuration) *
          segmentHeight;
        // subtract half the height of the handlebar cross bar (4px) for pixel perfection
        const newElementPosition = segmentTop - offset - 2;

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

  useEffect(() => {
    if (timelineRef.current && draggableElementTime && timelineCollapsed) {
      setFullTimelineHeight(timelineRef.current.scrollHeight);
      const alignedSegmentTime = alignStartDateToTimeline(draggableElementTime);

      let segmentElement = timelineRef.current.querySelector(
        `[data-segment-id="${alignedSegmentTime}"]`,
      );

      if (!segmentElement) {
        // segment not found, maybe we collapsed over a collapsible segment
        let searchTime = alignedSegmentTime;

        while (
          searchTime < timelineStartAligned &&
          searchTime < timelineStartAligned + timelineDuration
        ) {
          searchTime += segmentDuration;
          segmentElement = timelineRef.current.querySelector(
            `[data-segment-id="${searchTime}"]`,
          );

          if (segmentElement) {
            // found, set time
            if (setDraggableElementTime) {
              setDraggableElementTime(searchTime);
            }
            break;
          }
        }
      }
    }
    // we know that these deps are correct
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timelineCollapsed]);

  useEffect(() => {
    if (timelineRef.current && segments) {
      setScrollEdgeSize(timelineRef.current.clientHeight * 0.03);
      setFullTimelineHeight(timelineRef.current.scrollHeight);
    }
  }, [timelineRef, segments]);

  return { handleMouseDown, handleMouseUp, handleMouseMove };
}

export default useDraggableElement;
