import useDraggableHandler from "@/hooks/use-handle-dragging";
import {
  useEffect,
  useCallback,
  useMemo,
  useRef,
  useState,
  RefObject,
} from "react";
import EventSegment from "./EventSegment";
import { useEventUtils } from "@/hooks/use-event-utils";
import { ReviewSegment, ReviewSeverity } from "@/types/review";

export type EventReviewTimelineProps = {
  segmentDuration: number;
  timestampSpread: number;
  timelineStart: number;
  timelineEnd: number;
  showHandlebar?: boolean;
  handlebarTime?: number;
  setHandlebarTime?: React.Dispatch<React.SetStateAction<number>>;
  showMinimap?: boolean;
  minimapStartTime?: number;
  minimapEndTime?: number;
  events: ReviewSegment[];
  severityType: ReviewSeverity;
  contentRef: RefObject<HTMLDivElement>;
  onHandlebarDraggingChange?: (isDragging: boolean) => void;
};

export function EventReviewTimeline({
  segmentDuration,
  timestampSpread,
  timelineStart,
  timelineEnd,
  showHandlebar = false,
  handlebarTime,
  setHandlebarTime,
  showMinimap = false,
  minimapStartTime,
  minimapEndTime,
  events,
  severityType,
  contentRef,
  onHandlebarDraggingChange,
}: EventReviewTimelineProps) {
  const [isDragging, setIsDragging] = useState(false);
  const scrollTimeRef = useRef<HTMLDivElement>(null);
  const timelineRef = useRef<HTMLDivElement>(null);
  const handlebarTimeRef = useRef<HTMLDivElement>(null);
  const observer = useRef<ResizeObserver | null>(null);
  const timelineDuration = useMemo(
    () => timelineStart - timelineEnd,
    [timelineEnd, timelineStart],
  );

  const { alignStartDateToTimeline, alignEndDateToTimeline } = useEventUtils(
    events,
    segmentDuration,
  );

  const { handleMouseDown, handleMouseUp, handleMouseMove } =
    useDraggableHandler({
      contentRef,
      timelineRef,
      scrollTimeRef,
      alignStartDateToTimeline,
      alignEndDateToTimeline,
      segmentDuration,
      showHandlebar,
      handlebarTime,
      setHandlebarTime,
      timelineDuration,
      timelineStart,
      isDragging,
      setIsDragging,
      handlebarTimeRef,
    });

  function handleResize() {
    // TODO: handle screen resize for mobile
    // eslint-disable-next-line no-empty
    if (timelineRef.current && contentRef.current) {
    }
  }

  useEffect(() => {
    if (contentRef.current) {
      const content = contentRef.current;
      observer.current = new ResizeObserver(() => {
        handleResize();
      });
      observer.current.observe(content);
      return () => {
        observer.current?.unobserve(content);
      };
    }
    // should only be calculated at beginning
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Generate segments for the timeline
  const generateSegments = useCallback(() => {
    const segmentCount = timelineDuration / segmentDuration;
    const segmentAlignedTime = alignStartDateToTimeline(timelineStart);

    return Array.from({ length: segmentCount }, (_, index) => {
      const segmentTime = segmentAlignedTime - index * segmentDuration;

      return (
        <EventSegment
          key={segmentTime + severityType}
          events={events}
          segmentDuration={segmentDuration}
          segmentTime={segmentTime}
          timestampSpread={timestampSpread}
          showMinimap={showMinimap}
          minimapStartTime={minimapStartTime}
          minimapEndTime={minimapEndTime}
          severityType={severityType}
          contentRef={contentRef}
        />
      );
    });
    // we know that these deps are correct
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    segmentDuration,
    timestampSpread,
    timelineStart,
    timelineDuration,
    showMinimap,
    minimapStartTime,
    minimapEndTime,
    events,
  ]);

  const segments = useMemo(
    () => generateSegments(),
    // we know that these deps are correct
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [
      segmentDuration,
      timestampSpread,
      timelineStart,
      timelineDuration,
      showMinimap,
      minimapStartTime,
      minimapEndTime,
      events,
    ],
  );

  useEffect(() => {
    if (onHandlebarDraggingChange) {
      onHandlebarDraggingChange(isDragging);
    }
  }, [isDragging, onHandlebarDraggingChange]);

  return (
    <div
      ref={timelineRef}
      onMouseMove={handleMouseMove}
      onTouchMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onTouchEnd={handleMouseUp}
      className={`relative h-full overflow-y-scroll no-scrollbar bg-secondary ${
        isDragging && showHandlebar ? "cursor-grabbing" : "cursor-auto"
      }`}
    >
      <div className="flex flex-col">{segments}</div>
      {showHandlebar && (
        <div className={`absolute left-0 top-0 z-20 w-full `} role="scrollbar">
          <div
            className="flex items-center justify-center touch-none select-none"
            onMouseDown={handleMouseDown}
            onTouchStart={handleMouseDown}
          >
            <div
              ref={scrollTimeRef}
              className={`relative w-full ${
                isDragging ? "cursor-grabbing" : "cursor-grab"
              }`}
            >
              <div
                className={`bg-destructive rounded-full mx-auto ${
                  segmentDuration < 60 ? "w-16 md:w-20" : "w-12 md:w-16"
                } h-5 flex items-center justify-center`}
              >
                <div
                  ref={handlebarTimeRef}
                  className="text-white text-[8px] md:text-xs z-10"
                ></div>
              </div>
              <div className="absolute h-1 w-full bg-destructive top-1/2 transform -translate-y-1/2"></div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default EventReviewTimeline;
