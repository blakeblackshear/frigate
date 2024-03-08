import { useCallback, useEffect, useMemo, useState } from "react";
import { isDesktop, isMobile } from "react-device-detect";
import scrollIntoView from "scroll-into-view-if-needed";

type DragHandlerProps = {
  contentRef: React.RefObject<HTMLElement>;
  timelineRef: React.RefObject<HTMLDivElement>;
  scrollTimeRef: React.RefObject<HTMLDivElement>;
  alignStartDateToTimeline: (time: number) => number;
  alignEndDateToTimeline: (time: number) => number;
  segmentDuration: number;
  showHandlebar: boolean;
  handlebarTime?: number;
  setHandlebarTime?: React.Dispatch<React.SetStateAction<number>>;
  handlebarTimeRef: React.MutableRefObject<HTMLDivElement | null>;
  timelineDuration: number;
  timelineStartAligned: number;
  isDragging: boolean;
  setIsDragging: React.Dispatch<React.SetStateAction<boolean>>;
};

function useDraggableHandler({
  contentRef,
  timelineRef,
  scrollTimeRef,
  alignStartDateToTimeline,
  segmentDuration,
  showHandlebar,
  handlebarTime,
  setHandlebarTime,
  handlebarTimeRef,
  timelineDuration,
  timelineStartAligned,
  isDragging,
  setIsDragging,
}: DragHandlerProps) {
  const [clientYPosition, setClientYPosition] = useState<number | null>(null);
  const [initialClickAdjustment, setInitialClickAdjustment] = useState(0);

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
    (
      e: React.MouseEvent<HTMLDivElement> | React.TouchEvent<HTMLDivElement>,
    ) => {
      let clientY;
      if (isMobile && e.nativeEvent instanceof TouchEvent) {
        clientY = e.nativeEvent.touches[0].clientY;
      } else if (e.nativeEvent instanceof MouseEvent) {
        clientY = e.nativeEvent.clientY;
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
      e.preventDefault();
      e.stopPropagation();
      getClientYPosition(e);
      setIsDragging(true);

      if (scrollTimeRef.current && clientYPosition && isDesktop) {
        const handlebarRect = scrollTimeRef.current.getBoundingClientRect();
        setInitialClickAdjustment(clientYPosition - handlebarRect.top);
      }
    },
    [setIsDragging, getClientYPosition, scrollTimeRef, clientYPosition],
  );

  const handleMouseUp = useCallback(
    (
      e: React.MouseEvent<HTMLDivElement> | React.TouchEvent<HTMLDivElement>,
    ) => {
      e.preventDefault();
      e.stopPropagation();
      if (isDragging) {
        setIsDragging(false);
        setInitialClickAdjustment(0);
      }
    },
    [isDragging, setIsDragging],
  );

  const getCumulativeScrollTop = useCallback((element: HTMLElement | null) => {
    let scrollTop = 0;
    while (element) {
      scrollTop += element.scrollTop;
      element = element.parentElement;
    }
    return scrollTop;
  }, []);

  const updateHandlebarPosition = useCallback(
    (
      newHandlePosition: number,
      segmentStartTime: number,
      scrollTimeline: boolean,
      updateHandle: boolean,
    ) => {
      const thumb = scrollTimeRef.current;
      if (thumb) {
        requestAnimationFrame(() => {
          thumb.style.top = `${newHandlePosition}px`;
          if (handlebarTimeRef.current) {
            handlebarTimeRef.current.textContent = new Date(
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

        if (setHandlebarTime && updateHandle) {
          setHandlebarTime(segmentStartTime);
        }
      }
    },
    [segmentDuration, handlebarTimeRef, scrollTimeRef, setHandlebarTime],
  );

  const handleMouseMove = useCallback(
    (
      e: React.MouseEvent<HTMLDivElement> | React.TouchEvent<HTMLDivElement>,
    ) => {
      if (
        !contentRef.current ||
        !timelineRef.current ||
        !scrollTimeRef.current
      ) {
        return;
      }

      getClientYPosition(e);
    },

    [contentRef, scrollTimeRef, timelineRef, getClientYPosition],
  );

  useEffect(() => {
    let animationFrameId: number | null = null;

    const handleScroll = () => {
      if (
        timelineRef.current &&
        showHandlebar &&
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

        const newHandlePosition = Math.min(
          // end of timeline
          segmentHeight * (timelineDuration / segmentDuration) -
            segmentHeight * 2,
          Math.max(
            // start of timeline
            segmentHeight + scrolled,
            // current Y position
            clientYPosition -
              timelineTop +
              parentScrollTop -
              initialClickAdjustment,
          ),
        );

        const segmentIndex = Math.floor(newHandlePosition / segmentHeight);
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

        updateHandlebarPosition(
          newHandlePosition - segmentHeight,
          segmentStartTime,
          false,
          false,
        );

        if (setHandlebarTime) {
          setHandlebarTime(
            timelineStartAligned -
              ((newHandlePosition - segmentHeight / 2 - 2) / segmentHeight) *
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
    isDragging,
    segmentDuration,
    timelineStartAligned,
    timelineDuration,
    timelineRef,
    draggingAtTopEdge,
    draggingAtBottomEdge,
    showHandlebar,
  ]);

  useEffect(() => {
    if (
      timelineRef.current &&
      scrollTimeRef.current &&
      showHandlebar &&
      handlebarTime &&
      !isDragging
    ) {
      const { scrollHeight: timelineHeight, scrollTop: scrolled } =
        timelineRef.current;

      const segmentHeight =
        timelineHeight / (timelineDuration / segmentDuration);

      const parentScrollTop = getCumulativeScrollTop(timelineRef.current);

      const newHandlePosition =
        ((timelineStartAligned - handlebarTime) / segmentDuration) *
          segmentHeight +
        parentScrollTop -
        scrolled -
        2; // height of handlebar horizontal line

      updateHandlebarPosition(newHandlePosition, handlebarTime, true, true);
    }
    // we know that these deps are correct
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [handlebarTime, showHandlebar, scrollTimeRef, timelineStartAligned]);

  return { handleMouseDown, handleMouseUp, handleMouseMove };
}

export default useDraggableHandler;
