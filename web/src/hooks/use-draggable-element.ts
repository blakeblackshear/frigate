import { useCallback, useEffect, useMemo, useState } from "react";
import { isDesktop, isMobile } from "react-device-detect";
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
  draggableElementTimeRef: React.MutableRefObject<HTMLDivElement | null>;
  timelineDuration: number;
  timelineStartAligned: number;
  isDragging: boolean;
  setIsDragging: React.Dispatch<React.SetStateAction<boolean>>;
  setDraggableElementPosition?: React.Dispatch<React.SetStateAction<number>>;
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
  draggableElementTimeRef,
  timelineDuration,
  timelineStartAligned,
  isDragging,
  setIsDragging,
  setDraggableElementPosition,
}: DraggableElementProps) {
  const [clientYPosition, setClientYPosition] = useState<number | null>(null);
  const [initialClickAdjustment, setInitialClickAdjustment] = useState(0);
  const { alignStartDateToTimeline, getCumulativeScrollTop } = useTimelineUtils(
    {
      segmentDuration: segmentDuration,
      timelineDuration: timelineDuration,
      timelineRef,
    },
  );

  const draggingAtTopEdge = useMemo(() => {
    if (clientYPosition && timelineRef.current) {
      return (
        clientYPosition - timelineRef.current.offsetTop <
          timelineRef.current.clientHeight * 0.03 && isDragging
      );
    }
  }, [clientYPosition, timelineRef, isDragging]);

  const draggingAtBottomEdge = useMemo(() => {
    if (clientYPosition && timelineRef.current) {
      return (
        clientYPosition >
          (timelineRef.current.clientHeight + timelineRef.current.offsetTop) *
            0.97 && isDragging
      );
    }
  }, [clientYPosition, timelineRef, isDragging]);

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
      if (clientY && draggableElementRef.current && isDesktop) {
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
      const { scrollHeight: timelineHeight } =
        timelineRef.current as HTMLDivElement;

      const segmentHeight =
        timelineHeight / (timelineDuration / segmentDuration);

      return ((timelineStartAligned - time) / segmentDuration) * segmentHeight;
    },
    [segmentDuration, timelineRef, timelineStartAligned, timelineDuration],
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
              ...(segmentDuration < 60 && isDesktop && { second: "2-digit" }),
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
        clientYPosition
      ) {
        const {
          scrollHeight: timelineHeight,
          scrollTop: scrolled,
          offsetTop: timelineTop,
        } = timelineRef.current;

        const segmentHeight =
          timelineHeight / (timelineDuration / segmentDuration);

        const parentScrollTop = getCumulativeScrollTop(timelineRef.current);

        // bottom of timeline
        const elementEarliest = draggableElementEarliestTime
          ? timestampToPixels(draggableElementEarliestTime)
          : segmentHeight * (timelineDuration / segmentDuration) -
            segmentHeight * 3;

        // top of timeline - default 2 segments added for draggableElement visibility
        const elementLatest = draggableElementLatestTime
          ? timestampToPixels(draggableElementLatestTime)
          : segmentHeight * 2 + scrolled;

        const newElementPosition = Math.min(
          elementEarliest,
          Math.max(
            elementLatest,
            // current Y position
            clientYPosition -
              timelineTop +
              parentScrollTop -
              initialClickAdjustment,
          ),
        );

        const segmentIndex = Math.floor(newElementPosition / segmentHeight);
        const segmentStartTime = alignStartDateToTimeline(
          timelineStartAligned - segmentIndex * segmentDuration,
        );

        if (draggingAtTopEdge || draggingAtBottomEdge) {
          let newPosition = clientYPosition;

          if (draggingAtTopEdge) {
            newPosition = scrolled - segmentHeight;
            timelineRef.current.scrollTop = newPosition;
          }

          if (draggingAtBottomEdge) {
            newPosition = scrolled + segmentHeight;
            timelineRef.current.scrollTop = newPosition;
          }
        }

        updateDraggableElementPosition(
          newElementPosition - segmentHeight,
          segmentStartTime,
          false,
          false,
        );

        if (setDraggableElementTime) {
          setDraggableElementTime(
            timelineStartAligned -
              ((newElementPosition - segmentHeight / 2 - 2) / segmentHeight) *
                segmentDuration,
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
      !isDragging
    ) {
      const { scrollHeight: timelineHeight, scrollTop: scrolled } =
        timelineRef.current;

      const segmentHeight =
        timelineHeight / (timelineDuration / segmentDuration);

      const parentScrollTop = getCumulativeScrollTop(timelineRef.current);

      const newElementPosition =
        ((timelineStartAligned - draggableElementTime) / segmentDuration) *
          segmentHeight +
        parentScrollTop -
        scrolled -
        2; // height of draggableElement horizontal line

      updateDraggableElementPosition(
        newElementPosition,
        draggableElementTime,
        true,
        true,
      );
    }
    // we know that these deps are correct
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    draggableElementTime,
    showDraggableElement,
    draggableElementRef,
    timelineStartAligned,
  ]);

  return { handleMouseDown, handleMouseUp, handleMouseMove };
}

export default useDraggableElement;
