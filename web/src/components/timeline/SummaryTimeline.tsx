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
  ReviewSegment,
  ReviewSeverity,
} from "@/types/review";
import { useTimelineUtils } from "@/hooks/use-timeline-utils";

export type SummaryTimelineProps = {
  reviewTimelineRef: React.RefObject<HTMLDivElement>;
  timelineStart: number;
  timelineEnd: number;
  segmentDuration: number;
  events: ReviewSegment[];
  severityType: ReviewSeverity;
};

export function SummaryTimeline({
  reviewTimelineRef,
  timelineStart,
  timelineEnd,
  segmentDuration,
  events,
  severityType,
}: SummaryTimelineProps) {
  const summaryTimelineRef = useRef<HTMLDivElement>(null);
  const visibleSectionRef = useRef<HTMLDivElement>(null);

  const [isDragging, setIsDragging] = useState(false);
  const [scrollStartPosition, setScrollStartPosition] = useState<number>(0);
  const [initialReviewTimelineScrollTop, setInitialReviewTimelineScrollTop] =
    useState<number>(0);

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

      visibleSectionRef.current.style.top = `${
        summaryTimelineVisibleHeight * (scrolled / reviewTimelineFullHeight)
      }px`;
      visibleSectionRef.current.style.height = `${
        reviewTimelineVisibleHeight *
        (reviewTimelineVisibleHeight / reviewTimelineFullHeight)
      }px`;
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

  const timelineClick = useCallback(
    (
      e: React.MouseEvent<HTMLDivElement> | React.TouchEvent<HTMLDivElement>,
    ) => {
      // prevent default only for mouse events
      // to avoid chrome/android issues
      if (e.nativeEvent instanceof MouseEvent) {
        e.preventDefault();
      }
      e.stopPropagation();

      let clientY;
      if ("TouchEvent" in window && e.nativeEvent instanceof TouchEvent) {
        clientY = e.nativeEvent.touches[0].clientY;
      } else if (e.nativeEvent instanceof MouseEvent) {
        clientY = e.nativeEvent.clientY;
      }
      if (
        clientY &&
        reviewTimelineRef.current &&
        summaryTimelineRef.current &&
        visibleSectionRef.current
      ) {
        const { clientHeight: summaryTimelineVisibleHeight } =
          summaryTimelineRef.current;

        const rect = summaryTimelineRef.current.getBoundingClientRect();
        const summaryTimelineTop = rect.top;

        const { scrollHeight: reviewTimelineHeight } =
          reviewTimelineRef.current;

        const { clientHeight: visibleSectionHeight } =
          visibleSectionRef.current;

        const visibleSectionOffset = -(visibleSectionHeight / 2);

        const clickPercentage =
          (clientY - summaryTimelineTop + visibleSectionOffset) /
          summaryTimelineVisibleHeight;

        reviewTimelineRef.current.scrollTo({
          top: Math.floor(reviewTimelineHeight * clickPercentage),
          behavior: "smooth",
        });
      }
    },
    [reviewTimelineRef, summaryTimelineRef, visibleSectionRef],
  );

  const handleMouseDown = useCallback(
    (
      e: React.MouseEvent<HTMLDivElement> | React.TouchEvent<HTMLDivElement>,
    ) => {
      // prevent default only for mouse events
      // to avoid chrome/android issues
      if (e.nativeEvent instanceof MouseEvent) {
        e.preventDefault();
      }
      e.stopPropagation();
      setIsDragging(true);

      let clientY;
      if ("TouchEvent" in window && e.nativeEvent instanceof TouchEvent) {
        clientY = e.nativeEvent.touches[0].clientY;
      } else if (e.nativeEvent instanceof MouseEvent) {
        clientY = e.nativeEvent.clientY;
      }
      if (clientY && summaryTimelineRef.current && reviewTimelineRef.current) {
        setScrollStartPosition(clientY);
        setInitialReviewTimelineScrollTop(reviewTimelineRef.current.scrollTop);
      }
    },
    [setIsDragging, summaryTimelineRef, reviewTimelineRef],
  );

  const handleMouseUp = useCallback(
    (e: MouseEvent | TouchEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (isDragging) {
        setIsDragging(false);
      }
    },
    [isDragging, setIsDragging],
  );

  const handleMouseMove = useCallback(
    (e: MouseEvent | TouchEvent) => {
      if (
        summaryTimelineRef.current &&
        reviewTimelineRef.current &&
        visibleSectionRef.current
      ) {
        // prevent default only for mouse events
        // to avoid chrome/android issues
        if (e instanceof MouseEvent) {
          e.preventDefault();
        }
        e.stopPropagation();
        let clientY;
        if ("TouchEvent" in window && e instanceof TouchEvent) {
          clientY = e.touches[0].clientY;
        } else if (e instanceof MouseEvent) {
          clientY = e.clientY;
        }
        if (isDragging && clientY) {
          const { clientHeight: summaryTimelineVisibleHeight } =
            summaryTimelineRef.current;

          const {
            scrollHeight: reviewTimelineHeight,
            clientHeight: reviewTimelineVisibleHeight,
          } = reviewTimelineRef.current;

          const { clientHeight: visibleSectionHeight } =
            visibleSectionRef.current;

          const deltaY =
            (clientY - scrollStartPosition) *
            (summaryTimelineVisibleHeight / visibleSectionHeight);

          const newScrollTop = Math.min(
            initialReviewTimelineScrollTop + deltaY,
            reviewTimelineHeight - reviewTimelineVisibleHeight,
          );

          reviewTimelineRef.current.scrollTop = newScrollTop;
        }
      }
    },
    [
      initialReviewTimelineScrollTop,
      isDragging,
      reviewTimelineRef,
      scrollStartPosition,
    ],
  );

  const documentRef = useRef<Document | null>(document);
  useEffect(() => {
    const documentInstance = documentRef.current;

    if (isDragging) {
      documentInstance?.addEventListener("mousemove", handleMouseMove);
      documentInstance?.addEventListener("touchmove", handleMouseMove);
      documentInstance?.addEventListener("mouseup", handleMouseUp);
      documentInstance?.addEventListener("touchend", handleMouseUp);
    } else {
      documentInstance?.removeEventListener("mousemove", handleMouseMove);
      documentInstance?.removeEventListener("touchmove", handleMouseMove);
      documentInstance?.removeEventListener("mouseup", handleMouseUp);
      documentInstance?.removeEventListener("touchend", handleMouseUp);
    }
    return () => {
      documentInstance?.removeEventListener("mousemove", handleMouseMove);
      documentInstance?.removeEventListener("touchmove", handleMouseMove);
      documentInstance?.removeEventListener("mouseup", handleMouseUp);
      documentInstance?.removeEventListener("touchend", handleMouseUp);
    };
  }, [handleMouseMove, handleMouseUp, isDragging]);

  return (
    <div
      className={`no-scrollbar relative h-full select-none overflow-hidden border-l-[1px] border-neutral-700 bg-secondary`}
      role="scrollbar"
    >
      <div
        ref={summaryTimelineRef}
        className="relative z-10 flex h-full flex-col-reverse"
        onClick={timelineClick}
        onTouchEnd={timelineClick}
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
        onMouseDown={handleMouseDown}
        onTouchStart={handleMouseDown}
        className={`absolute z-20 w-full touch-none bg-primary/30 ${
          isDragging ? "cursor-grabbing" : "cursor-grab"
        }`}
      ></div>
    </div>
  );
}

export default SummaryTimeline;
