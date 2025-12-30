import React, {
  useCallback,
  useMemo,
  useRef,
  RefObject,
  useEffect,
} from "react";
import { useTimelineUtils } from "@/hooks/use-timeline-utils";
import {
  MotionData,
  ReviewSegment,
  TimelineZoomDirection,
  ZoomLevel,
} from "@/types/review";
import ReviewTimeline from "./ReviewTimeline";
import { useMotionSegmentUtils } from "@/hooks/use-motion-segment-utils";
import {
  VirtualizedMotionSegments,
  VirtualizedMotionSegmentsRef,
} from "./VirtualizedMotionSegments";
import { RecordingSegment } from "@/types/record";

export type MotionReviewTimelineProps = {
  segmentDuration: number;
  timestampSpread: number;
  timelineStart: number;
  timelineEnd: number;
  showHandlebar?: boolean;
  handlebarTime?: number;
  setHandlebarTime?: React.Dispatch<React.SetStateAction<number>>;
  onlyInitialHandlebarScroll?: boolean;
  motionOnly?: boolean;
  showMinimap?: boolean;
  minimapStartTime?: number;
  minimapEndTime?: number;
  showExportHandles?: boolean;
  exportStartTime?: number;
  exportEndTime?: number;
  setExportStartTime?: React.Dispatch<React.SetStateAction<number>>;
  setExportEndTime?: React.Dispatch<React.SetStateAction<number>>;
  events: ReviewSegment[];
  motion_events: MotionData[];
  noRecordingRanges?: RecordingSegment[];
  contentRef: RefObject<HTMLDivElement>;
  timelineRef?: RefObject<HTMLDivElement>;
  onHandlebarDraggingChange?: (isDragging: boolean) => void;
  dense?: boolean;
  isZooming: boolean;
  zoomDirection: TimelineZoomDirection;
  alwaysShowMotionLine?: boolean;
  onZoomChange?: (newZoomLevel: number) => void;
  possibleZoomLevels?: ZoomLevel[];
  currentZoomLevel?: number;
};

export function MotionReviewTimeline({
  segmentDuration,
  timestampSpread,
  timelineStart,
  timelineEnd,
  showHandlebar = false,
  handlebarTime,
  setHandlebarTime,
  onlyInitialHandlebarScroll = false,
  motionOnly = false,
  showMinimap = false,
  minimapStartTime,
  minimapEndTime,
  showExportHandles = false,
  exportStartTime,
  exportEndTime,
  setExportStartTime,
  setExportEndTime,
  events,
  motion_events,
  noRecordingRanges,
  contentRef,
  timelineRef,
  onHandlebarDraggingChange,
  dense = false,
  isZooming,
  zoomDirection,
  alwaysShowMotionLine = false,
  onZoomChange,
  possibleZoomLevels,
  currentZoomLevel,
}: MotionReviewTimelineProps) {
  const internalTimelineRef = useRef<HTMLDivElement>(null);
  const selectedTimelineRef = timelineRef || internalTimelineRef;
  const virtualizedSegmentsRef = useRef<VirtualizedMotionSegmentsRef>(null);

  const timelineDuration = useMemo(
    () => timelineStart - timelineEnd + 4 * segmentDuration,
    [timelineEnd, timelineStart, segmentDuration],
  );

  const { alignStartDateToTimeline } = useTimelineUtils({
    segmentDuration,
    timelineDuration,
  });

  const timelineStartAligned = useMemo(
    () => alignStartDateToTimeline(timelineStart) + 2 * segmentDuration,
    [timelineStart, alignStartDateToTimeline, segmentDuration],
  );

  const { getMotionSegmentValue } = useMotionSegmentUtils(
    segmentDuration,
    motion_events,
  );

  const getRecordingAvailability = useCallback(
    (time: number): boolean | undefined => {
      if (noRecordingRanges == undefined) return undefined;

      return !noRecordingRanges.some(
        (range) => time >= range.start_time && time < range.end_time,
      );
    },
    [noRecordingRanges],
  );

  const segmentTimes = useMemo(() => {
    const segments = [];
    let segmentTime = timelineStartAligned;

    for (let i = 0; i < Math.ceil(timelineDuration / segmentDuration); i++) {
      if (!motionOnly) {
        segments.push(segmentTime);
      } else {
        const motionStart = segmentTime;
        const motionEnd = motionStart + segmentDuration;
        const overlappingReviewItems = events.some(
          (item) =>
            (item.start_time >= motionStart && item.start_time < motionEnd) ||
            ((item.end_time ?? timelineStart) > motionStart &&
              (item.end_time ?? timelineStart) <= motionEnd) ||
            (item.start_time <= motionStart &&
              (item.end_time ?? timelineStart) >= motionEnd),
        );
        const firstHalfMotionValue = getMotionSegmentValue(motionStart);
        const secondHalfMotionValue = getMotionSegmentValue(
          motionStart + segmentDuration / 2,
        );

        const segmentMotion =
          firstHalfMotionValue > 0 || secondHalfMotionValue > 0;
        if (segmentMotion && !overlappingReviewItems) {
          segments.push(segmentTime);
        }
      }
      segmentTime -= segmentDuration;
    }

    return segments;
  }, [
    timelineStartAligned,
    segmentDuration,
    timelineDuration,
    motionOnly,
    getMotionSegmentValue,
    events,
    timelineStart,
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

  // keep handlebar centered when zooming
  useEffect(() => {
    setTimeout(() => {
      scrollToSegment(
        alignStartDateToTimeline(handlebarTime ?? timelineStart),
        true,
        "auto",
      );
    }, 0);
    // we only want to scroll when zooming level changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [segmentDuration]);

  return (
    <ReviewTimeline
      timelineRef={selectedTimelineRef}
      contentRef={contentRef}
      segmentDuration={segmentDuration}
      timelineDuration={timelineDuration}
      timelineStartAligned={timelineStartAligned}
      showHandlebar={showHandlebar}
      onHandlebarDraggingChange={onHandlebarDraggingChange}
      onlyInitialHandlebarScroll={onlyInitialHandlebarScroll}
      showExportHandles={showExportHandles}
      handlebarTime={handlebarTime}
      setHandlebarTime={setHandlebarTime}
      exportStartTime={exportStartTime}
      exportEndTime={exportEndTime}
      setExportStartTime={setExportStartTime}
      setExportEndTime={setExportEndTime}
      timelineCollapsed={motionOnly}
      dense={dense}
      segments={segmentTimes}
      scrollToSegment={scrollToSegment}
      isZooming={isZooming}
      zoomDirection={zoomDirection}
      getRecordingAvailability={getRecordingAvailability}
      onZoomChange={onZoomChange}
      possibleZoomLevels={possibleZoomLevels}
      currentZoomLevel={currentZoomLevel}
    >
      <VirtualizedMotionSegments
        ref={virtualizedSegmentsRef}
        timelineRef={selectedTimelineRef}
        segments={segmentTimes}
        events={events}
        motion_events={motion_events}
        segmentDuration={segmentDuration}
        timestampSpread={timestampSpread}
        showMinimap={showMinimap}
        minimapStartTime={minimapStartTime}
        minimapEndTime={minimapEndTime}
        contentRef={contentRef}
        setHandlebarTime={setHandlebarTime}
        dense={dense}
        motionOnly={motionOnly}
        getMotionSegmentValue={getMotionSegmentValue}
        getRecordingAvailability={getRecordingAvailability}
        alwaysShowMotionLine={alwaysShowMotionLine}
      />
    </ReviewTimeline>
  );
}

export default MotionReviewTimeline;
