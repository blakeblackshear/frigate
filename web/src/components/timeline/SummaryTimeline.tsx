import React, {
  useRef,
  useState,
  useMemo,
  useCallback,
  useEffect,
} from "react";
import { SummarySegment } from "./SummarySegment";
import {
  ConsolidatedSegmentData,
  MotionData,
  ReviewSegment,
  ReviewSeverity,
} from "@/types/review";
import { useTimelineUtils } from "@/hooks/use-timeline-utils";
import { cn } from "@/lib/utils";
import { isMobile } from "react-device-detect";

const MIN_BOX_HEIGHT = isMobile ? 20 : 12;
const DRAG_THRESHOLD = 4;

export type SummaryTimelineProps = {
  reviewTimelineRef: React.RefObject<HTMLDivElement | null>;
  timelineStart: number;
  timelineEnd: number;
  segmentDuration: number;
  events?: ReviewSegment[];
  severityType?: ReviewSeverity;
  motionData?: MotionData[];
  motionScale?: number;
};

export function SummaryTimeline({
  reviewTimelineRef,
  timelineStart,
  timelineEnd,
  segmentDuration,
  events = [],
  severityType,
  motionData,
  motionScale,
}: SummaryTimelineProps) {
  const summaryTimelineRef = useRef<HTMLDivElement>(null);
  const visibleSectionRef = useRef<HTMLDivElement>(null);
  const motionCanvasRef = useRef<HTMLCanvasElement>(null);

  const [isDragging, setIsDragging] = useState(false);
  const dragRef = useRef<{
    startY: number;
    startScrollTop: number;
    insideBox: boolean;
    moved: boolean;
  } | null>(null);

  const observer = useRef<ResizeObserver | null>(null);

  const reviewTimelineDuration = useMemo(
    () => timelineStart - timelineEnd + 4 * segmentDuration,
    [timelineEnd, timelineStart, segmentDuration],
  );

  const { alignStartDateToTimeline, alignEndDateToTimeline } = useTimelineUtils(
    {
      segmentDuration,
      timelineDuration: reviewTimelineDuration,
      timelineRef: reviewTimelineRef,
    },
  );

  const consolidatedSegments = useMemo(() => {
    const filteredEvents = events.filter(
      (event) => event.severity === severityType,
    );

    const sortedEvents = filteredEvents.sort(
      (a, b) => a.start_time - b.start_time,
    );

    const consolidated: ConsolidatedSegmentData[] = [];

    let currentTime = alignEndDateToTimeline(timelineEnd);
    const timelineStartAligned = alignStartDateToTimeline(timelineStart);

    sortedEvents.forEach((event) => {
      const alignedStartTime = Math.max(
        alignStartDateToTimeline(event.start_time),
        currentTime,
      );
      const alignedEndTime = Math.min(
        event.end_time
          ? alignEndDateToTimeline(event.end_time)
          : alignedStartTime + segmentDuration,
        timelineStartAligned,
      );

      if (alignedStartTime < alignedEndTime) {
        if (alignedStartTime > currentTime) {
          consolidated.push({
            startTime: currentTime,
            endTime: alignedStartTime,
            severity: "empty",
            reviewed: false,
          });
        }

        consolidated.push({
          startTime: alignedStartTime,
          endTime: alignedEndTime,
          severity: event.severity,
          reviewed: event.has_been_reviewed,
        });

        currentTime = alignedEndTime;
      }
    });

    if (currentTime < timelineStartAligned) {
      consolidated.push({
        startTime: currentTime,
        endTime: timelineStartAligned,
        severity: "empty",
        reviewed: false,
      });
    }

    return consolidated.length > 0
      ? consolidated
      : [
          {
            startTime: alignEndDateToTimeline(timelineEnd),
            endTime: timelineStartAligned,
            severity: "empty" as const,
            reviewed: false,
          },
        ];
  }, [
    events,
    severityType,
    timelineStart,
    timelineEnd,
    alignStartDateToTimeline,
    alignEndDateToTimeline,
    segmentDuration,
  ]);

  // Each motion sample covers motionScale seconds with a 0-100 value, and
  // bins without motion are absent. Opacity is the bucket's mean value.

  const drawMotion = useCallback(() => {
    const canvas = motionCanvasRef.current;
    const ctx = canvas?.getContext("2d");

    if (!canvas || !ctx || !motionData || !motionScale) {
      return;
    }

    const { clientWidth: width, clientHeight: height } = canvas;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, width, height);

    const duration = timelineStart - timelineEnd;

    if (duration <= 0 || height <= 0) {
      return;
    }

    const rows = Math.max(
      1,
      Math.min(Math.floor(height), Math.ceil(duration / motionScale)),
    );
    const rowHeight = height / rows;
    const rowSeconds = duration / rows;
    const sums = new Array<number>(rows).fill(0);

    motionData.forEach((item) => {
      const row = Math.floor(
        ((timelineStart - item.start_time) / duration) * rows,
      );

      if (row >= 0 && row < rows) {
        sums[row] += item.motion ?? 0;
      }
    });

    const color = getComputedStyle(document.documentElement)
      .getPropertyValue("--severity_significant_motion")
      .trim();

    const samplesPerRow = rowSeconds / motionScale;

    sums.forEach((sum, row) => {
      if (sum == 0) {
        return;
      }

      const intensity = Math.min(1, sum / (100 * samplesPerRow));
      ctx.fillStyle = `hsl(${color} / ${intensity})`;
      ctx.fillRect(0, row * rowHeight, width, Math.ceil(rowHeight));
    });
  }, [motionData, motionScale, timelineStart, timelineEnd]);

  useEffect(() => {
    const canvas = motionCanvasRef.current;

    if (!canvas) {
      return;
    }

    drawMotion();
    const resizeObserver = new ResizeObserver(drawMotion);
    resizeObserver.observe(canvas);

    return () => resizeObserver.disconnect();
  }, [drawMotion]);

  const setVisibleSectionStyles = useCallback(() => {
    if (
      reviewTimelineRef.current &&
      summaryTimelineRef.current &&
      visibleSectionRef.current
    ) {
      const content = reviewTimelineRef.current;
      const summary = summaryTimelineRef.current;
      const {
        clientHeight: reviewTimelineVisibleHeight,
        scrollHeight: reviewTimelineFullHeight,
        scrollTop: scrolled,
      } = content;
      const { clientHeight: summaryTimelineVisibleHeight } = summary;

      // The box keeps a minimum height so it stays visible when zoomed in,
      // centered on the true visible range.

      const trueHeight =
        summaryTimelineVisibleHeight *
        (reviewTimelineVisibleHeight / reviewTimelineFullHeight);
      const trueTop =
        summaryTimelineVisibleHeight * (scrolled / reviewTimelineFullHeight);
      const height = Math.max(trueHeight, MIN_BOX_HEIGHT);
      const top = Math.min(
        Math.max(trueTop - (height - trueHeight) / 2, 0),
        summaryTimelineVisibleHeight - height,
      );

      visibleSectionRef.current.style.top = `${top}px`;
      visibleSectionRef.current.style.height = `${height}px`;
    }
  }, [reviewTimelineRef, summaryTimelineRef, visibleSectionRef]);

  useEffect(() => {
    if (reviewTimelineRef.current && summaryTimelineRef.current) {
      const content = reviewTimelineRef.current;

      const handleScroll = () => {
        setVisibleSectionStyles();
      };

      // Set initial styles
      setVisibleSectionStyles();

      observer.current = new ResizeObserver(() => {
        setVisibleSectionStyles();
      });
      observer.current.observe(content);

      content.addEventListener("scroll", handleScroll);

      return () => {
        content.removeEventListener("scroll", handleScroll);
      };
    }
  }, [
    reviewTimelineRef,
    summaryTimelineRef,
    setVisibleSectionStyles,
    reviewTimelineDuration,
    segmentDuration,
  ]);

  const scrollTopForPosition = useCallback(
    (clientY: number) => {
      const timeline = reviewTimelineRef.current;
      const summary = summaryTimelineRef.current;

      if (!timeline || !summary) {
        return 0;
      }

      const rect = summary.getBoundingClientRect();
      const ratio = (clientY - rect.top) / rect.height;
      return ratio * timeline.scrollHeight - timeline.clientHeight / 2;
    },
    [reviewTimelineRef],
  );

  const scrollTimelineTo = useCallback(
    (top: number, behavior: ScrollBehavior = "auto") => {
      const timeline = reviewTimelineRef.current;

      if (timeline) {
        const maxScrollTop = timeline.scrollHeight - timeline.clientHeight;
        timeline.scrollTo({
          top: Math.min(Math.max(top, 0), maxScrollTop),
          behavior,
        });
      }
    },
    [reviewTimelineRef],
  );

  // A press outside the box jumps there on release, or snaps the box under
  // the pointer once it moves and then drags it.

  const handlePointerDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (
        e.button != 0 ||
        !reviewTimelineRef.current ||
        !visibleSectionRef.current
      ) {
        return;
      }

      e.preventDefault();
      e.stopPropagation();
      e.currentTarget.setPointerCapture(e.pointerId);

      const box = visibleSectionRef.current.getBoundingClientRect();
      dragRef.current = {
        startY: e.clientY,
        startScrollTop: reviewTimelineRef.current.scrollTop,
        insideBox: e.clientY >= box.top && e.clientY <= box.bottom,
        moved: false,
      };
    },
    [reviewTimelineRef],
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      const drag = dragRef.current;
      const timeline = reviewTimelineRef.current;
      const summary = summaryTimelineRef.current;

      if (!drag || !timeline || !summary) {
        return;
      }

      const deltaY = e.clientY - drag.startY;

      if (!drag.moved) {
        if (Math.abs(deltaY) < DRAG_THRESHOLD) {
          return;
        }

        drag.moved = true;
        setIsDragging(true);

        if (!drag.insideBox) {
          drag.startScrollTop = scrollTopForPosition(drag.startY);
        }
      }

      scrollTimelineTo(
        drag.startScrollTop +
          deltaY * (timeline.scrollHeight / summary.clientHeight),
      );
    },
    [reviewTimelineRef, scrollTopForPosition, scrollTimelineTo],
  );

  const handlePointerUp = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      const drag = dragRef.current;
      dragRef.current = null;
      setIsDragging(false);

      if (drag && !drag.moved && !drag.insideBox) {
        scrollTimelineTo(scrollTopForPosition(e.clientY), "smooth");
      }
    },
    [scrollTopForPosition, scrollTimelineTo],
  );

  const handlePointerCancel = useCallback(() => {
    dragRef.current = null;
    setIsDragging(false);
  }, []);

  return (
    <div
      className={cn(
        "no-scrollbar relative h-full touch-none select-none overflow-hidden border-l-[1px] border-neutral-700 bg-secondary",
        isDragging ? "cursor-grabbing" : "cursor-pointer",
      )}
      role="scrollbar"
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerCancel}
    >
      {motionData && (
        <canvas
          ref={motionCanvasRef}
          className="pointer-events-none absolute inset-0 size-full"
        />
      )}
      <div
        ref={summaryTimelineRef}
        className="relative z-10 flex h-full flex-col-reverse"
      >
        {consolidatedSegments.map((segment, index) => (
          <SummarySegment
            key={`${segment.startTime}-${segment.endTime}+${index}`}
            segmentData={segment}
            totalDuration={timelineStart - timelineEnd}
          />
        ))}
      </div>
      <div
        ref={visibleSectionRef}
        className={cn(
          "absolute z-20 w-full border-y border-primary/60 bg-primary/30 shadow-[0_0_0_1px_hsl(var(--background))]",
          !isDragging && "cursor-grab",
        )}
      ></div>
    </div>
  );
}

export default SummaryTimeline;
