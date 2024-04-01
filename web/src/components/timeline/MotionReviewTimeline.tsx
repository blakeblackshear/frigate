import { useEffect, useCallback, useMemo, useRef, RefObject } from "react";
import MotionSegment from "./MotionSegment";
import { useTimelineUtils } from "@/hooks/use-timeline-utils";
import { MotionData, ReviewSegment, ReviewSeverity } from "@/types/review";
import ReviewTimeline from "./ReviewTimeline";
import { isDesktop } from "react-device-detect";
import { useMotionSegmentUtils } from "@/hooks/use-motion-segment-utils";

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
  severityType: ReviewSeverity;
  contentRef: RefObject<HTMLDivElement>;
  timelineRef?: RefObject<HTMLDivElement>;
  onHandlebarDraggingChange?: (isDragging: boolean) => void;
  dense?: boolean;
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
  contentRef,
  timelineRef,
  onHandlebarDraggingChange,
  dense = false,
}: MotionReviewTimelineProps) {
  const internalTimelineRef = useRef<HTMLDivElement>(null);
  const selectedTimelineRef = timelineRef || internalTimelineRef;

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

  // Generate segments for the timeline
  const generateSegments = useCallback(() => {
    const segments = [];
    let segmentTime = timelineStartAligned;

    while (segmentTime >= timelineStartAligned - timelineDuration) {
      const motionStart = segmentTime;
      const motionEnd = motionStart + segmentDuration;

      const firstHalfMotionValue = getMotionSegmentValue(motionStart);
      const secondHalfMotionValue = getMotionSegmentValue(
        motionStart + segmentDuration / 2,
      );

      const segmentMotion =
        firstHalfMotionValue > 0 || secondHalfMotionValue > 0;
      const overlappingReviewItems = events.some(
        (item) =>
          (item.start_time >= motionStart && item.start_time < motionEnd) ||
          (item.end_time > motionStart && item.end_time <= motionEnd) ||
          (item.start_time <= motionStart && item.end_time >= motionEnd),
      );

      if ((!segmentMotion || overlappingReviewItems) && motionOnly) {
        // exclude segment if necessary when in motion only mode
        segmentTime -= segmentDuration;
        continue;
      }

      segments.push(
        <MotionSegment
          key={segmentTime}
          events={events}
          firstHalfMotionValue={firstHalfMotionValue}
          secondHalfMotionValue={secondHalfMotionValue}
          segmentDuration={segmentDuration}
          segmentTime={segmentTime}
          timestampSpread={timestampSpread}
          motionOnly={motionOnly}
          showMinimap={showMinimap}
          minimapStartTime={minimapStartTime}
          minimapEndTime={minimapEndTime}
          setHandlebarTime={setHandlebarTime}
          dense={dense}
        />,
      );
      segmentTime -= segmentDuration;
    }
    return segments;
    // we know that these deps are correct
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    segmentDuration,
    timestampSpread,
    timelineStartAligned,
    timelineDuration,
    showMinimap,
    minimapStartTime,
    minimapEndTime,
    events,
    motion_events,
    motionOnly,
  ]);

  const segments = useMemo(
    () => generateSegments(),
    // we know that these deps are correct
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [
      segmentDuration,
      timestampSpread,
      timelineStartAligned,
      timelineDuration,
      showMinimap,
      minimapStartTime,
      minimapEndTime,
      events,
      motion_events,
      motionOnly,
    ],
  );

  const segmentsObserver = useRef<IntersectionObserver | null>(null);
  useEffect(() => {
    if (selectedTimelineRef.current && segments && isDesktop) {
      segmentsObserver.current = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              const segmentId = entry.target.getAttribute("data-segment-id");

              const segmentElements =
                internalTimelineRef.current?.querySelectorAll(
                  `[data-segment-id="${segmentId}"] .motion-segment`,
                );
              segmentElements?.forEach((segmentElement) => {
                segmentElement.classList.remove("hidden");
                segmentElement.classList.add("animate-in");
              });
            }
          });
        },
        { threshold: 0 },
      );

      // Get all segment divs and observe each one
      const segmentDivs =
        selectedTimelineRef.current.querySelectorAll(".segment.has-data");
      segmentDivs.forEach((segmentDiv) => {
        segmentsObserver.current?.observe(segmentDiv);
      });
    }

    return () => {
      segmentsObserver.current?.disconnect();
    };
  }, [selectedTimelineRef, segments]);

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
    >
      {segments}
    </ReviewTimeline>
  );
}

export default MotionReviewTimeline;
