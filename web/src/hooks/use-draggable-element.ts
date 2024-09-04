import {
  ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import scrollIntoView from "scroll-into-view-if-needed";
import { useTimelineUtils } from "./use-timeline-utils";
import { FrigateConfig } from "@/types/frigateConfig";
import useSWR from "swr";

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
  timelineSegments: ReactNode[];
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
  timelineSegments,
}: DraggableElementProps) {
  const { data: config } = useSWR<FrigateConfig>("config");

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

  // track user interaction and adjust scrolling behavior

  const [userInteracting, setUserInteracting] = useState(false);
  const interactionTimeout = useRef<NodeJS.Timeout>();
  const isProgrammaticScroll = useRef(false);

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
              hour12: config?.ui.time_format != "24hour",
              hour: "2-digit",
              minute: "2-digit",
              ...(segmentDuration < 60 && !dense && { second: "2-digit" }),
            });
            if (scrollTimeline && !userInteracting) {
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
      config,
      userInteracting,
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
    if (timelineRef.current && timelineSegments.length) {
      setSegments(Array.from(timelineRef.current.querySelectorAll(".segment")));
    }
  }, [timelineRef, timelineCollapsed, timelineSegments]);

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

        const setTime = alignSetTimeToSegment
          ? targetSegmentId
          : targetSegmentId + segmentDuration * (offset / segmentHeight);

        updateDraggableElementPosition(
          newElementPosition,
          setTime,
          false,
          false,
        );

        if (setDraggableElementTime) {
          setDraggableElementTime(
            targetSegmentId + segmentDuration * (offset / segmentHeight),
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
    if (
      timelineRef.current &&
      segmentsRef.current &&
      draggableElementTime &&
      timelineCollapsed &&
      timelineSegments &&
      segments
    ) {
      setFullTimelineHeight(
        Math.min(
          timelineRef.current.scrollHeight,
          segmentsRef.current.scrollHeight,
        ),
      );
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
            return;
          }
        }
      }
      if (!segmentElement) {
        // segment still not found, just start at the beginning of the timeline or at now()
        if (segments?.length) {
          const searchTime = parseInt(
            segments[0].getAttribute("data-segment-id") || "0",
            10,
          );
          if (setDraggableElementTime) {
            setDraggableElementTime(searchTime);
          }
        } else {
          if (setDraggableElementTime) {
            setDraggableElementTime(timelineStartAligned);
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

  useEffect(() => {
    const handleUserInteraction = () => {
      if (!isProgrammaticScroll.current) {
        setUserInteracting(true);

        if (interactionTimeout.current) {
          clearTimeout(interactionTimeout.current);
        }

        interactionTimeout.current = setTimeout(() => {
          setUserInteracting(false);
        }, 3000);
      } else {
        isProgrammaticScroll.current = false;
      }
    };

    const timelineElement = timelineRef.current;

    if (timelineElement) {
      timelineElement.addEventListener("scroll", handleUserInteraction);
      timelineElement.addEventListener("mousedown", handleUserInteraction);
      timelineElement.addEventListener("mouseup", handleUserInteraction);
      timelineElement.addEventListener("touchstart", handleUserInteraction);
      timelineElement.addEventListener("touchmove", handleUserInteraction);
      timelineElement.addEventListener("touchend", handleUserInteraction);

      return () => {
        timelineElement.removeEventListener("scroll", handleUserInteraction);
        timelineElement.removeEventListener("mousedown", handleUserInteraction);
        timelineElement.removeEventListener("mouseup", handleUserInteraction);
        timelineElement.removeEventListener(
          "touchstart",
          handleUserInteraction,
        );
        timelineElement.removeEventListener("touchmove", handleUserInteraction);
        timelineElement.removeEventListener("touchend", handleUserInteraction);
      };
    }
  }, [timelineRef]);

  return { handleMouseDown, handleMouseUp, handleMouseMove };
}

export default useDraggableElement;
