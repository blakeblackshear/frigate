import { useCallback, useEffect } from "react";
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
  timelineStart: number;
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
  timelineStart,
  isDragging,
  setIsDragging,
}: DragHandlerProps) {
  const handleMouseDown = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(true);
    },
    [setIsDragging],
  );

  const handleMouseUp = useCallback(
    (e: MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (isDragging) {
        setIsDragging(false);
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
    (newHandlePosition: number, segmentStartTime: number) => {
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
              ...(segmentDuration < 60 && { second: "2-digit" }),
            });
            scrollIntoView(thumb, {
              scrollMode: "if-needed",
              behavior: "smooth",
            });
          }
        });
        if (setHandlebarTime) {
          setHandlebarTime(segmentStartTime);
        }
      }
    },
    [segmentDuration, handlebarTimeRef, scrollTimeRef, setHandlebarTime],
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

      if (showHandlebar && isDragging) {
        const {
          scrollHeight: timelineHeight,
          clientHeight: visibleTimelineHeight,
          scrollTop: scrolled,
          offsetTop: timelineTop,
        } = timelineRef.current;

        const segmentHeight =
          timelineHeight / (timelineDuration / segmentDuration);

        const parentScrollTop = getCumulativeScrollTop(timelineRef.current);

        const newHandlePosition = Math.min(
          visibleTimelineHeight - timelineTop + parentScrollTop,
          Math.max(
            segmentHeight + scrolled,
            e.clientY - timelineTop + parentScrollTop,
          ),
        );

        const segmentIndex = Math.floor(newHandlePosition / segmentHeight);
        const segmentStartTime = alignStartDateToTimeline(
          timelineStart - segmentIndex * segmentDuration,
        );

        updateHandlebarPosition(
          newHandlePosition - segmentHeight,
          segmentStartTime,
        );
      }
    },
    // we know that these deps are correct
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [
      isDragging,
      contentRef,
      segmentDuration,
      showHandlebar,
      timelineDuration,
      timelineStart,
      updateHandlebarPosition,
      alignStartDateToTimeline,
      getCumulativeScrollTop,
    ],
  );

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
        ((timelineStart - handlebarTime) / segmentDuration) * segmentHeight +
        parentScrollTop -
        scrolled;

      updateHandlebarPosition(newHandlePosition - segmentHeight, handlebarTime);
    }
    // we know that these deps are correct
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [handlebarTime, showHandlebar, scrollTimeRef, timelineStart]);

  return { handleMouseDown, handleMouseUp, handleMouseMove };
}

export default useDraggableHandler;
