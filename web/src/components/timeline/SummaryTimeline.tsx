import {
  RefObject,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { SummarySegment } from "./SummarySegment";
import { useTimelineUtils } from "@/hooks/use-timeline-utils";
import { ReviewSegment, ReviewSeverity } from "@/types/review";

export type SummaryTimelineProps = {
  reviewTimelineRef: RefObject<HTMLDivElement>;
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
  const [segmentHeight, setSegmentHeight] = useState(0);

  const [isDragging, setIsDragging] = useState(false);
  const [scrollStartPosition, setScrollStartPosition] = useState<number>(0);
  const [initialReviewTimelineScrollTop, setInitialReviewTimelineScrollTop] =
    useState<number>(0);

  const observer = useRef<ResizeObserver | null>(null);

  const reviewTimelineDuration = useMemo(
    () => timelineStart - timelineEnd + 4 * segmentDuration,
    [timelineEnd, timelineStart, segmentDuration],
  );

  const { alignStartDateToTimeline } = useTimelineUtils({
    segmentDuration,
    timelineDuration: reviewTimelineDuration,
    timelineRef: reviewTimelineRef,
  });

  const timelineStartAligned = useMemo(
    () => alignStartDateToTimeline(timelineStart) + 2 * segmentDuration,
    [timelineStart, alignStartDateToTimeline, segmentDuration],
  );

  // Generate segments for the timeline
  const generateSegments = useCallback(() => {
    const segmentCount = Math.ceil(reviewTimelineDuration / segmentDuration);

    if (segmentHeight) {
      return Array.from({ length: segmentCount }, (_, index) => {
        const segmentTime = timelineStartAligned - index * segmentDuration;

        return (
          <SummarySegment
            key={segmentTime}
            events={events}
            segmentDuration={segmentDuration}
            segmentTime={segmentTime}
            segmentHeight={segmentHeight}
            severityType={severityType}
          />
        );
      });
    }
  }, [
    segmentDuration,
    timelineStartAligned,
    events,
    reviewTimelineDuration,
    segmentHeight,
    severityType,
  ]);

  const segments = useMemo(
    () => generateSegments(),
    // we know that these deps are correct
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [
      segmentDuration,
      segmentHeight,
      timelineStartAligned,
      events,
      reviewTimelineDuration,
      segmentHeight,
      generateSegments,
      severityType,
    ],
  );

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
        if (summaryTimelineRef.current) {
          const { clientHeight: summaryTimelineVisibleHeight } =
            summaryTimelineRef.current;

          setSegmentHeight(
            summaryTimelineVisibleHeight /
              (reviewTimelineDuration / segmentDuration),
          );
        }
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

  useEffect(() => {
    if (summaryTimelineRef.current) {
      const { clientHeight: summaryTimelineVisibleHeight } =
        summaryTimelineRef.current;

      setSegmentHeight(
        summaryTimelineVisibleHeight /
          (reviewTimelineDuration / segmentDuration),
      );
    }
  }, [reviewTimelineDuration, summaryTimelineRef, segmentDuration]);

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
      className={`relative h-full overflow-hidden no-scrollbar select-none bg-secondary border-l-[1px] border-neutral-700`}
      role="scrollbar"
    >
      <div
        ref={summaryTimelineRef}
        className="h-full flex flex-col relative z-10"
        onClick={timelineClick}
        onTouchEnd={timelineClick}
      >
        {segments}
      </div>
      <div
        ref={visibleSectionRef}
        onMouseDown={handleMouseDown}
        onTouchStart={handleMouseDown}
        className={`bg-primary/30 z-20 absolute w-full touch-none ${
          isDragging ? "cursor-grabbing" : "cursor-grab"
        }`}
      ></div>
    </div>
  );
}

export default SummaryTimeline;
