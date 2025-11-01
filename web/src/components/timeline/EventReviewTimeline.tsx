import React, {
  useEffect,
  useMemo,
  useRef,
  RefObject,
  useCallback,
} from "react";
import { useTimelineUtils } from "@/hooks/use-timeline-utils";
import {
  ReviewSegment,
  ReviewSeverity,
  TimelineZoomDirection,
  ZoomLevel,
} from "@/types/review";
import ReviewTimeline from "./ReviewTimeline";
import {
  VirtualizedEventSegments,
  VirtualizedEventSegmentsRef,
} from "./VirtualizedEventSegments";

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
  isZooming: boolean;
  zoomDirection: TimelineZoomDirection;
  dense?: boolean;
  onZoomChange?: (newZoomLevel: number) => void;
  possibleZoomLevels?: ZoomLevel[];
  currentZoomLevel?: number;
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
  isZooming,
  zoomDirection,
  dense = false,
  onZoomChange,
  possibleZoomLevels,
  currentZoomLevel,
}: EventReviewTimelineProps) {
  const internalTimelineRef = useRef<HTMLDivElement>(null);
  const selectedTimelineRef = timelineRef || internalTimelineRef;
  const virtualizedSegmentsRef = useRef<VirtualizedEventSegmentsRef>(null);

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

  // Generate segment times for the timeline
  const segmentTimes = useMemo(() => {
    const segmentCount = Math.ceil(timelineDuration / segmentDuration);
    return Array.from(
      { length: segmentCount },
      (_, index) => timelineStartAligned - index * segmentDuration,
    );
  }, [timelineDuration, segmentDuration, timelineStartAligned]);

  useEffect(() => {
    if (
      visibleTimestamps &&
      visibleTimestamps.length > 0 &&
      !showMinimap &&
      virtualizedSegmentsRef.current
    ) {
      const alignedVisibleTimestamps = visibleTimestamps.map(
        alignStartDateToTimeline,
      );

      scrollToSegment(Math.max(...alignedVisibleTimestamps), true);
    }
    // don't scroll when segments update from unreviewed -> reviewed
    // we know that these deps are correct
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    selectedTimelineRef,
    showMinimap,
    alignStartDateToTimeline,
    visibleTimestamps,
    segmentDuration,
  ]);

  const scrollToSegment = useCallback(
    (segmentTime: number, ifNeeded?: boolean, behavior?: ScrollBehavior) => {
      if (virtualizedSegmentsRef.current) {
        virtualizedSegmentsRef.current.scrollToSegment(
          segmentTime,
          ifNeeded,
          behavior,
        );
      }
    },
    [],
  );

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
      segments={segmentTimes}
      scrollToSegment={scrollToSegment}
      isZooming={isZooming}
      zoomDirection={zoomDirection}
      onZoomChange={onZoomChange}
      possibleZoomLevels={possibleZoomLevels}
      currentZoomLevel={currentZoomLevel}
    >
      <VirtualizedEventSegments
        ref={virtualizedSegmentsRef}
        timelineRef={selectedTimelineRef}
        segments={segmentTimes}
        events={events}
        segmentDuration={segmentDuration}
        timestampSpread={timestampSpread}
        showMinimap={showMinimap}
        minimapStartTime={minimapStartTime}
        minimapEndTime={minimapEndTime}
        severityType={severityType}
        contentRef={contentRef}
        setHandlebarTime={setHandlebarTime}
        dense={dense}
        alignStartDateToTimeline={alignStartDateToTimeline}
      />
    </ReviewTimeline>
  );
}

export default EventReviewTimeline;
