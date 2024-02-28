import { useCallback, useEffect } from "react";

interface DragHandlerProps {
  contentRef: React.RefObject<HTMLElement>;
  timelineRef: React.RefObject<HTMLDivElement>;
  scrollTimeRef: React.RefObject<HTMLDivElement>;
  alignStartDateToTimeline: (time: number) => number;
  alignEndDateToTimeline: (time: number) => number;
  segmentDuration: number;
  showHandlebar: boolean;
  timelineDuration: number;
  timelineStart: number;
  isDragging: boolean;
  setIsDragging: React.Dispatch<React.SetStateAction<boolean>>;
  currentTimeRef: React.MutableRefObject<HTMLDivElement | null>;
  setHandlebarTime?: React.Dispatch<React.SetStateAction<number>>;
}

// TODO: handle mobile touch events
function useDraggableHandler({
  contentRef,
  timelineRef,
  scrollTimeRef,
  alignStartDateToTimeline,
  segmentDuration,
  showHandlebar,
  timelineDuration,
  timelineStart,
  isDragging,
  setIsDragging,
  currentTimeRef,
  setHandlebarTime,
}: DragHandlerProps) {
  const handleMouseDown = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(true);
    },
    [setIsDragging]
  );

  const handleMouseUp = useCallback(
    (e: MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (isDragging) {
        setIsDragging(false);
      }
    },
    [isDragging, setIsDragging]
  );

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (
        !contentRef.current ||
        !timelineRef.current ||
        !scrollTimeRef.current
      ) {
        return;
      }

      e.preventDefault();
      e.stopPropagation();

      if (isDragging) {
        const {
          scrollHeight: timelineHeight,
          clientHeight: visibleTimelineHeight,
          scrollTop: scrolled,
          offsetTop: timelineTop,
        } = timelineRef.current;

        const segmentHeight =
          timelineHeight / (timelineDuration / segmentDuration);

        const getCumulativeScrollTop = (element: HTMLElement | null) => {
          let scrollTop = 0;
          while (element) {
            scrollTop += element.scrollTop;
            element = element.parentElement;
          }
          return scrollTop;
        };

        const parentScrollTop = getCumulativeScrollTop(timelineRef.current);

        const newHandlePosition = Math.min(
          visibleTimelineHeight - timelineTop + parentScrollTop,
          Math.max(
            segmentHeight + scrolled,
            e.clientY - timelineTop + parentScrollTop
          )
        );

        const segmentIndex = Math.floor(newHandlePosition / segmentHeight);
        const segmentStartTime = alignStartDateToTimeline(
          timelineStart - segmentIndex * segmentDuration
        );

        if (showHandlebar) {
          const thumb = scrollTimeRef.current;
          requestAnimationFrame(() => {
            thumb.style.top = `${newHandlePosition - segmentHeight}px`;
            if (currentTimeRef.current) {
              currentTimeRef.current.textContent = new Date(
                segmentStartTime * 1000
              ).toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
                ...(segmentDuration < 60 && { second: "2-digit" }),
              });
            }
          });
          if (setHandlebarTime) {
            setHandlebarTime(
              timelineStart -
                (newHandlePosition / segmentHeight) * segmentDuration
            );
          }
        }
      }
    },
    [
      isDragging,
      contentRef,
      segmentDuration,
      showHandlebar,
      timelineDuration,
      timelineStart,
    ]
  );

  useEffect(() => {
    // TODO: determine when we want to do this
    const handlebar = scrollTimeRef.current;
    if (handlebar && showHandlebar) {
      handlebar.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
    }
  }, []);

  return { handleMouseDown, handleMouseUp, handleMouseMove };
}

export default useDraggableHandler;
