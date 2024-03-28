import { useEffect, useCallback, useMemo, useRef, RefObject } from "react";
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
  dense?: boolean;
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
  dense = false,
}: EventReviewTimelineProps) {
  const internalTimelineRef = useRef<HTMLDivElement>(null);
  const selectedTimelineRef = timelineRef || internalTimelineRef;

  const timelineDuration = useMemo(
    () => timelineStart - timelineEnd,
    [timelineEnd, timelineStart],
  );

  const { alignStartDateToTimeline } = useTimelineUtils({
    segmentDuration,
    timelineDuration,
    timelineRef: selectedTimelineRef,
  });

  const timelineStartAligned = useMemo(
    () => alignStartDateToTimeline(timelineStart),
    [timelineStart, alignStartDateToTimeline],
  );

  // Generate segments for the timeline
  const generateSegments = useCallback(() => {
    const segmentCount = Math.ceil(timelineDuration / segmentDuration);

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
          dense={dense}
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
      if (element) {
        scrollIntoView(element, {
          scrollMode: "if-needed",
          behavior: "smooth",
        });
      }
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
      contentRef={contentRef}
      segmentDuration={segmentDuration}
      timelineDuration={timelineDuration}
      timelineStartAligned={timelineStartAligned}
      showHandlebar={showHandlebar}
      onHandlebarDraggingChange={onHandlebarDraggingChange}
      showExportHandles={showExportHandles}
      handlebarTime={handlebarTime}
      setHandlebarTime={setHandlebarTime}
      exportStartTime={exportStartTime}
      exportEndTime={exportEndTime}
      setExportStartTime={setExportStartTime}
      setExportEndTime={setExportEndTime}
      dense={dense}
    >
      {segments}
    </ReviewTimeline>
  );
}

export default EventReviewTimeline;
