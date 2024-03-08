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
import ReviewTimeline from "./ReviewTimeline";

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
  const timelineDuration = useMemo(
    () => timelineStart - timelineEnd,
    [timelineEnd, timelineStart],
  );

  const { alignStartDateToTimeline, alignEndDateToTimeline } = useEventUtils(
    events,
    segmentDuration,
  );

  const timelineStartAligned = useMemo(
    () => alignStartDateToTimeline(timelineStart),
    [timelineStart, alignStartDateToTimeline],
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
      timelineStartAligned,
      isDragging,
      setIsDragging,
      handlebarTimeRef,
    });

  // Generate segments for the timeline
  const generateSegments = useCallback(() => {
    const segmentCount = timelineDuration / segmentDuration;

    return Array.from({ length: segmentCount }, (_, index) => {
      const segmentTime = timelineStartAligned - index * segmentDuration;

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
          setHandlebarTime={setHandlebarTime}
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
    <ReviewTimeline
      timelineRef={timelineRef}
      scrollTimeRef={scrollTimeRef}
      handlebarTimeRef={handlebarTimeRef}
      handleMouseMove={handleMouseMove}
      handleMouseUp={handleMouseUp}
      handleMouseDown={handleMouseDown}
      segmentDuration={segmentDuration}
      showHandlebar={showHandlebar}
      isDragging={isDragging}
    >
      {segments}
    </ReviewTimeline>
  );
}

export default EventReviewTimeline;
