import useDraggableElement from "@/hooks/use-draggable-element";
import {
  useEffect,
  useCallback,
  useMemo,
  useRef,
  useState,
  RefObject,
} from "react";
import MotionSegment from "./MotionSegment";
import { useTimelineUtils } from "@/hooks/use-timeline-utils";
import { MotionData, ReviewSegment, ReviewSeverity } from "@/types/review";
import ReviewTimeline from "./ReviewTimeline";
import { isDesktop } from "react-device-detect";

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
}: MotionReviewTimelineProps) {
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

  const timelineDuration = useMemo(
    () => timelineStart - timelineEnd + 4 * segmentDuration,
    [timelineEnd, timelineStart, segmentDuration],
  );

  const { alignStartDateToTimeline, alignEndDateToTimeline } = useTimelineUtils(
    {
      segmentDuration,
      timelineDuration,
    },
  );

  const timelineStartAligned = useMemo(
    () => alignStartDateToTimeline(timelineStart) + 2 * segmentDuration,
    [timelineStart, alignStartDateToTimeline, segmentDuration],
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
    timelineRef: timelineRef || internalTimelineRef,
    draggableElementRef: handlebarRef,
    segmentDuration,
    showDraggableElement: showHandlebar,
    draggableElementTime: handlebarTime,
    setDraggableElementTime: setHandlebarTime,
    initialScrollIntoViewOnly: onlyInitialHandlebarScroll,
    timelineDuration,
    timelineCollapsed: motionOnly,
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
    timelineRef: timelineRef || internalTimelineRef,
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
    timelineRef: timelineRef || internalTimelineRef,
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
        <MotionSegment
          key={segmentTime}
          events={events}
          motion_events={motion_events}
          segmentDuration={segmentDuration}
          segmentTime={segmentTime}
          timestampSpread={timestampSpread}
          motionOnly={motionOnly}
          showMinimap={showMinimap}
          minimapStartTime={minimapStartTime}
          minimapEndTime={minimapEndTime}
          setHandlebarTime={setHandlebarTime}
        />
      );
    });
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

  useEffect(() => {
    if (onHandlebarDraggingChange) {
      onHandlebarDraggingChange(isDragging);
    }
  }, [isDragging, onHandlebarDraggingChange]);

  const segmentsObserver = useRef<IntersectionObserver | null>(null);
  const selectedTimelineRef = timelineRef || internalTimelineRef;
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
      timelineRef={timelineRef || internalTimelineRef}
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

export default MotionReviewTimeline;
