import useDraggableElement from "@/hooks/use-draggable-element";
import {
  useEffect,
  useCallback,
  useMemo,
  useRef,
  useState,
  RefObject,
} from "react";
import EventSegment from "./EventSegment";
import { useTimelineUtils } from "@/hooks/use-timeline-utils";
import { ReviewSegment, ReviewSeverity } from "@/types/review";
import ReviewTimeline from "./ReviewTimeline";
import scrollIntoView from "scroll-into-view-if-needed";

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
  showExportHandles?: boolean;
  exportStartTime?: number;
  exportEndTime?: number;
  setExportStartTime?: React.Dispatch<React.SetStateAction<number>>;
  setExportEndTime?: React.Dispatch<React.SetStateAction<number>>;
  events: ReviewSegment[];
  visibleTimestamps?: number[];
  severityType: ReviewSeverity;
  timelineRef?: RefObject<HTMLDivElement>;
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
  showExportHandles = false,
  exportStartTime,
  exportEndTime,
  setExportStartTime,
  setExportEndTime,
  events,
  visibleTimestamps,
  severityType,
  timelineRef,
  contentRef,
  onHandlebarDraggingChange,
}: EventReviewTimelineProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [exportStartPosition, setExportStartPosition] = useState(0);
  const [exportEndPosition, setExportEndPosition] = useState(0);

  const internalTimelineRef = useRef<HTMLDivElement>(null);
  const handlebarRef = useRef<HTMLDivElement>(null);
  const handlebarTimeRef = useRef<HTMLDivElement>(null);
  const exportStartRef = useRef<HTMLDivElement>(null);
  const exportStartTimeRef = useRef<HTMLDivElement>(null);
  const exportEndRef = useRef<HTMLDivElement>(null);
  const exportEndTimeRef = useRef<HTMLDivElement>(null);
  const selectedTimelineRef = timelineRef || internalTimelineRef;

  const timelineDuration = useMemo(
    () => timelineStart - timelineEnd,
    [timelineEnd, timelineStart],
  );

  const { alignStartDateToTimeline, alignEndDateToTimeline } = useTimelineUtils(
    {
      segmentDuration,
      timelineDuration,
      timelineRef: selectedTimelineRef,
    },
  );

  const timelineStartAligned = useMemo(
    () => alignStartDateToTimeline(timelineStart),
    [timelineStart, alignStartDateToTimeline],
  );

  const paddedExportStartTime = useMemo(() => {
    if (exportStartTime) {
      return alignStartDateToTimeline(exportStartTime) + segmentDuration;
    }
  }, [exportStartTime, segmentDuration, alignStartDateToTimeline]);

  const paddedExportEndTime = useMemo(() => {
    if (exportEndTime) {
      return alignEndDateToTimeline(exportEndTime) - segmentDuration * 2;
    }
  }, [exportEndTime, segmentDuration, alignEndDateToTimeline]);

  const {
    handleMouseDown: handlebarMouseDown,
    handleMouseUp: handlebarMouseUp,
    handleMouseMove: handlebarMouseMove,
  } = useDraggableElement({
    contentRef,
    timelineRef: selectedTimelineRef,
    draggableElementRef: handlebarRef,
    segmentDuration,
    showDraggableElement: showHandlebar,
    draggableElementTime: handlebarTime,
    setDraggableElementTime: setHandlebarTime,
    timelineDuration,
    timelineStartAligned,
    isDragging,
    setIsDragging,
    draggableElementTimeRef: handlebarTimeRef,
  });

  const {
    handleMouseDown: exportStartMouseDown,
    handleMouseUp: exportStartMouseUp,
    handleMouseMove: exportStartMouseMove,
  } = useDraggableElement({
    contentRef,
    timelineRef: selectedTimelineRef,
    draggableElementRef: exportStartRef,
    segmentDuration,
    showDraggableElement: showExportHandles,
    draggableElementTime: exportStartTime,
    draggableElementLatestTime: paddedExportEndTime,
    setDraggableElementTime: setExportStartTime,
    timelineDuration,
    timelineStartAligned,
    isDragging,
    setIsDragging,
    draggableElementTimeRef: exportStartTimeRef,
    setDraggableElementPosition: setExportStartPosition,
  });

  const {
    handleMouseDown: exportEndMouseDown,
    handleMouseUp: exportEndMouseUp,
    handleMouseMove: exportEndMouseMove,
  } = useDraggableElement({
    contentRef,
    timelineRef: selectedTimelineRef,
    draggableElementRef: exportEndRef,
    segmentDuration,
    showDraggableElement: showExportHandles,
    draggableElementTime: exportEndTime,
    draggableElementEarliestTime: paddedExportStartTime,
    setDraggableElementTime: setExportEndTime,
    timelineDuration,
    timelineStartAligned,
    isDragging,
    setIsDragging,
    draggableElementTimeRef: exportEndTimeRef,
    setDraggableElementPosition: setExportEndPosition,
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

  useEffect(() => {
    if (
      selectedTimelineRef.current &&
      segments &&
      visibleTimestamps &&
      visibleTimestamps?.length > 0 &&
      !showMinimap
    ) {
      const alignedVisibleTimestamps = visibleTimestamps.map(
        alignStartDateToTimeline,
      );
      const element = selectedTimelineRef.current?.querySelector(
        `[data-segment-id="${Math.max(...alignedVisibleTimestamps)}"]`,
      );
      scrollIntoView(element as HTMLDivElement, {
        scrollMode: "if-needed",
        behavior: "smooth",
      });
    }
  }, [
    selectedTimelineRef,
    segments,
    showMinimap,
    alignStartDateToTimeline,
    visibleTimestamps,
  ]);

  return (
    <ReviewTimeline
      timelineRef={selectedTimelineRef}
      handlebarRef={handlebarRef}
      handlebarTimeRef={handlebarTimeRef}
      handlebarMouseMove={handlebarMouseMove}
      handlebarMouseUp={handlebarMouseUp}
      handlebarMouseDown={handlebarMouseDown}
      segmentDuration={segmentDuration}
      timelineDuration={timelineDuration}
      showHandlebar={showHandlebar}
      isDragging={isDragging}
      exportStartMouseMove={exportStartMouseMove}
      exportStartMouseUp={exportStartMouseUp}
      exportStartMouseDown={exportStartMouseDown}
      exportEndMouseMove={exportEndMouseMove}
      exportEndMouseUp={exportEndMouseUp}
      exportEndMouseDown={exportEndMouseDown}
      showExportHandles={showExportHandles}
      exportStartRef={exportStartRef}
      exportStartTimeRef={exportStartTimeRef}
      exportEndRef={exportEndRef}
      exportEndTimeRef={exportEndTimeRef}
      exportStartPosition={exportStartPosition}
      exportEndPosition={exportEndPosition}
    >
      {segments}
    </ReviewTimeline>
  );
}

export default EventReviewTimeline;
